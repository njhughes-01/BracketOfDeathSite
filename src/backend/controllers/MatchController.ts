import { Request, Response } from "express";
import logger from "../utils/logger";
import { Tournament } from "../models/Tournament";
import { Match } from "../models/Match";
import { TournamentResult } from "../models/TournamentResult";
import { IMatch, isRoundRobinRound, getRoundNumber } from "../types/match";
import { ITournament } from "../types/tournament";
import { BaseController, RequestWithAuth } from "./base";
import { LiveStatsService } from "../services/LiveStatsService";
import { eventBus } from "../services/EventBus";

/**
 * MatchController handles all match-related operations:
 * - getTournamentMatches, updateMatch, generateMatches
 * - checkInTeam, confirmCompletedMatches
 * - Match creation helpers for round-robin and bracket
 */
export class MatchController extends BaseController {
  constructor() {
    super();
  }

  // Get matches for a tournament (optionally filtered by round)
  getTournamentMatches = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const { round } = req.query;

      const filter: any = { tournamentId: id };
      if (round && typeof round === "string") {
        filter.round = round;
      }

      const matches = await Match.find(filter)
        .populate("team1.players team2.players", "name")
        .sort({ roundNumber: 1, matchNumber: 1 });

      this.sendSuccess(res, matches);
    },
  );

  // Update match scores and status
  updateMatch = this.asyncHandler(
    async (req: RequestWithAuth, res: Response): Promise<void> => {
      const { matchId } = req.params;
      const updateData = req.body;

      // Process individual player scores and calculate derived team scores
      const processedUpdateData = this.processMatchUpdate(updateData);

      // Load the match doc to leverage full document validation and pre-save logic
      const matchDoc = await Match.findById(matchId).populate(
        "team1.players team2.players",
        "name",
      );
      if (!matchDoc) {
        this.sendNotFound(res, "Match");
        return;
      }

      // Apply fields safely to the document
      if (processedUpdateData["team1.playerScores"] !== undefined) {
        (matchDoc as any).team1.playerScores =
          processedUpdateData["team1.playerScores"];
        matchDoc.markModified("team1.playerScores");
      }
      if (processedUpdateData["team2.playerScores"] !== undefined) {
        (matchDoc as any).team2.playerScores =
          processedUpdateData["team2.playerScores"];
        matchDoc.markModified("team2.playerScores");
      }
      if (processedUpdateData["team1.score"] !== undefined) {
        (matchDoc as any).team1.score = processedUpdateData["team1.score"];
      }
      if (processedUpdateData["team2.score"] !== undefined) {
        (matchDoc as any).team2.score = processedUpdateData["team2.score"];
      }
      if (processedUpdateData.court !== undefined) {
        (matchDoc as any).court = processedUpdateData.court;
      }
      if (processedUpdateData.notes !== undefined) {
        (matchDoc as any).notes = processedUpdateData.notes;
      }
      // Map client times to model fields
      if ((processedUpdateData as any).startTime) {
        (matchDoc as any).scheduledDate = new Date(
          (processedUpdateData as any).startTime,
        );
      }
      if ((processedUpdateData as any).endTime) {
        (matchDoc as any).completedDate = new Date(
          (processedUpdateData as any).endTime,
        );
      }
      // Determine winner/status before validation to satisfy validators
      const t1Score = (matchDoc as any).team1?.score;
      const t2Score = (matchDoc as any).team2?.score;
      const bothScored =
        typeof t1Score === "number" && typeof t2Score === "number";

      if (processedUpdateData.status) {
        (matchDoc as any).status = processedUpdateData.status;
        if (
          processedUpdateData.status === "completed" &&
          bothScored &&
          t1Score !== t2Score
        ) {
          (matchDoc as any).winner = t1Score > t2Score ? "team1" : "team2";
        }
      } else if (bothScored && t1Score !== t2Score) {
        (matchDoc as any).winner = t1Score > t2Score ? "team1" : "team2";
        (matchDoc as any).status = "completed";
      }

      const match = await matchDoc.save();

      // If match is completed, update tournament statistics
      if (match.status === "completed") {
        await this.updateTournamentStatistics(match as any);
        // Trigger live stats update for real-time updates
        await LiveStatsService.updateLiveStats(matchId);
      }

      // Emit match update and full live snapshot for clients
      eventBus.emitTournament(match.tournamentId.toString(), "match:update", {
        matchId,
        update: processedUpdateData,
      });
      try {
        const live = await this.buildLiveTournamentSnapshot(
          match.tournamentId.toString(),
        );
        if (live)
          eventBus.emitTournament(match.tournamentId.toString(), "snapshot", {
            live,
          });
      } catch { }

      this.sendSuccess(res, match, "Match updated successfully");
    },
  );

  // Team check-in for tournaments
  checkInTeam = this.asyncHandler(
    async (req: RequestWithAuth, res: Response): Promise<void> => {
      const { id } = req.params;
      const { teamId, present = true } = req.body;

      // This would typically update a check-in collection or tournament field
      // For now, we'll return success - would need to implement proper check-in storage

      eventBus.emitTournament(id, "team:checkin", { teamId, present });
      try {
        const live = await this.buildLiveTournamentSnapshot(id);
        if (live) eventBus.emitTournament(id, "snapshot", { live });
      } catch { }

      this.sendSuccess(
        res,
        { teamId, present, checkInTime: new Date().toISOString() },
        `Team ${present ? "checked in" : "marked absent"} successfully`,
      );
    },
  );

  // Generate matches for a specific round
  generateMatches = this.asyncHandler(
    async (req: RequestWithAuth, res: Response): Promise<void> => {
      const { id } = req.params;
      const { round } = req.body;

      const tournament = await Tournament.findById(id);
      if (!tournament) {
        this.sendNotFound(res, "Tournament");
        return;
      }

      let matches: IMatch[] = [] as any;

      // Handle losers and grand-final rounds explicitly for double elimination
      const isLosers = typeof round === "string" && round.startsWith("lbr-");
      const isGrandFinal = round === "grand-final";
      if (
        (tournament as any).bracketType === "double_elimination" &&
        (isLosers || isGrandFinal)
      ) {
        if (round === "lbr-round-1") {
          const qfLosers = await this.getBracketLosingTeams(
            tournament,
            "quarterfinal",
          );
          matches = await this.generateLosersMatchesForRound(
            tournament,
            qfLosers,
            "lbr-round-1",
          );
        } else if (round === "lbr-semifinal") {
          const sfLosers = await this.getBracketLosingTeams(
            tournament,
            "semifinal",
          );
          const l1Winners = await this.getBracketAdvancingTeams(
            tournament as any,
            "lbr-round-1" as any,
          );
          const lsfTeams = [...sfLosers, ...l1Winners];
          matches = await this.generateLosersMatchesForRound(
            tournament,
            lsfTeams,
            "lbr-semifinal",
          );
        } else if (round === "lbr-final") {
          const lsfWinners = await this.getBracketAdvancingTeams(
            tournament as any,
            "lbr-semifinal" as any,
          );
          matches = await this.generateLosersMatchesForRound(
            tournament,
            lsfWinners,
            "lbr-final",
          );
        } else if (isGrandFinal) {
          const wfWinner = await this.getBracketAdvancingTeams(
            tournament,
            "final",
          );
          const lfWinner = await this.getBracketAdvancingTeams(
            tournament as any,
            "lbr-final" as any,
          );
          const gfTeams = [...wfWinner, ...lfWinner];
          matches = await this.generateLosersMatchesForRound(
            tournament,
            gfTeams,
            "grand-final",
          );
        }
      } else {
        matches = await this.createMatchesForRound(tournament, round);
      }

      eventBus.emitTournament(id, "matches:generated", {
        round,
        count: matches.length,
      });
      try {
        const live = await this.buildLiveTournamentSnapshot(id);
        if (live) eventBus.emitTournament(id, "snapshot", { live });
      } catch { }

      this.sendSuccess(res, matches, `Matches generated for ${round}`);
    },
  );

  // Confirm all completed matches in a tournament (optionally by round)
  confirmCompletedMatches = this.asyncHandler(
    async (req: RequestWithAuth, res: Response): Promise<void> => {
      const { id } = req.params;
      const { round } = req.query as { round?: string };

      const filter: any = { tournamentId: id, status: "completed" };
      if (round) filter.round = round;

      const matches = await Match.find(filter);
      if (matches.length === 0) {
        this.sendSuccess(res, { updated: 0 }, "No completed matches to confirm");
        return;
      }

      const ids = matches.map((m) => m._id);
      await Match.updateMany(
        { _id: { $in: ids } },
        { $set: { status: "confirmed" } },
      );

      // Emit per-match updates and a snapshot
      for (const m of matches) {
        eventBus.emitTournament(
          m.tournamentId.toString(),
          "match:confirmed",
          { matchId: m._id.toString() },
        );
      }
      const live = await this.buildLiveTournamentSnapshot(id);
      if (live) eventBus.emitTournament(id, "snapshot", { live });

      this.sendSuccess(
        res,
        { updated: matches.length },
        "Completed matches confirmed",
      );
    },
  );

  // ==================== Match Creation Methods ====================

  // Create matches for a specific round (used by LiveTournamentController as well)
  async createMatchesForRound(
    tournament: ITournament,
    round: string,
  ): Promise<IMatch[]> {
    try {
      // Clear any existing matches for this round to avoid duplicates
      await Match.deleteMany({
        tournamentId: tournament._id,
        round: round as any,
      });

      // Get the highest existing matchNumber for this tournament to avoid conflicts
      const highestMatch = await Match.findOne({ tournamentId: tournament._id })
        .sort({ matchNumber: -1 })
        .select("matchNumber")
        .lean();
      const startingMatchNumber = highestMatch
        ? highestMatch.matchNumber + 1
        : 1;

      // Get teams from tournament setup data, or synthesize from selected players if missing
      logger.debug("DEBUG: Entering Match/Teams check");
      let teams = tournament.generatedTeams || [];
      logger.debug("DEBUG: Teams count:", teams.length);
      if (!teams || teams.length === 0) {
        // Build lightweight teams from selected players + generatedSeeds metadata
        const seedMap: Record<
          string,
          { playerId: any; playerName: string; seed?: number }
        > = {};
        const seeds = (tournament as any).generatedSeeds || [];
        for (const s of seeds) {
          const pid = (s.playerId || s._id || s.id || "").toString();
          if (pid)
            seedMap[pid] = {
              playerId: s.playerId || s._id || s.id,
              playerName: s.playerName || s.name || `Player ${pid}`,
              seed: s.seed,
            };
        }

        // Normalize and dedupe player IDs while preserving order
        const raw = Array.isArray((tournament as any).players)
          ? (tournament as any).players
          : [];
        const uniqueIds: string[] = [];
        const seen = new Set<string>();
        for (const pid of raw) {
          const key = (pid || "").toString();
          if (!key) continue;
          if (seen.has(key)) continue;
          seen.add(key);
          uniqueIds.push(key);
        }

        // Derive display meta
        const playersMeta = uniqueIds.map((id, idx) => ({
          playerId: id,
          playerName: seedMap[id]?.playerName || `Player ${idx + 1}`,
          seed: seedMap[id]?.seed || idx + 1,
        }));

        // Determine team size: 1 for singles formats, else 2
        const fmt = ((tournament as any).format || "").toString().toLowerCase();
        const isSingles = fmt.includes("singles");
        const teamSize = isSingles ? 1 : 2;

        if (playersMeta.length < teamSize) {
          throw new Error("Not enough unique players to form teams");
        }

        // Group into teams and dedupe by composition
        const synthesizedTeams: any[] = [];
        const teamSeen = new Set<string>();
        for (let i = 0; i < playersMeta.length; i += teamSize) {
          const group = playersMeta.slice(i, i + teamSize);
          if (group.length === 0) continue;
          const sig = group
            .map((g) => g.playerId.toString())
            .sort()
            .join("|");
          if (teamSeen.has(sig)) continue;
          teamSeen.add(sig);

          const teamName = group.map((g) => g.playerName).join(" & ");
          const combinedSeed = Math.ceil(
            group.reduce((sum, g) => sum + (g.seed || i + 1), 0) / group.length,
          );
          synthesizedTeams.push({
            teamId: `${(tournament as any)._id || "tourn"}-T${synthesizedTeams.length + 1}`,
            teamName,
            players: group,
            combinedSeed,
            combinedStatistics: {},
          });
        }

        teams = synthesizedTeams;
        if (teams.length === 0) {
          // Fallback: reconstruct teams from TournamentResult (for historical data)
          teams = await this.reconstructTeamsFromResults(tournament);
          if (teams.length === 0) {
            throw new Error("No teams found in tournament setup data or results");
          }
          // Persist reconstructed teams to tournament for future use
          (tournament.generatedTeams as any) = teams;
          await tournament.save();
          logger.debug(`Reconstructed ${teams.length} teams from TournamentResult`);
        }
      }

      let matches: any[] = [];

      // Determine round type and generate appropriate matches
      if (isRoundRobinRound(round)) {
        matches = await this.generateRoundRobinMatches(
          tournament,
          teams,
          round,
          startingMatchNumber,
        );
      } else {
        // Bracket matches (quarterfinal, semifinal, final)
        matches = await this.generateBracketMatches(
          tournament,
          teams,
          round,
          startingMatchNumber,
        );
      }

      // Create matches in database
      logger.error(
        `DEBUG: About to insert ${matches.length} matches for ${round}`,
      );
      const createdMatches = await Match.insertMany(matches);
      logger.debug(`Created ${createdMatches.length} matches for ${round}`);

      return createdMatches as IMatch[];
    } catch (error) {
      logger.error(`Error creating matches for round ${round}:`, error);
      throw error;
    }
  }

  // Generate round-robin matches where every team plays every other team
  async generateRoundRobinMatches(
    tournament: any,
    teams: any[],
    round: string,
    startMatchNumber: number,
  ): Promise<any[]> {
    const matches = [];
    let matchNumber = startMatchNumber;

    logger.debug("Team structure sample:", JSON.stringify(teams[0], null, 2));

    // Generate all possible team pairings (combinatorial)
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const team1 = teams[i];
        const team2 = teams[j];

        // Ensure player names are populated properly
        const team1PlayerNames = team1.players.map((p: any) => {
          return (
            p.playerName || p.name || `Player ${p.playerId || p._id || p.id}`
          );
        });

        const team2PlayerNames = team2.players.map((p: any) => {
          return (
            p.playerName || p.name || `Player ${p.playerId || p._id || p.id}`
          );
        });

        const match = {
          tournamentId: tournament._id,
          matchNumber: matchNumber++,
          round: round,
          roundNumber: getRoundNumber(round as any),
          team1: {
            players: team1.players.map((p: any) => p.playerId || p._id || p.id),
            playerNames: team1PlayerNames,
            score: 0,
            seed: team1.combinedSeed,
          },
          team2: {
            players: team2.players.map((p: any) => p.playerId || p._id || p.id),
            playerNames: team2PlayerNames,
            score: 0,
            seed: team2.combinedSeed,
          },
          status: "scheduled",
          scheduledDate: new Date(),
        };

        logger.debug(
          `Match ${matchNumber - 1}: ${team1PlayerNames.join(" & ")} vs ${team2PlayerNames.join(" & ")}`,
        );
        matches.push(match);
      }
    }

    logger.debug(`Generated ${matches.length} round-robin matches`);
    return matches;
  }

  // Generate bracket matches based on seeding and tournament progression
  async generateBracketMatches(
    tournament: any,
    teams: any[],
    round: string,
    startMatchNumber: number,
  ): Promise<any[]> {
    const matches = [];
    let matchNumber = startMatchNumber;

    // For bracket play, we need to determine which teams advance
    let bracketTeams = teams;

    // Sort teams by performance (would use actual standings in real implementation)
    bracketTeams.sort((a: any, b: any) => a.combinedSeed - b.combinedSeed);

    // Determine number of teams for this bracket round
    const roundTeamCounts: Record<string, number> = {
      quarterfinal: 8,
      semifinal: 4,
      final: 2,
      "third-place": 4, // Special case for 3rd/4th place
    };

    const requiredTeams = roundTeamCounts[round] || bracketTeams.length;
    const activeTeams = bracketTeams.slice(0, requiredTeams);

    // Generate bracket matches based on seeding
    if (round === "quarterfinal") {
      // QF: 1v8, 4v5, 3v6, 2v7
      const pairings = [
        [0, 7],
        [3, 4],
        [2, 5],
        [1, 6],
      ];

      for (const [i, j] of pairings) {
        if (activeTeams[i] && activeTeams[j]) {
          matches.push(
            this.createBracketMatch(
              tournament,
              activeTeams[i],
              activeTeams[j],
              matchNumber++,
              round,
              1,
            ),
          );
        }
      }
    } else if (round === "semifinal") {
      // SF: Winners from QF
      for (let i = 0; i < activeTeams.length; i += 2) {
        if (activeTeams[i] && activeTeams[i + 1]) {
          matches.push(
            this.createBracketMatch(
              tournament,
              activeTeams[i],
              activeTeams[i + 1],
              matchNumber++,
              round,
              2,
            ),
          );
        }
      }
    } else if (round === "final") {
      // Final: Winners from SF
      if (activeTeams.length >= 2) {
        matches.push(
          this.createBracketMatch(
            tournament,
            activeTeams[0],
            activeTeams[1],
            matchNumber++,
            round,
            3,
          ),
        );
      }
    }

    logger.debug(`Generated ${matches.length} ${round} matches`);
    return matches;
  }

  // Helper method to create a single bracket match
  createBracketMatch(
    tournament: any,
    team1: any,
    team2: any,
    matchNumber: number,
    round: string,
    roundNumber: number,
  ): any {
    return {
      tournamentId: tournament._id,
      matchNumber,
      round,
      roundNumber,
      team1: {
        players: team1.players.map((p: any) => p.playerId),
        playerNames: team1.players.map((p: any) => p.playerName),
        score: 0,
        seed: team1.combinedSeed,
      },
      team2: {
        players: team2.players.map((p: any) => p.playerId),
        playerNames: team2.players.map((p: any) => p.playerName),
        score: 0,
        seed: team2.combinedSeed,
      },
      status: "scheduled",
      scheduledDate: new Date(),
    };
  }

  // Generate bracket matches for specific round with advancing teams
  async generateBracketMatchesForRound(
    tournament: ITournament,
    teams: any[],
    round: string,
  ): Promise<void> {
    const highestMatch = await Match.findOne({ tournamentId: tournament._id })
      .sort({ matchNumber: -1 })
      .select("matchNumber")
      .lean();
    const startMatchNumber = highestMatch ? highestMatch.matchNumber + 1 : 1;

    const matches = await this.generateBracketMatches(
      tournament,
      teams,
      round,
      startMatchNumber,
    );
    await Match.insertMany(matches);
    logger.debug(`Generated ${matches.length} matches for ${round}`);
  }

  // Get teams advancing from current bracket round
  async getBracketAdvancingTeams(
    tournament: ITournament,
    currentRound?: string,
  ): Promise<any[]> {
    if (!currentRound) return [];

    const matches = await Match.find({
      tournamentId: tournament._id,
      round: currentRound,
      status: "completed",
    });

    const advancingTeams: any[] = [];

    matches.forEach((match) => {
      if (match.winner) {
        const winningTeam =
          match.winner === "team1" ? match.team1 : match.team2;
        advancingTeams.push({
          teamId: `${winningTeam.playerNames.join("_")}`,
          teamName: winningTeam.playerNames.join(" & "),
          players: winningTeam.players.map((playerId, index) => ({
            playerId,
            playerName: winningTeam.playerNames[index] || "Unknown",
            seed: winningTeam.seed,
          })),
          combinedSeed: winningTeam.seed || 0,
        });
      }
    });

    logger.debug(
      `${advancingTeams.length} teams advancing from ${currentRound}`,
    );
    return advancingTeams;
  }

  // Double-elimination helpers
  async getBracketLosingTeams(
    tournament: ITournament,
    round: string,
  ): Promise<any[]> {
    const matches = await Match.find({
      tournamentId: tournament._id,
      round,
      status: "completed",
    });
    const losers: any[] = [];
    matches.forEach((match) => {
      if (!match.winner) return;
      const losingTeam = match.winner === "team1" ? match.team2 : match.team1;
      losers.push({
        teamId: `${losingTeam.playerNames.join("_")}`,
        teamName: losingTeam.playerNames.join(" & "),
        players: losingTeam.players.map((playerId, index) => ({
          playerId,
          playerName: losingTeam.playerNames[index] || "Unknown",
          seed: losingTeam.seed,
        })),
        combinedSeed: losingTeam.seed || 0,
      });
    });
    return losers;
  }

  async generateLosersMatchesForRound(
    tournament: ITournament,
    teams: any[],
    round: string,
  ): Promise<IMatch[]> {
    if (!teams || teams.length < 2) return [] as any;

    // Get the highest existing matchNumber for this tournament to avoid conflicts
    const highestMatch = await Match.findOne({ tournamentId: tournament._id })
      .sort({ matchNumber: -1 })
      .select("matchNumber")
      .lean();
    let matchNumber = highestMatch ? highestMatch.matchNumber + 1 : 1;

    // Pair sequentially: [0,1],[2,3],...
    const matches: any[] = [];
    for (let i = 0; i < teams.length; i += 2) {
      if (!teams[i + 1]) break;
      matches.push({
        tournamentId: tournament._id,
        matchNumber: matchNumber++,
        round,
        roundNumber: getRoundNumber(round as any),
        team1: {
          players: teams[i].players.map((p: any) => p.playerId),
          playerNames: teams[i].players.map((p: any) => p.playerName),
          score: 0,
          seed: teams[i].combinedSeed,
        },
        team2: {
          players: teams[i + 1].players.map((p: any) => p.playerId),
          playerNames: teams[i + 1].players.map((p: any) => p.playerName),
          score: 0,
          seed: teams[i + 1].combinedSeed,
        },
        status: "scheduled",
        scheduledDate: new Date(),
      });
    }
    if (matches.length === 0) return [] as any;
    const created = await Match.insertMany(matches);
    logger.debug(`Generated ${created.length} matches for ${round}`);
    return created as any;
  }

  // ==================== Statistics Update Methods ====================

  private async updateTournamentStatistics(match: IMatch): Promise<void> {
    try {
      logger.debug(
        `Updating tournament statistics for match ${match.matchNumber}`,
      );

      // Get tournament to access setup data
      const tournament = await Tournament.findById(match.tournamentId);
      if (!tournament) {
        logger.error("Tournament not found for statistics update");
        return;
      }

      // Determine winner and loser
      if (
        !match.winner ||
        match.team1.score === undefined ||
        match.team2.score === undefined
      ) {
        logger.debug(
          "Match does not have winner or scores, skipping statistics update",
        );
        return;
      }

      const winningTeam = match.winner === "team1" ? match.team1 : match.team2;
      const losingTeam = match.winner === "team1" ? match.team2 : match.team1;

      // Update or create tournament result records for both teams
      await this.updateTeamTournamentResult(
        tournament,
        winningTeam,
        match,
        true,
      );
      await this.updateTeamTournamentResult(
        tournament,
        losingTeam,
        match,
        false,
      );

      // If this is a bracket match, update bracket progression
      if (["quarterfinal", "semifinal", "final"].includes(match.round)) {
        await this.updateBracketProgression(tournament, match);
      }

      logger.debug(
        `Statistics updated successfully for match ${match.matchNumber}`,
      );
    } catch (error) {
      logger.error("Error updating tournament statistics:", error);
    }
  }

  // Update or create tournament result record for a team
  private async updateTeamTournamentResult(
    tournament: any,
    team: any,
    match: IMatch,
    won: boolean,
  ): Promise<void> {
    try {
      // Find existing tournament result or create new one
      let result = await TournamentResult.findOne({
        tournamentId: tournament._id,
        $or: [
          { players: { $in: team.players } },
          { teamName: team.playerNames.join(" & ") },
        ],
      });

      if (!result) {
        // Create new tournament result
        result = new TournamentResult({
          tournamentId: tournament._id,
          players: team.players,
          teamName: team.playerNames.join(" & "),
          seed: team.seed || 0,
          division: tournament.format,
          roundRobinScores: {
            round1: 0,
            round2: 0,
            round3: 0,
            rrWon: 0,
            rrLost: 0,
            rrPlayed: 0,
            rrWinPercentage: 0,
          },
          bracketScores: {
            r16Won: 0,
            r16Lost: 0,
            qfWon: 0,
            qfLost: 0,
            sfWon: 0,
            sfLost: 0,
            finalsWon: 0,
            finalsLost: 0,
            bracketWon: 0,
            bracketLost: 0,
            bracketPlayed: 0,
          },
          totalStats: {
            totalWon: 0,
            totalLost: 0,
            totalPlayed: 0,
            winPercentage: 0,
          },
        });
      }

      // Initialize missing subdocuments for legacy records
      if (!result.roundRobinScores) {
        (result as any).roundRobinScores = {
          round1: 0,
          round2: 0,
          round3: 0,
          rrWon: 0,
          rrLost: 0,
          rrPlayed: 0,
          rrWinPercentage: 0,
        };
      }
      if (!result.bracketScores) {
        (result as any).bracketScores = {
          r16Won: 0,
          r16Lost: 0,
          qfWon: 0,
          qfLost: 0,
          sfWon: 0,
          sfLost: 0,
          finalsWon: 0,
          finalsLost: 0,
          bracketWon: 0,
          bracketLost: 0,
          bracketPlayed: 0,
        };
      }
      if (!result.totalStats) {
        (result as any).totalStats = {
          totalWon: 0,
          totalLost: 0,
          totalPlayed: 0,
          winPercentage: 0,
        };
      }
      // Clean up invalid legacy values
      if (
        (result as any).totalStats &&
        (result as any).totalStats.bodFinish === 0
      ) {
        delete (result as any).totalStats.bodFinish;
      }

      // Update scores based on match round
      if (isRoundRobinRound(match.round)) {
        result.roundRobinScores.rrPlayed += 1;
        if (won) {
          result.roundRobinScores.rrWon += 1;
        } else {
          result.roundRobinScores.rrLost += 1;
        }
        result.roundRobinScores.rrWinPercentage =
          result.roundRobinScores.rrPlayed > 0
            ? result.roundRobinScores.rrWon / result.roundRobinScores.rrPlayed
            : 0;
      } else {
        // Bracket match
        result.bracketScores.bracketPlayed += 1;
        if (won) {
          result.bracketScores.bracketWon += 1;
          // Update specific bracket round wins
          this.updateBracketRoundScore(result, match.round, "won");
        } else {
          result.bracketScores.bracketLost += 1;
          // Update specific bracket round losses
          this.updateBracketRoundScore(result, match.round, "lost");
        }
      }

      // Update total stats
      result.totalStats.totalPlayed =
        result.roundRobinScores.rrPlayed + result.bracketScores.bracketPlayed;
      result.totalStats.totalWon =
        result.roundRobinScores.rrWon + result.bracketScores.bracketWon;
      result.totalStats.totalLost =
        result.roundRobinScores.rrLost + result.bracketScores.bracketLost;
      result.totalStats.winPercentage =
        result.totalStats.totalPlayed > 0
          ? result.totalStats.totalWon / result.totalStats.totalPlayed
          : 0;

      await result.save();
      // Get team name from populated players or construct from IDs
      const teamName = result.populated("players")
        ? (result.players as any[])
          .map((p: any) => p.name || p.toString())
          .join(" & ")
        : result.players.map((p: any) => p.toString()).join(" & ");
      logger.debug(`Updated tournament result for team: ${teamName}`);
    } catch (error) {
      logger.error("Error updating team tournament result:", error);
    }
  }

  // Helper to update specific bracket round scores
  private updateBracketRoundScore(
    result: any,
    round: string,
    outcome: "won" | "lost",
  ): void {
    const roundMapping: Record<string, string> = {
      "round-of-16": "r16",
      quarterfinal: "qf",
      semifinal: "sf",
      final: "finals",
    };

    const roundPrefix = roundMapping[round];
    if (roundPrefix) {
      const field = `${roundPrefix}${outcome === "won" ? "Won" : "Lost"}`;
      if (result.bracketScores[field] !== undefined) {
        result.bracketScores[field] += 1;
      }
    }
  }

  // Update bracket progression tracking
  private async updateBracketProgression(
    tournament: any,
    match: IMatch,
  ): Promise<void> {
    // This would update tournament's bracket progression tracking
    logger.debug(
      `Bracket progression: ${match.round} winner is team ${match.winner}`,
    );
  }

  // ==================== Helper Methods ====================

  // Process match update data to handle individual player scores
  private processMatchUpdate(updateData: any): any {
    const processedData = { ...updateData };

    // Process team 1 player scores
    if (
      updateData.team1PlayerScores &&
      Array.isArray(updateData.team1PlayerScores)
    ) {
      processedData["team1.playerScores"] = updateData.team1PlayerScores;

      // Calculate team 1 total score from individual player scores
      const team1Total = updateData.team1PlayerScores.reduce(
        (sum: number, player: any) => {
          return sum + (player.score || 0);
        },
        0,
      );
      processedData["team1.score"] = team1Total;

      // Remove the original field to avoid conflicts
      delete processedData.team1PlayerScores;
    }

    // Process team 2 player scores
    if (
      updateData.team2PlayerScores &&
      Array.isArray(updateData.team2PlayerScores)
    ) {
      processedData["team2.playerScores"] = updateData.team2PlayerScores;

      // Calculate team 2 total score from individual player scores
      const team2Total = updateData.team2PlayerScores.reduce(
        (sum: number, player: any) => {
          return sum + (player.score || 0);
        },
        0,
      );
      processedData["team2.score"] = team2Total;

      // Remove the original field to avoid conflicts
      delete processedData.team2PlayerScores;
    }

    // Handle legacy team score updates (if individual scores not provided)
    if (updateData.team1Score !== undefined) {
      processedData["team1.score"] = updateData.team1Score;
      delete processedData.team1Score;
    }

    if (updateData.team2Score !== undefined) {
      processedData["team2.score"] = updateData.team2Score;
      delete processedData.team2Score;
    }

    // Determine winner if both team scores are provided
    if (
      processedData["team1.score"] !== undefined &&
      processedData["team2.score"] !== undefined
    ) {
      const team1Score = processedData["team1.score"];
      const team2Score = processedData["team2.score"];

      if (team1Score > team2Score) {
        processedData.winner = "team1";
      } else if (team2Score > team1Score) {
        processedData.winner = "team2";
      }
      // If scores are tied, don't set winner
    }

    logger.debug(
      "Processed match update:",
      JSON.stringify(processedData, null, 2),
    );
    return processedData;
  }

  /**
   * Reconstruct generatedTeams from TournamentResult data.
   * Used for historical tournaments that have results but no match/team data.
   */
  private async reconstructTeamsFromResults(
    tournament: ITournament,
  ): Promise<any[]> {
    try {
      const results = await TournamentResult.find({ tournamentId: tournament._id })
        .populate("players", "name")
        .sort({ seed: 1, "totalStats.bodFinish": 1 });

      if (!results || results.length === 0) {
        logger.debug("No TournamentResults to reconstruct teams from");
        return [];
      }

      const teams: any[] = [];

      for (const result of results) {
        // Each result represents one team's participation
        const players = (result.players || []).map((p: any, idx: number) => ({
          playerId: p._id?.toString() || p.toString(),
          playerName: p.name || `Player ${idx + 1}`,
          seed: result.seed || idx + 1,
          statistics: result.totalStats || {},
        }));

        if (players.length === 0) continue;

        const teamName = players.map((p: any) => p.playerName).join(" & ");
        const teamId = `${tournament._id}-R${teams.length + 1}`;

        teams.push({
          teamId,
          teamName,
          players,
          combinedSeed: result.seed || teams.length + 1,
          combinedStatistics: result.totalStats || {},
        });
      }

      logger.debug(`Reconstructed ${teams.length} teams from ${results.length} results`);
      return teams;
    } catch (error) {
      logger.error("Error reconstructing teams from results:", error);
      return [];
    }
  }

  // Build a lightweight live snapshot for event emission
  private async buildLiveTournamentSnapshot(id: string): Promise<any | null> {
    const tournament = await Tournament.findById(id).populate("players", "name");
    if (!tournament) return null;

    const matches = await Match.find({ tournamentId: id })
      .populate("team1.players team2.players", "name")
      .sort({ roundNumber: 1, matchNumber: 1 });

    const standings = await TournamentResult.find({ tournamentId: id })
      .populate("players", "name")
      .sort({ "totalStats.finalRank": 1 });

    const t = tournament.toObject();
    return {
      _id: t._id.toString(),
      date: t.date,
      bodNumber: t.bodNumber,
      format: t.format,
      location: t.location,
      status: t.status,
      matches,
      currentStandings: standings,
    };
  }
}

export default new MatchController();
