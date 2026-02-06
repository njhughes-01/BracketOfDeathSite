import { Tournament } from "../models/Tournament";
import { Match } from "../models/Match";
import { TournamentResult } from "../models/TournamentResult";
import { Player } from "../models/Player";
import { Types } from "mongoose";
import { isRoundRobinRound } from "../types/match";

export interface LiveTeamStats {
  teamId: string;
  teamName: string;
  players: Array<{
    playerId: string;
    playerName: string;
  }>;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  winPercentage: number;
  pointsScored: number;
  pointsAllowed: number;
  pointDifferential: number;
  currentRank: number;
  roundRobinRecord: {
    played: number;
    won: number;
    lost: number;
    winPercentage: number;
  };
  bracketRecord: {
    played: number;
    won: number;
    lost: number;
    eliminated: boolean;
    advancedTo?: string;
  };
  performanceGrade: string;
}

export interface LiveTournamentStats {
  tournamentId: string;
  totalTeams: number;
  totalMatches: number;
  completedMatches: number;
  inProgressMatches: number;
  currentPhase: string;
  currentRound?: string;
  teamStandings: LiveTeamStats[];
  matchSummary: {
    roundRobin: {
      total: number;
      completed: number;
      inProgress: number;
    };
    bracket: {
      total: number;
      completed: number;
      inProgress: number;
    };
  };
  lastUpdated: Date;
}

export class LiveStatsService {
  // Calculate comprehensive live tournament statistics
  static async calculateLiveTournamentStats(
    tournamentId: string,
  ): Promise<LiveTournamentStats | null> {
    try {
      const tournament = await Tournament.findById(tournamentId);
      if (!tournament) return null;

      const matches = await Match.find({ tournamentId });
      const teams = tournament.generatedTeams || [];

      // Calculate team statistics
      const teamStandings = await this.calculateTeamStandings(
        teams,
        matches,
        tournamentId,
      );

      // Calculate match summary
      const matchSummary = this.calculateMatchSummary(matches);

      // Determine current phase and round
      const { currentPhase, currentRound } = this.determineCurrentPhase(
        matches,
        tournament.status,
      );

      return {
        tournamentId,
        totalTeams: teams.length,
        totalMatches: matches.length,
        completedMatches: matches.filter((m) => m.status === "completed")
          .length,
        inProgressMatches: matches.filter((m) => m.status === "in-progress")
          .length,
        currentPhase,
        currentRound,
        teamStandings: teamStandings
          .sort((a, b) => {
            // Sort by win percentage, then by point differential
            if (a.winPercentage !== b.winPercentage) {
              return b.winPercentage - a.winPercentage;
            }
            return b.pointDifferential - a.pointDifferential;
          })
          .map((team, index) => ({ ...team, currentRank: index + 1 })),
        matchSummary,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error("Error calculating live tournament stats:", error);
      return null;
    }
  }

  // Calculate individual team standings and statistics
  private static async calculateTeamStandings(
    teams: any[],
    matches: any[],
    tournamentId: string,
  ): Promise<LiveTeamStats[]> {
    const teamStats: LiveTeamStats[] = [];

    for (const team of teams) {
      // Get all matches for this team
      const teamMatches = matches.filter(
        (match) =>
          this.isTeamInMatch(team.teamId, match) ||
          this.isTeamInMatchByName(team.teamName, match),
      );

      const completedMatches = teamMatches.filter(
        (m) => m.status === "completed",
      );
      const wonMatches = completedMatches.filter((m) =>
        this.isTeamWinner(team, m),
      );

      // Separate round-robin and bracket matches
      const rrMatches = completedMatches.filter((m) =>
        isRoundRobinRound(m.round),
      );
      const bracketMatches = completedMatches.filter((m) =>
        ["quarterfinal", "semifinal", "final"].includes(m.round),
      );

      const rrWon = rrMatches.filter((m) => this.isTeamWinner(team, m)).length;
      const bracketWon = bracketMatches.filter((m) =>
        this.isTeamWinner(team, m),
      ).length;

      // Calculate point statistics
      const { pointsScored, pointsAllowed } = this.calculateTeamPoints(
        team,
        completedMatches,
      );
      const pointDifferential = pointsScored - pointsAllowed;

      // Determine if team is eliminated in bracket
      const eliminated = bracketMatches.some(
        (m) => m.status === "completed" && !this.isTeamWinner(team, m),
      );

      // Determine advancement
      const advancedTo = this.getTeamAdvancement(team, bracketMatches);

      // Calculate performance grade
      const performanceGrade = this.calculatePerformanceGrade(
        completedMatches.length > 0
          ? wonMatches.length / completedMatches.length
          : 0,
        pointDifferential,
        completedMatches.length,
      );

      teamStats.push({
        teamId: team.teamId,
        teamName: team.teamName,
        players: team.players.map((p: any) => ({
          playerId: p.playerId,
          playerName: p.playerName,
        })),
        matchesPlayed: completedMatches.length,
        matchesWon: wonMatches.length,
        matchesLost: completedMatches.length - wonMatches.length,
        winPercentage:
          completedMatches.length > 0
            ? wonMatches.length / completedMatches.length
            : 0,
        pointsScored,
        pointsAllowed,
        pointDifferential,
        currentRank: 0, // Will be set after sorting
        roundRobinRecord: {
          played: rrMatches.length,
          won: rrWon,
          lost: rrMatches.length - rrWon,
          winPercentage: rrMatches.length > 0 ? rrWon / rrMatches.length : 0,
        },
        bracketRecord: {
          played: bracketMatches.length,
          won: bracketWon,
          lost: bracketMatches.length - bracketWon,
          eliminated,
          advancedTo,
        },
        performanceGrade,
      });
    }

    return teamStats;
  }

  // Helper methods
  private static isTeamInMatch(teamId: string, match: any): boolean {
    return (
      match.team1?.players?.some((p: any) => p && p.toString().includes(teamId)) ||
      match.team2?.players?.some((p: any) => p && p.toString().includes(teamId))
    );
  }

  private static isTeamInMatchByName(teamName: string, match: any): boolean {
    return (
      match.team1?.playerNames?.join(" & ") === teamName ||
      match.team2?.playerNames?.join(" & ") === teamName
    );
  }

  private static isTeamWinner(team: any, match: any): boolean {
    if (!match.winner) return false;

    const winningTeam = match.winner === "team1" ? match.team1 : match.team2;
    return winningTeam.playerNames?.join(" & ") === team.teamName;
  }

  private static calculateTeamPoints(
    team: any,
    matches: any[],
  ): { pointsScored: number; pointsAllowed: number } {
    let pointsScored = 0;
    let pointsAllowed = 0;

    matches.forEach((match) => {
      if (match.team1.playerNames?.join(" & ") === team.teamName) {
        pointsScored += match.team1.score || 0;
        pointsAllowed += match.team2.score || 0;
      } else if (match.team2.playerNames?.join(" & ") === team.teamName) {
        pointsScored += match.team2.score || 0;
        pointsAllowed += match.team1.score || 0;
      }
    });

    return { pointsScored, pointsAllowed };
  }

  private static getTeamAdvancement(
    team: any,
    bracketMatches: any[],
  ): string | undefined {
    if (bracketMatches.length === 0) return undefined;

    const lastMatch = bracketMatches
      .filter((m) => m.status === "completed" && this.isTeamWinner(team, m))
      .sort(
        (a, b) =>
          new Date(b.completedDate || 0).getTime() -
          new Date(a.completedDate || 0).getTime(),
      )[0];

    if (!lastMatch) return undefined;

    const advancementMap: Record<string, string> = {
      quarterfinal: "Semi Finals",
      semifinal: "Championship",
      final: "Champion",
    };

    return advancementMap[lastMatch.round];
  }

  private static calculatePerformanceGrade(
    winPercentage: number,
    pointDiff: number,
    gamesPlayed: number,
  ): string {
    if (gamesPlayed === 0) return "N/A";

    let score = winPercentage * 100;

    // Bonus for positive point differential
    if (pointDiff > 0) score += Math.min(pointDiff / gamesPlayed, 10);

    if (score >= 80) return "A";
    if (score >= 70) return "B";
    if (score >= 60) return "C";
    if (score >= 50) return "D";
    return "F";
  }

  private static calculateMatchSummary(matches: any[]) {
    const roundRobinMatches = matches.filter((m) => m.round === "round-robin");
    const bracketMatches = matches.filter((m) =>
      ["quarterfinal", "semifinal", "final"].includes(m.round),
    );

    return {
      roundRobin: {
        total: roundRobinMatches.length,
        completed: roundRobinMatches.filter((m) => m.status === "completed")
          .length,
        inProgress: roundRobinMatches.filter((m) => m.status === "in_progress")
          .length,
      },
      bracket: {
        total: bracketMatches.length,
        completed: bracketMatches.filter((m) => m.status === "completed")
          .length,
        inProgress: bracketMatches.filter((m) => m.status === "in_progress")
          .length,
      },
    };
  }

  private static determineCurrentPhase(
    matches: any[],
    tournamentStatus: string,
  ): { currentPhase: string; currentRound?: string } {
    if (tournamentStatus === "completed") {
      return { currentPhase: "completed" };
    }

    const rrMatches = matches.filter((m) => m.round === "round-robin");
    const bracketMatches = matches.filter((m) =>
      ["quarterfinal", "semifinal", "final"].includes(m.round),
    );

    if (bracketMatches.length > 0) {
      // In bracket phase
      const activeRound =
        bracketMatches.find((m) => m.status === "in_progress")?.round ||
        bracketMatches.filter((m) => m.status === "scheduled")[0]?.round ||
        "final";

      return { currentPhase: "bracket", currentRound: activeRound };
    }

    if (rrMatches.length > 0) {
      return { currentPhase: "round_robin", currentRound: "round-robin" };
    }

    return { currentPhase: "setup" };
  }

  // Real-time update method for when matches are completed
  static async updateLiveStats(matchId: string): Promise<void> {
    try {
      const match = await Match.findById(matchId);
      if (!match || match.status !== "completed") return;

      console.log(`Updating live stats for tournament ${match.tournamentId}`);

      // Broadcast an event so SSE/WebSocket subscribers can refresh
      try {
        const { eventBus } = await import("./EventBus");
        eventBus.emitTournament(match.tournamentId.toString(), "stats:update", {
          matchId,
        });
      } catch {}
    } catch (error) {
      console.error("Error updating live stats:", error);
    }
  }

  // Aggregate per-player points and win/loss within a tournament from playerScores
  static async calculatePlayerStatsForTournament(tournamentId: string): Promise<
    Array<{
      playerId: string;
      playerName?: string;
      totalPoints: number;
      matchesWithPoints: number;
      wins: number;
      losses: number;
    }>
  > {
    const mongoose = await import("mongoose");
    const tid = new mongoose.Types.ObjectId(tournamentId);
    const matches = await Match.aggregate([
      { $match: { tournamentId: tid } },
      {
        $project: {
          winner: 1,
          team1: 1,
          team2: 1,
          playerScoresCombined: {
            $concatArrays: [
              { $ifNull: ["$team1.playerScores", []] },
              { $ifNull: ["$team2.playerScores", []] },
            ],
          },
        },
      },
      { $unwind: "$playerScoresCombined" },
      {
        $addFields: {
          scoredOnTeam: {
            $cond: [
              {
                $in: [
                  "$playerScoresCombined.playerId",
                  { $ifNull: ["$team1.playerScores.playerId", []] },
                ],
              },
              "team1",
              "team2",
            ],
          },
        },
      },
      {
        $group: {
          _id: "$playerScoresCombined.playerId",
          playerName: { $last: "$playerScoresCombined.playerName" },
          totalPoints: {
            $sum: { $ifNull: ["$playerScoresCombined.score", 0] },
          },
          matchesWithPoints: { $sum: 1 },
          wins: {
            $sum: { $cond: [{ $eq: ["$winner", "$scoredOnTeam"] }, 1, 0] },
          },
          losses: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$winner", null] },
                    { $ne: ["$winner", "$scoredOnTeam"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { totalPoints: -1, wins: -1 } },
    ]);

    return matches.map((m: any) => ({
      playerId: m._id.toString(),
      playerName: m.playerName,
      totalPoints: m.totalPoints || 0,
      matchesWithPoints: m.matchesWithPoints || 0,
      wins: m.wins || 0,
      losses: m.losses || 0,
    }));
  }
}
