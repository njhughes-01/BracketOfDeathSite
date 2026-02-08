import { Request, Response } from "express";
import logger from "../utils/logger";
import { Tournament } from "../models/Tournament";
import { Match } from "../models/Match";
import { TournamentResult } from "../models/TournamentResult";
import { IMatch, isRoundRobinRound } from "../types/match";
import { ITournament } from "../types/tournament";
import { BaseController } from "./base";
import { LiveStatsService } from "../services/LiveStatsService";
import { eventBus } from "../services/EventBus";

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

/**
 * TournamentStatsController handles statistics and streaming:
 * - getLiveStats, getTournamentPlayerStats
 * - streamTournamentEvents (SSE)
 */
export class TournamentStatsController extends BaseController {
  constructor() {
    super();
  }

  // Get live tournament statistics
  getLiveStats = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      // Use the LiveStatsService to get comprehensive statistics
      const liveStats =
        await LiveStatsService.calculateLiveTournamentStats(id);

      if (!liveStats) {
        this.sendError(
          res,
          "Tournament not found or no statistics available",
          404,
        );
        return;
      }

      this.sendSuccess(
        res,
        liveStats,
        "Live tournament statistics retrieved successfully",
      );
    },
  );

  // Per-player stats for a tournament (points, wins/losses based on playerScores)
  getTournamentPlayerStats = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const playerStats =
        await LiveStatsService.calculatePlayerStatsForTournament(id);
      this.sendSuccess(
        res,
        playerStats,
        "Tournament player stats retrieved successfully",
      );
    },
  );

  // Server-Sent Events: stream live tournament updates
  streamTournamentEvents = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      res.status(200);
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");

      const send = (event: string, data: unknown) => {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      // Initial snapshot
      try {
        const live = await this.buildLiveTournament(id);
        if (live) {
          send("snapshot", { success: true, data: live });
        } else {
          send("error", { success: false, error: "Tournament not found" });
        }
      } catch (e) {
        send("error", { success: false, error: "Failed to build snapshot" });
      }

      const unsubscribe = eventBus.onTournament(id, (evt) => {
        send("update", evt);
      });

      const heartbeat = setInterval(() => {
        res.write(": ping\n\n");
      }, 25000);

      req.on("close", () => {
        clearInterval(heartbeat);
        unsubscribe();
      });
    },
  );

  // ==================== Helper Methods for Streaming ====================

  // Build a full live snapshot of the tournament
  private async buildLiveTournament(
    id: string,
  ): Promise<LiveTournament | null> {
    const tournament = await Tournament.findById(id).populate(
      "players",
      "name",
    );
    if (!tournament) return null;

    const matches = await Match.find({ tournamentId: id })
      .populate("team1.players team2.players", "name")
      .sort({ roundNumber: 1, matchNumber: 1 });

    const standings = await TournamentResult.find({ tournamentId: id })
      .populate("players", "name")
      .sort({ "totalStats.finalRank": 1 });

    const t = tournament.toObject();
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
      players: t.players?.map((p: any) => p.toString()),
      maxPlayers: t.maxPlayers,
      champion: t.champion,
      phase: this.calculateTournamentPhase(tournament as any, matches, standings.length),
      teams: await this.generateTeamData(tournament as any, matches),
      matches,
      currentStandings: standings,
      bracketProgression: this.calculateBracketProgression(matches),
      checkInStatus: await this.getCheckInStatus(tournament as any),
      managementState: (t as any).managementState || {},
      bracketType: (t as any).bracketType,
    };
    return liveTournament;
  }

  // ==================== Phase Calculation (shared with LiveTournamentController) ====================

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
      canAdvance: roundStatus === "completed",
    };
  }

  private getCurrentRoundRobinRound(
    matches: IMatch[],
  ): "RR_R1" | "RR_R2" | "RR_R3" {
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

  private async generateTeamData(tournament: ITournament, matches: IMatch[]) {
    try {
      // Convert stored generatedTeams to live team format with runtime status
      const storedTeams = tournament.generatedTeams || [];

      if (storedTeams.length === 0) {
        logger.debug("No generated teams found in tournament setup data");
        return [];
      }

      // Get current tournament phase to determine team status
      const phase = this.calculateTournamentPhase(tournament, matches);

      // Convert each stored team to live team format
      const liveTeams = storedTeams.map((storedTeam: any) => {
        // Determine if team is still active based on match results
        const teamMatches = matches.filter((m) =>
          this.teamInMatch(storedTeam.teamId, m),
        );

        const isEliminated = this.isTeamEliminated(
          storedTeam.teamId,
          matches,
          phase.phase,
        );
        const hasAdvanced = this.hasTeamAdvanced(
          storedTeam.teamId,
          matches,
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
          checkedIn: phase.phase !== "check_in" ? true : false,
          present: true,
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
      teams.forEach((team) => {
        checkInStatus[team.teamId] = {
          checkedIn: tournament.status !== "open",
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
}

export default new TournamentStatsController();
