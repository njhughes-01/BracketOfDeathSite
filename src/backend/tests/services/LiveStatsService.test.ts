import { LiveStatsService } from "../../services/LiveStatsService";
import { Tournament } from "../../models/Tournament";
import { Match } from "../../models/Match";

// Mock Mongoose models
jest.mock("../../models/Tournament");
jest.mock("../../models/Match");

// Mock EventBus
jest.mock("../../services/EventBus", () => ({
    eventBus: {
        emitTournament: jest.fn()
    }
}));

import { eventBus } from "../../services/EventBus";

describe("LiveStatsService", () => {
    const tournId = "507f1f77bcf86cd799439011";

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("calculateLiveTournamentStats", () => {
        it("should return null if tournament not found", async () => {
            (Tournament.findById as jest.Mock).mockResolvedValue(null);
            const stats = await LiveStatsService.calculateLiveTournamentStats(tournId);
            expect(stats).toBeNull();
        });

        it("should calculate correct stats for a simple tournament", async () => {
            const mockTournament = {
                _id: tournId,
                status: "active",
                generatedTeams: [
                    { teamId: "t1", teamName: "Team A", players: [] },
                    { teamId: "t2", teamName: "Team B", players: [] }
                ]
            };

            const mockMatches = [
                {
                    status: "completed",
                    round: "round-robin",
                    team1: { playerNames: ["Team A"], score: 10 },
                    team2: { playerNames: ["Team B"], score: 5 },
                    winner: "team1"
                },
                {
                    status: "in-progress",
                    round: "round-robin",
                    team1: { playerNames: ["Team A"], score: 0 },
                    team2: { playerNames: ["Team B"], score: 0 }
                }
            ];

            (Tournament.findById as jest.Mock).mockResolvedValue(mockTournament);
            (Match.find as jest.Mock).mockResolvedValue(mockMatches);

            const stats = await LiveStatsService.calculateLiveTournamentStats(tournId);

            expect(stats).not.toBeNull();
            expect(stats?.totalTeams).toBe(2);
            expect(stats?.totalMatches).toBe(2);
            expect(stats?.completedMatches).toBe(1);
            expect(stats?.inProgressMatches).toBe(1);

            // Check Team A stats (Winner)
            const teamA = stats?.teamStandings.find(t => t.teamName === "Team A");
            expect(teamA?.matchesWon).toBe(1);
            expect(teamA?.pointsScored).toBe(10);
        });
    });

    describe("updateLiveStats", () => {
        it("should emit event when match is completed", async () => {
            const matchId = "match-1";
            (Match.findById as jest.Mock).mockResolvedValue({
                _id: matchId,
                status: "completed",
                tournamentId: tournId
            });

            await LiveStatsService.updateLiveStats(matchId);

            expect(eventBus.emitTournament).toHaveBeenCalledWith(
                tournId.toString(),
                "stats:update",
                { matchId }
            );
        });

        it("should not emit if match not completed", async () => {
            (Match.findById as jest.Mock).mockResolvedValue({
                status: "in-progress"
            });

            await LiveStatsService.updateLiveStats("match-1");

            expect(eventBus.emitTournament).not.toHaveBeenCalled();
        });
    });
});
