import { Request, Response } from "express";
import logger from "../utils/logger";
import { Tournament } from "../models/Tournament";
import { Match } from "../models/Match";
import { TournamentResult } from "../models/TournamentResult";
import { Player } from "../models/Player";
import { ITournament } from "../types/tournament";
import {
  IMatch,
  isRoundRobinRound,
  getNextRoundRobinRound,
} from "../types/match";
import { BaseController, RequestWithAuth } from "./base";
import { eventBus } from "../services/EventBus";
import MatchController from "./MatchController";

interface TournamentPhase {
  phase:
    | "setup"
    | "registration"
    | "check_in"
    | "round_robin"
    | "bracket"
    | "completed";
  currentRound?:
    | "RR_R1"
    | "RR_R2"
    | "RR_R3"
    | "quarterfinal"
    | "semifinal"
    | "final"
    | "lbr-round-1"
    | "lbr-round-2"
    | "lbr-quarterfinal"
    | "lbr-semifinal"
    | "lbr-final"
    | "grand-final";
  roundStatus: "not_started" | "in_progress" | "completed";
  totalMatches: number;
  completedMatches: number;
  canAdvance: boolean;
}

interface LiveTournament {
  _id: string;
  date: Date;
  bodNumber: number;
  format: string;
  location: string;
  advancementCriteria: string;
  notes?: string;
  photoAlbums?: string;
  status: string;
  players?: string[];
  maxPlayers?: number;
  champion?: any;
  phase: TournamentPhase;
  teams: any[];
  matches: IMatch[];
  currentStandings: any[];
  bracketProgression: {
    quarterFinalists: string[];
    semiFinalists: string[];
    finalists: string[];
    champion?: string | undefined;
  };
  checkInStatus: {
    [teamId: string]: {
      checkedIn: boolean;
      checkInTime?: string;
      present: boolean;
    };
  };
  managementState?: {
    currentRound?: string;
  };
  bracketType?:
    | "single_elimination"
    | "double_elimination"
    | "round_robin_playoff";
}

interface TournamentAction {
  action:
    | "start_registration"
    | "close_registration"
    | "start_checkin"
    | "start_round_robin"
    | "advance_round"
    | "start_bracket"
    | "complete_tournament"
    | "reset_tournament"
    | "set_round";
  parameters?: { targetRound?: string };
}

/**
 * LiveTournamentController handles core tournament operations:
 * - getLiveTournament: Fetch complete live tournament data
 * - executeTournamentAction: Handle tournament state transitions
 */
export class LiveTournamentController extends BaseController {
  constructor() {
    super();
  }

  // Get live tournament with all live data
  getLiveTournament = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      const tournament = await Tournament.findById(id)
        .populate("players", "name")
        .lean();

      if (!tournament) {
        this.sendNotFound(res, "Tournament");
        return;
      }

      logger.debug(
        "DEBUG: Fetched tournament",
        id,
        "bracketType:",
        (tournament as any)?.bracketType,
      );

      // Get all matches for this tournament
      const matches = await Match.find({ tournamentId: id })
        .populate("team1.players team2.players", "name")
        .sort({ roundNumber: 1, matchNumber: 1 });

      // Get current tournament results/standings
      const standings = await TournamentResult.find({ tournamentId: id })
        .populate("players", "name")
        .sort({ "totalStats.finalRank": 1 });

      // Build live tournament data
      const t = tournament as any;
      const liveTournament: LiveTournament = {
        _id: t._id.toString(),
        date: t.date,
        bodNumber: t.bodNumber,
        format: t.format,
        location: t.location,
        advancementCriteria: t.advancementCriteria,
        notes: t.notes,
        photoAlbums: t.photoAlbums,
        status: t.status,
        players: t.players?.map((p: any) =>
          p._id ? p._id.toString() : p.toString(),
        ),
        maxPlayers: t.maxPlayers,
        champion: t.champion,
        phase: this.calculateTournamentPhase(t, matches, standings.length),
        teams: await this.generateTeamData(t, matches),
        matches,
        currentStandings: standings,
        bracketProgression: this.calculateBracketProgression(matches),
        checkInStatus: await this.getCheckInStatus(t),
        managementState: t.managementState || {},
        bracketType: t.bracketType,
      };

      this.sendSuccess(res, liveTournament);
    },
  );

  // Execute tournament actions (start registration, advance rounds, etc.)
  executeTournamentAction = this.asyncHandler(
    async (req: RequestWithAuth, res: Response): Promise<void> => {
      logger.debug(
        "DEBUG: executeTournamentAction called with body:",
        JSON.stringify(req.body),
      );
      const { id } = req.params;
      const { action }: TournamentAction = req.body;

      const tournament = await Tournament.findById(id);
      if (!tournament) {
        logger.debug(`DEBUG: Tournament not found for ID: ${id}`);
        // Log all tournament IDs in DB for debugging
        const allTournaments = await Tournament.find({}, { _id: 1 });
        logger.debug(`DEBUG: Available tournament IDs: ${allTournaments.map(t => t._id).join(", ")}`);
        this.sendNotFound(res, "Tournament");
        return;
      }

      let updatedTournament: ITournament;

      switch (action) {
        case "start_registration":
          updatedTournament = await this.startRegistration(tournament);
          break;
        case "close_registration":
          updatedTournament = await this.closeRegistration(tournament);
          break;
        case "start_checkin":
          updatedTournament = await this.startCheckIn(tournament);
          break;
        case "start_round_robin":
          updatedTournament = await this.startRoundRobin(tournament);
          break;
        case "advance_round":
          updatedTournament = await this.advanceRound(tournament);
          break;
        case "set_round": {
          const target = (req.body?.parameters?.targetRound || "").toString();
          // Basic validation: allow known rounds from match types
          const allowed = [
            "RR_R1",
            "RR_R2",
            "RR_R3",
            "round-of-64",
            "round-of-32",
            "round-of-16",
            "quarterfinal",
            "semifinal",
            "final",
            "third-place",
            "lbr-round-1",
            "lbr-round-2",
            "lbr-quarterfinal",
            "lbr-semifinal",
            "lbr-final",
            "grand-final",
          ];
          if (!target || !allowed.includes(target)) {
            this.sendError(res, `Invalid round: ${target}`, 400);
            return;
          }
          (tournament as any).managementState =
            (tournament as any).managementState || {};
          (tournament as any).managementState.currentRound = target;
          updatedTournament = await tournament.save();
          break;
        }
        case "start_bracket":
          updatedTournament = await this.startBracket(tournament);
          break;
        case "complete_tournament":
          updatedTournament = await this.completeTournament(tournament);
          break;
        case "reset_tournament":
          updatedTournament = await this.resetTournament(tournament);
          break;
        default:
          this.sendError(res, `Unknown action: ${action}`, 400);
          return;
      }

      // Return updated live tournament data
      const matches = await Match.find({ tournamentId: id })
        .populate("team1.players team2.players", "name")
        .sort({ roundNumber: 1, matchNumber: 1 });

      const standings = await TournamentResult.find({ tournamentId: id })
        .populate("players", "name")
        .sort({ "totalStats.finalRank": 1 });

      const updatedTournamentObj = updatedTournament.toObject();
      const liveTournament: LiveTournament = {
        _id: updatedTournamentObj._id.toString(),
        date: updatedTournamentObj.date,
        bodNumber: updatedTournamentObj.bodNumber,
        format: updatedTournamentObj.format,
        location: updatedTournamentObj.location,
        advancementCriteria: updatedTournamentObj.advancementCriteria,
        notes: updatedTournamentObj.notes,
        photoAlbums: updatedTournamentObj.photoAlbums,
        status: updatedTournamentObj.status,
        players: updatedTournamentObj.players?.map((p: any) => p.toString()),
        maxPlayers: updatedTournamentObj.maxPlayers,
        champion: updatedTournamentObj.champion,
        phase: this.calculateTournamentPhase(updatedTournament, matches),
        teams: await this.generateTeamData(updatedTournament, matches),
        matches,
        currentStandings: standings,
        bracketProgression: this.calculateBracketProgression(matches),
        checkInStatus: await this.getCheckInStatus(updatedTournament),
        managementState: (updatedTournamentObj as any).managementState || {},
        bracketType: (updatedTournamentObj as any).bracketType,
      };

      // Notify subscribers with latest snapshot
      eventBus.emitTournament(id, "action", { action, live: liveTournament });

      this.sendSuccess(
        res,
        liveTournament,
        `Tournament action '${action}' completed successfully`,
      );
    },
  );

  // ==================== Phase Calculation ====================

  private calculateTournamentPhase(
    tournament: ITournament,
    matches: IMatch[],
    resultCount: number = 0,
  ): TournamentPhase {
    const completedMatches = matches.filter(
      (m) => m.status === "completed",
    ).length;
    const totalMatches = matches.length;

    let phase: TournamentPhase["phase"] = "setup";
    let currentRound: TournamentPhase["currentRound"] = undefined;
    let roundStatus: TournamentPhase["roundStatus"] = "not_started";

    // Determine phase based on tournament status and matches
    switch (tournament.status) {
      case "scheduled":
        // Historical tournament detection: has results but no matches
        if (matches.length === 0 && resultCount > 0) {
          phase = "completed";
          roundStatus = "completed";
          break;
        }
        phase = "setup";
        break;
      case "open":
        phase = "registration";
        break;
      case "active":
        // Historical tournament detection: has results but no matches
        if (matches.length === 0 && resultCount > 0) {
          phase = "completed";
          roundStatus = "completed";
          break;
        }
        if (matches.length === 0) {
          // Check if players are already preselected from tournament setup
          const hasPreselectedPlayers =
            tournament.players && tournament.players.length > 0;
          const hasGeneratedTeams =
            tournament.generatedTeams && tournament.generatedTeams.length > 0;

          if (hasPreselectedPlayers || hasGeneratedTeams) {
            // Check bracket type to determine correct phase
            const bType = (tournament as any).bracketType;
            if (
              bType === "single_elimination" ||
              bType === "double_elimination"
            ) {
              // Pre-selected players skip check-in. Start bracket directly.
              phase = "bracket";
              currentRound = "quarterfinal";
              roundStatus = "not_started";
            } else {
              // Default/Legacy behavior: Round Robin
              phase = "round_robin";
              currentRound = "RR_R1";
              roundStatus = "not_started";
            }
          } else {
            // Normal flow - need check-in
            phase = "check_in";
          }
        } else {
          // Determine if we're in round robin or bracket phase
          const hasRoundRobinMatches = matches.some((m) =>
            isRoundRobinRound(m.round),
          );
          const hasBracketMatches = matches.some((m) =>
            [
              "quarterfinal",
              "semifinal",
              "final",
              "lbr-round-1",
              "lbr-round-2",
              "lbr-quarterfinal",
              "lbr-semifinal",
              "lbr-final",
              "grand-final",
            ].includes(m.round),
          );

          if (hasRoundRobinMatches && !hasBracketMatches) {
            phase = "round_robin";
            currentRound = this.getCurrentRoundRobinRound(matches);
          } else if (hasBracketMatches) {
            phase = "bracket";
            currentRound = this.getCurrentBracketRound(matches);
          }

          roundStatus =
            completedMatches === totalMatches
              ? "completed"
              : completedMatches > 0
                ? "in_progress"
                : "not_started";
        }
        break;
      case "completed":
        phase = "completed";
        roundStatus = "completed";
        break;
    }

    return {
      phase,
      currentRound,
      roundStatus,
      totalMatches,
      completedMatches,
      canAdvance: this.canAdvanceRound(matches, roundStatus),
    };
  }

  private getCurrentRoundRobinRound(
    matches: IMatch[],
  ): "RR_R1" | "RR_R2" | "RR_R3" {
    // Determine the latest RR round with uncompleted matches; otherwise the last completed
    const rrOrder: Array<"RR_R1" | "RR_R2" | "RR_R3"> = [
      "RR_R1",
      "RR_R2",
      "RR_R3",
    ];
    for (const r of rrOrder) {
      const inRound = matches.filter((m) => m.round === r);
      if (inRound.length > 0 && inRound.some((m) => m.status !== "completed"))
        return r;
    }
    // If all completed or none found, pick the last one present or default RR_R1
    for (let i = rrOrder.length - 1; i >= 0; i--) {
      if (matches.some((m) => m.round === rrOrder[i])) return rrOrder[i];
    }
    return "RR_R1";
  }

  private getCurrentBracketRound(
    matches: IMatch[],
  ):
    | "quarterfinal"
    | "semifinal"
    | "final"
    | "lbr-round-1"
    | "lbr-round-2"
    | "lbr-quarterfinal"
    | "lbr-semifinal"
    | "lbr-final"
    | "grand-final" {
    const order: Array<any> = [
      "quarterfinal",
      "semifinal",
      "final",
      "lbr-round-1",
      "lbr-round-2",
      "lbr-quarterfinal",
      "lbr-semifinal",
      "lbr-final",
      "grand-final",
    ];
    // Return the first round in order that has any uncompleted matches
    for (const r of order) {
      const inRound = matches.filter((m) => m.round === r);
      if (inRound.length > 0 && inRound.some((m) => m.status !== "completed"))
        return r;
    }
    // Otherwise, return the deepest round present
    for (let i = order.length - 1; i >= 0; i--) {
      if (matches.some((m) => m.round === order[i])) return order[i];
    }
    return "quarterfinal";
  }

  private canAdvanceRound(matches: IMatch[], roundStatus: string): boolean {
    return roundStatus === "completed";
  }

  private calculateBracketProgression(matches: IMatch[]): {
    quarterFinalists: string[];
    semiFinalists: string[];
    finalists: string[];
    champion?: string | undefined;
  } {
    // Prevent unused parameter warning
    void matches;

    return {
      quarterFinalists: [],
      semiFinalists: [],
      finalists: [],
      champion: undefined,
    };
  }

  // ==================== Team Data Generation ====================

  private async generateTeamData(tournament: ITournament, matches?: IMatch[]) {
    try {
      // Convert stored generatedTeams to live team format with runtime status
      const storedTeams = tournament.generatedTeams || [];

      if (storedTeams.length === 0) {
        logger.debug("No generated teams found in tournament setup data");
        return [];
      }

      // Get matches if not provided
      if (!matches) {
        matches = await Match.find({ tournamentId: tournament._id });
      }

      // Get current tournament phase to determine team status
      const phase = this.calculateTournamentPhase(tournament, matches);

      // Convert each stored team to live team format
      const liveTeams = storedTeams.map((storedTeam: any) => {
        // Determine if team is still active based on match results
        const teamMatches = matches!.filter((m) =>
          this.teamInMatch(storedTeam.teamId, m),
        );

        const isEliminated = this.isTeamEliminated(
          storedTeam.teamId,
          matches!,
          phase.phase,
        );
        const hasAdvanced = this.hasTeamAdvanced(
          storedTeam.teamId,
          matches!,
          phase.phase,
        );

        return {
          teamId: storedTeam.teamId,
          teamName: storedTeam.teamName,
          players: storedTeam.players.map((player: any) => ({
            playerId: player.playerId,
            playerName: player.playerName,
            seed: player.seed,
            statistics: player.statistics,
          })),
          combinedSeed: storedTeam.combinedSeed,
          combinedStatistics: storedTeam.combinedStatistics,

          // Live tournament status
          status: isEliminated
            ? "eliminated"
            : hasAdvanced
              ? "advanced"
              : "active",
          matchesPlayed: teamMatches.filter((m) => m.status === "completed")
            .length,
          matchesWon: teamMatches.filter(
            (m) =>
              m.status === "completed" &&
              this.isTeamWinner(storedTeam.teamId, m),
          ).length,
          currentRound: phase.currentRound || "setup",
          checkedIn: phase.phase !== "check_in" ? true : false, // Default to true unless in check-in phase
          present: true, // Default to present
        };
      });

      logger.debug(`Generated live team data for ${liveTeams.length} teams`);
      return liveTeams;
    } catch (error) {
      logger.error("Error generating team data:", error);
      return [];
    }
  }

  // Helper method to check if a team is in a specific match
  private teamInMatch(teamId: string, match: any): boolean {
    return (
      match.team1?.players?.includes(teamId) ||
      match.team2?.players?.includes(teamId) ||
      match.team1?.teamName?.includes(teamId) ||
      match.team2?.teamName?.includes(teamId)
    );
  }

  // Helper method to determine if team is eliminated
  private isTeamEliminated(
    teamId: string,
    matches: any[],
    phase: string,
  ): boolean {
    if (phase !== "bracket") return false;

    // In bracket play, losing a match eliminates you
    const teamMatches = matches.filter(
      (m) =>
        this.teamInMatch(teamId, m) &&
        m.status === "completed" &&
        ["quarterfinal", "semifinal", "final"].includes(m.round),
    );

    return teamMatches.some((m) => !this.isTeamWinner(teamId, m));
  }

  // Helper method to determine if team has advanced
  private hasTeamAdvanced(
    teamId: string,
    matches: any[],
    phase: string,
  ): boolean {
    if (phase !== "bracket") return false;

    const teamMatches = matches.filter(
      (m) =>
        this.teamInMatch(teamId, m) &&
        m.status === "completed" &&
        ["quarterfinal", "semifinal"].includes(m.round),
    );

    return teamMatches.some((m) => this.isTeamWinner(teamId, m));
  }

  // Helper method to check if team won a match
  private isTeamWinner(teamId: string, match: any): boolean {
    if (!match.winner) return false;

    if (
      match.winner === "team1" &&
      this.teamInMatch(teamId, { team1: match.team1 })
    ) {
      return true;
    }
    if (
      match.winner === "team2" &&
      this.teamInMatch(teamId, { team2: match.team2 })
    ) {
      return true;
    }
    return false;
  }

  private async getCheckInStatus(tournament: ITournament) {
    try {
      // Get teams from tournament setup data
      const teams = tournament.generatedTeams || [];
      const checkInStatus: Record<string, any> = {};

      // For now, default all teams to checked in unless we're in check-in phase
      // In a real implementation, this would come from a separate check-in collection
      teams.forEach((team) => {
        checkInStatus[team.teamId] = {
          checkedIn: tournament.status !== "open", // Auto check-in unless registration is open
          checkInTime:
            tournament.status !== "open" ? new Date().toISOString() : undefined,
          present: true,
        };
      });

      return checkInStatus;
    } catch (error) {
      logger.error("Error getting check-in status:", error);
      return {};
    }
  }

  // ==================== Tournament Action Handlers ====================

  private async startRegistration(
    tournament: ITournament,
  ): Promise<ITournament> {
    try {
      logger.debug("Starting registration logic...");
      // Only skip registration if ALL players are preselected (tournament is full)
      const maxPlayers = tournament.maxPlayers || 0;
      const preselectedCount =
        (tournament.players?.length || 0) +
        ((tournament as any).generatedTeams?.reduce(
          (sum: number, team: any) => sum + (team.players?.length || 0),
          0,
        ) || 0);
      const isFullyPreselected =
        maxPlayers > 0 && preselectedCount >= maxPlayers;

      logger.debug(
        `Registration check: max=${maxPlayers}, preselected=${preselectedCount}, full=${isFullyPreselected}`,
      );

      if (isFullyPreselected) {
        // Full roster preselected — proceed without registration
        logger.debug("Full roster preselected, skipping registration phase");
        tournament.status = "active";
        const saved = await tournament.save();
        logger.debug("Tournament saved as active");
        return saved;
      }

      // Normal registration flow (not all players preselected)
      logger.debug("Opening registration (status=open)");
      tournament.status = "open";
      const saved = await tournament.save();
      logger.debug("Tournament saved as open");
      return saved;
    } catch (err) {
      logger.error("Error in startRegistration:", err);
      throw err;
    }
  }

  private async closeRegistration(
    tournament: ITournament,
  ): Promise<ITournament> {
    // Copy registered players to main players array for match generation
    if (tournament.registeredPlayers && tournament.registeredPlayers.length > 0) {
      tournament.players = tournament.registeredPlayers.map((rp) => rp.playerId);
    }
    tournament.status = "active";
    return await tournament.save();
  }

  private async startCheckIn(tournament: ITournament): Promise<ITournament> {
    // Implement check-in logic
    return tournament;
  }

  private async startRoundRobin(tournament: ITournament): Promise<ITournament> {
    // Generate round robin matches for first round and activate tournament
    await MatchController.createMatchesForRound(tournament, "RR_R1");
    tournament.status = "active";
    return await (tournament as any).save();
  }

  private async advanceRound(tournament: ITournament): Promise<ITournament> {
    try {
      logger.debug("Advancing tournament to next round");

      // Get current matches to determine current round and progression
      const matches = await Match.find({ tournamentId: tournament._id });
      const phase = this.calculateTournamentPhase(tournament, matches);

      if (!phase.canAdvance) {
        logger.debug("Tournament round cannot advance - matches not completed");
        return tournament;
      }

      // Advance based on current phase
      if (phase.phase === "round_robin") {
        return await this.advanceRoundRobin(tournament, phase.currentRound);
      } else if (phase.phase === "bracket") {
        return await this.advanceBracketRound(tournament, phase.currentRound);
      }

      return tournament;
    } catch (error) {
      logger.error("Error advancing round:", error);
      return tournament;
    }
  }

  // Advance round-robin rounds (R1 -> R2 -> R3 -> Bracket)
  private async advanceRoundRobin(
    tournament: ITournament,
    currentRound?: string,
  ): Promise<ITournament> {
    try {
      const nextRound = getNextRoundRobinRound(currentRound as any);

      if (nextRound === "bracket") {
        // Round robin complete, determine qualifiers and start bracket
        logger.debug("Round robin complete, starting bracket phase");

        // Calculate final round-robin standings
        await this.calculateRoundRobinStandings(tournament);

        // Generate bracket matches with qualified teams
        await MatchController.createMatchesForRound(tournament, "quarterfinal");

        tournament.status = "active"; // Ensure tournament is active for bracket play
        return await tournament.save();
      } else {
        // Generate next round-robin matches
        logger.debug(`Advancing to ${nextRound}`);
        await MatchController.createMatchesForRound(tournament, nextRound);
        return tournament;
      }
    } catch (error) {
      logger.error("Error advancing round robin:", error);
      return tournament;
    }
  }

  // Advance bracket rounds (QF -> SF -> Finals -> Complete)
  private async advanceBracketRound(
    tournament: ITournament,
    currentRound?: string,
  ): Promise<ITournament> {
    try {
      // Double elimination flow
      if ((tournament as any).bracketType === "double_elimination") {
        return await this.advanceDoubleElimination(tournament);
      }

      const nextRound = this.getNextBracketRound(currentRound);
      if (!nextRound) {
        logger.debug("Tournament complete!");
        tournament.status = "completed";
        await this.setTournamentChampion(tournament);
        await this.updatePlayerCareerStats(tournament);
        return await tournament.save();
      }

      logger.debug(`Advancing to bracket ${nextRound}`);
      const advancingTeams = await MatchController.getBracketAdvancingTeams(
        tournament,
        currentRound,
      );
      await MatchController.generateBracketMatchesForRound(
        tournament,
        advancingTeams,
        nextRound,
      );
      return tournament;
    } catch (error) {
      logger.error("Error advancing bracket round:", error);
      return tournament;
    }
  }

  private getNextBracketRound(currentRound?: string): string | null {
    const roundOrder = ["quarterfinal", "semifinal", "final"];
    const currentIndex = currentRound ? roundOrder.indexOf(currentRound) : -1;

    if (currentIndex === -1) return "quarterfinal";
    if (currentIndex >= roundOrder.length - 1) return null; // Tournament complete

    return roundOrder[currentIndex + 1];
  }

  // Calculate and save round-robin standings
  private async calculateRoundRobinStandings(
    tournament: ITournament,
  ): Promise<void> {
    try {
      // Get all round-robin matches
      const rrMatches = await Match.find({
        tournamentId: tournament._id,
        round: { $in: ["RR_R1", "RR_R2", "RR_R3"] },
        status: "completed",
      });

      // Calculate standings for each team
      const teams = tournament.generatedTeams || [];
      const standings = teams.map((team) => {
        const teamMatches = rrMatches.filter((m) =>
          this.teamInMatch(team.teamId, m),
        );

        const wins = teamMatches.filter((m) =>
          this.isTeamWinner(team.teamId, m),
        ).length;

        const losses = teamMatches.length - wins;
        const winPercentage =
          teamMatches.length > 0 ? wins / teamMatches.length : 0;

        return {
          ...team,
          rrWins: wins,
          rrLosses: losses,
          rrPlayed: teamMatches.length,
          rrWinPercentage: winPercentage,
          qualified: wins >= Math.floor(teamMatches.length / 2), // Simple qualification rule
        };
      });

      // Sort by win percentage, then by seed
      standings.sort((a, b) => {
        if (a.rrWinPercentage !== b.rrWinPercentage) {
          return b.rrWinPercentage - a.rrWinPercentage;
        }
        return a.combinedSeed - b.combinedSeed;
      });

      logger.debug(
        "Round-robin standings calculated:",
        standings.length,
        "teams",
      );
    } catch (error) {
      logger.error("Error calculating round-robin standings:", error);
    }
  }

  // Set tournament champion when tournament completes
  private async setTournamentChampion(tournament: ITournament): Promise<void> {
    try {
      logger.debug(
        `DEBUG: setTournamentChampion called for tournament ${tournament._id}`,
      );
      const finalMatch = await Match.findOne({
        tournamentId: tournament._id,
        round: "final",
        status: "completed",
      });

      if (finalMatch && finalMatch.winner) {
        logger.debug(
          `DEBUG: Found final match ${finalMatch._id}, winner: ${finalMatch.winner}`,
        );
        const winningTeam =
          finalMatch.winner === "team1" ? finalMatch.team1 : finalMatch.team2;
        logger.debug(
          `DEBUG: Winning Team Players: ${JSON.stringify(winningTeam.players)}`,
        );

        tournament.champion = {
          playerId: winningTeam.players[0], // First player as representative
          playerName: winningTeam.playerNames.join(" & "),
        };

        logger.debug(
          `Tournament champion set: ${tournament.champion.playerName} (${tournament.champion.playerId})`,
        );
      } else {
        logger.debug(
          `DEBUG: Final match not found or no winner. Match: ${finalMatch?._id} Winner: ${finalMatch?.winner}`,
        );
      }
    } catch (error) {
      logger.error("Error setting tournament champion:", error);
    }
  }

  // Update player career statistics
  private async updatePlayerCareerStats(
    tournament: ITournament,
  ): Promise<void> {
    try {
      logger.debug(
        `Updating career statistics for tournament ${tournament._id}`,
      );

      // Get all completed matches for this tournament
      const allMatches = await Match.find({
        tournamentId: tournament._id,
        status: "completed",
      });

      if (allMatches.length === 0) {
        logger.debug("No completed matches found, skipping career stats update");
        return;
      }

      // Get teams from tournament setup
      const teams = tournament.generatedTeams || [];
      if (teams.length === 0) {
        logger.debug("No teams found in tournament setup");
        return;
      }

      // Calculate final results for each team
      const teamResults = await this.calculateFinalTeamResults(
        teams,
        allMatches,
        tournament,
      );

      // Create tournament result records and update player stats
      for (const teamResult of teamResults) {
        // Create TournamentResult record
        await this.createTournamentResultRecord(tournament, teamResult);

        // Update career stats for each player in the team
        for (const player of teamResult.team.players) {
          await this.updateIndividualPlayerStats(
            player,
            teamResult,
            tournament,
          );
        }
      }

      logger.debug(`Career statistics updated for ${teamResults.length} teams`);
    } catch (error) {
      logger.error("Error updating career statistics:", error);
    }
  }

  private async calculateFinalTeamResults(
    teams: any[],
    matches: any[],
    tournament: ITournament,
  ) {
    const teamResults = [];

    for (const team of teams) {
      // Get all matches for this team
      const teamMatches = matches.filter((m) =>
        this.teamInMatch(team.teamId, m),
      );

      // Separate round-robin and bracket matches
      const rrMatches = teamMatches.filter((m) => isRoundRobinRound(m.round));
      const bracketMatches = teamMatches.filter((m) =>
        ["quarterfinal", "semifinal", "final"].includes(m.round),
      );

      // Calculate round-robin stats
      const rrStats = this.calculateRoundRobinStats(team, rrMatches);

      // Calculate bracket stats
      const bracketStats = this.calculateBracketStats(team, bracketMatches);

      // Calculate total stats
      const totalWon = rrStats.rrWon + bracketStats.bracketWon;
      const totalLost = rrStats.rrLost + bracketStats.bracketLost;
      const totalPlayed = totalWon + totalLost;
      const winPercentage = totalPlayed > 0 ? totalWon / totalPlayed : 0;

      // Determine final ranking based on bracket performance and round-robin record
      const finalRank = this.calculateFinalRank(
        team,
        rrStats,
        bracketStats,
        teams.length,
      );

      teamResults.push({
        team,
        roundRobinScores: rrStats,
        bracketScores: bracketStats,
        totalStats: {
          totalWon,
          totalLost,
          totalPlayed,
          winPercentage,
          finalRank,
          bodFinish: finalRank,
          home: tournament.location === "Home", // Assuming Home tournaments are tracked
        },
      });
    }

    // Sort by final rank to ensure correct BOD finish positions
    teamResults.sort((a, b) => a.totalStats.finalRank - b.totalStats.finalRank);

    return teamResults;
  }

  private calculateRoundRobinStats(team: any, rrMatches: any[]) {
    let rrWon = 0;
    let rrLost = 0;
    const roundScores: any = {};

    rrMatches.forEach((match) => {
      const isWinner = this.isTeamWinner(team.teamId, match);
      if (isWinner) rrWon++;
      else rrLost++;

      // Track round-specific results if match has round info
      if (match.roundNumber) {
        const roundKey = `round${match.roundNumber}`;
        if (!roundScores[roundKey]) roundScores[roundKey] = 0;
        roundScores[roundKey] += isWinner ? 1 : 0;
      }
    });

    return {
      ...roundScores,
      rrWon,
      rrLost,
      rrPlayed: rrWon + rrLost,
      rrWinPercentage: rrWon + rrLost > 0 ? rrWon / (rrWon + rrLost) : 0,
      rrRank: 0, // Will be calculated after sorting all teams
    };
  }

  private calculateBracketStats(team: any, bracketMatches: any[]) {
    let bracketWon = 0;
    let bracketLost = 0;
    const roundStats: any = {};

    bracketMatches.forEach((match) => {
      const isWinner = this.isTeamWinner(team.teamId, match);
      if (isWinner) bracketWon++;
      else bracketLost++;

      // Track specific bracket round results
      const roundPrefix = this.getBracketRoundPrefix(match.round);
      if (roundPrefix) {
        if (!roundStats[`${roundPrefix}Won`])
          roundStats[`${roundPrefix}Won`] = 0;
        if (!roundStats[`${roundPrefix}Lost`])
          roundStats[`${roundPrefix}Lost`] = 0;

        if (isWinner) roundStats[`${roundPrefix}Won`]++;
        else roundStats[`${roundPrefix}Lost`]++;
      }
    });

    return {
      ...roundStats,
      bracketWon,
      bracketLost,
      bracketPlayed: bracketWon + bracketLost,
    };
  }

  private getBracketRoundPrefix(round: string): string | null {
    const roundMap: Record<string, string> = {
      quarterfinal: "qf",
      semifinal: "sf",
      final: "finals",
      "round-of-16": "r16",
    };
    return roundMap[round] || null;
  }

  private calculateFinalRank(
    team: any,
    rrStats: any,
    bracketStats: any,
    totalTeams: number,
  ): number {
    // Tournament finish based on bracket advancement
    if (bracketStats.finalsWon > 0) return 1; // Champion
    if (bracketStats.finalsLost > 0) return 2; // Runner-up
    if (bracketStats.sfLost > 0) return 3; // Lost in semi-final (3rd/4th place)
    if (bracketStats.qfLost > 0) return Math.min(5, totalTeams); // Lost in quarter-final (5th-8th)

    // If no bracket play, rank based on round-robin performance
    // Higher win percentage = better rank
    const rrRank = Math.ceil((1 - rrStats.rrWinPercentage) * totalTeams);
    return Math.max(rrRank, Math.ceil(totalTeams * 0.5)); // At least middle of pack
  }

  private async createTournamentResultRecord(
    tournament: ITournament,
    teamResult: any,
  ) {
    try {
      // Check if result already exists
      const existingResult = await TournamentResult.findOne({
        tournamentId: tournament._id,
        players: { $all: teamResult.team.players.map((p: any) => p.playerId) },
      });

      if (existingResult) {
        // Update existing result
        await TournamentResult.findByIdAndUpdate(existingResult._id, {
          roundRobinScores: teamResult.roundRobinScores,
          bracketScores: teamResult.bracketScores,
          totalStats: teamResult.totalStats,
          seed: teamResult.team.combinedSeed,
        });
      } else {
        // Create new result
        await TournamentResult.create({
          tournamentId: tournament._id,
          players: teamResult.team.players.map((p: any) => p.playerId),
          division: tournament.format || "M", // Default to Men's if not specified
          seed: teamResult.team.combinedSeed,
          roundRobinScores: teamResult.roundRobinScores,
          bracketScores: teamResult.bracketScores,
          totalStats: teamResult.totalStats,
        });
      }
    } catch (error) {
      logger.error("Error creating tournament result record:", error);
    }
  }

  private async updateIndividualPlayerStats(
    player: any,
    teamResult: any,
    tournament: ITournament,
  ) {
    try {
      const existingPlayer = await Player.findById(player.playerId);
      if (!existingPlayer) {
        logger.debug(`Player not found: ${player.playerId}`);
        return;
      }

      // Update career statistics
      const updatedStats = {
        bodsPlayed: existingPlayer.bodsPlayed + 1,
        gamesPlayed:
          existingPlayer.gamesPlayed + teamResult.totalStats.totalPlayed,
        gamesWon: existingPlayer.gamesWon + teamResult.totalStats.totalWon,
        bestResult: Math.min(
          existingPlayer.bestResult || 999,
          teamResult.totalStats.bodFinish,
        ),
        totalChampionships:
          existingPlayer.totalChampionships +
          (teamResult.totalStats.bodFinish === 1 ? 1 : 0),
        winningPercentage: 0, // Will be calculated below
        avgFinish: 0, // Will be calculated below
        divisionChampionships: existingPlayer.divisionChampionships || 0,
        individualChampionships: existingPlayer.individualChampionships || 0,
      };

      // Recalculate derived statistics
      updatedStats.winningPercentage =
        updatedStats.gamesPlayed > 0
          ? updatedStats.gamesWon / updatedStats.gamesPlayed
          : 0;

      // Calculate new average finish
      const previousFinishTotal =
        (existingPlayer.avgFinish || 0) * (existingPlayer.bodsPlayed || 0);
      const newFinishTotal =
        previousFinishTotal + teamResult.totalStats.bodFinish;
      updatedStats.avgFinish = newFinishTotal / updatedStats.bodsPlayed;

      // Update individual vs division championships
      if (teamResult.totalStats.bodFinish === 1) {
        if (tournament.format === "M" || tournament.format === "W") {
          updatedStats.divisionChampionships =
            existingPlayer.divisionChampionships + 1;
        } else {
          updatedStats.individualChampionships =
            existingPlayer.individualChampionships + 1;
        }
      }

      // Save updated player statistics
      await Player.findByIdAndUpdate(player.playerId, updatedStats);

      logger.debug(`Updated career stats for player ${player.playerName}`);
    } catch (error) {
      logger.error(
        `Error updating player stats for ${player.playerName}:`,
        error,
      );
    }
  }

  private async startBracket(tournament: ITournament): Promise<ITournament> {
    const teamCount = (tournament.generatedTeams || []).length;
    let startRound = "quarterfinal";

    if (teamCount <= 2) {
      startRound = "final";
    } else if (teamCount <= 4) {
      startRound = "semifinal";
    }

    // Generate bracket matches
    await MatchController.createMatchesForRound(tournament, startRound);
    return tournament;
  }

  private async completeTournament(
    tournament: ITournament,
  ): Promise<ITournament> {
    // When completing outside of bracket advancement, ensure champion and player stats set
    try {
      tournament.status = "completed";
      await this.setTournamentChampion(tournament);
      await this.updatePlayerCareerStats(tournament);
    } catch (err) {
      logger.error("Error finalizing tournament stats on completion:", err);
    }
    return await tournament.save();
  }

  private async advanceDoubleElimination(
    tournament: ITournament,
  ): Promise<ITournament> {
    // Inspect existing matches to determine what to generate next
    const allMatches = await Match.find({ tournamentId: tournament._id });
    const hasQF = allMatches.some((m) => m.round === "quarterfinal");
    const qfCompleted =
      hasQF &&
      allMatches
        .filter((m) => m.round === "quarterfinal")
        .every((m) => m.status === "completed");
    const hasSF = allMatches.some((m) => m.round === "semifinal");
    const sfCompleted =
      hasSF &&
      allMatches
        .filter((m) => m.round === "semifinal")
        .every((m) => m.status === "completed");
    const hasWF = allMatches.some((m) => m.round === "final");
    const wfCompleted =
      hasWF &&
      allMatches
        .filter((m) => m.round === "final")
        .every((m) => m.status === "completed");

    const hasL1 = allMatches.some((m) => m.round === "lbr-round-1");
    const l1Completed =
      hasL1 &&
      allMatches
        .filter((m) => m.round === "lbr-round-1")
        .every((m) => m.status === "completed");
    const hasLSF = allMatches.some((m) => m.round === "lbr-semifinal");
    const lsfCompleted =
      hasLSF &&
      allMatches
        .filter((m) => m.round === "lbr-semifinal")
        .every((m) => m.status === "completed");
    const hasLF = allMatches.some((m) => m.round === "lbr-final");
    const lfCompleted =
      hasLF &&
      allMatches
        .filter((m) => m.round === "lbr-final")
        .every((m) => m.status === "completed");
    const hasGF = allMatches.some((m) => m.round === "grand-final");

    // After QF complete, generate SF and LBR round 1 (from QF losers)
    if (qfCompleted && !hasSF) {
      const sfTeams = await MatchController.getBracketAdvancingTeams(
        tournament,
        "quarterfinal",
      );
      await MatchController.generateBracketMatchesForRound(
        tournament,
        sfTeams,
        "semifinal",
      );
    }
    if (qfCompleted && !hasL1) {
      const qfLosers = await MatchController.getBracketLosingTeams(
        tournament,
        "quarterfinal",
      );
      await MatchController.generateLosersMatchesForRound(
        tournament,
        qfLosers,
        "lbr-round-1",
      );
    }

    // After SF complete, generate winners Final and LBR semifinal (losers of SF vs winners of LBR round 1)
    if (sfCompleted && !hasWF) {
      const wfTeams = await MatchController.getBracketAdvancingTeams(
        tournament,
        "semifinal",
      );
      await MatchController.generateBracketMatchesForRound(
        tournament,
        wfTeams,
        "final",
      );
    }
    if (sfCompleted && hasL1 && l1Completed && !hasLSF) {
      const sfLosers = await MatchController.getBracketLosingTeams(
        tournament,
        "semifinal",
      );
      // Winners from LBR round 1
      const l1Winners = await MatchController.getBracketAdvancingTeams(
        tournament as any,
        "lbr-round-1" as any,
      );
      const lsfTeams = [...sfLosers, ...l1Winners];
      await MatchController.generateLosersMatchesForRound(
        tournament,
        lsfTeams,
        "lbr-semifinal",
      );
    }

    // After LBR semifinal complete, generate LBR final
    if (hasLSF && lsfCompleted && !hasLF) {
      const lsfWinners = await MatchController.getBracketAdvancingTeams(
        tournament as any,
        "lbr-semifinal" as any,
      );
      await MatchController.generateLosersMatchesForRound(
        tournament,
        lsfWinners,
        "lbr-final",
      );
    }

    // If winners Final and LBR final complete, generate grand final
    if (wfCompleted && hasLF && lfCompleted && !hasGF) {
      const wfWinner = await MatchController.getBracketAdvancingTeams(
        tournament,
        "final",
      );
      const lfWinner = await MatchController.getBracketAdvancingTeams(
        tournament as any,
        "lbr-final" as any,
      );
      const gfTeams = [...wfWinner, ...lfWinner];
      await MatchController.generateLosersMatchesForRound(
        tournament,
        gfTeams,
        "grand-final",
      );
    }

    return tournament;
  }

  private async resetTournament(tournament: ITournament): Promise<ITournament> {
    // Delete all matches and reset tournament
    await Match.deleteMany({ tournamentId: tournament._id });
    tournament.status = "scheduled";
    return await tournament.save();
  }
}

export default new LiveTournamentController();
