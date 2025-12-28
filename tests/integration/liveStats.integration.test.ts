import mongoose from "mongoose";
import { LiveStatsService } from "../../src/backend/services/LiveStatsService";
import { Tournament } from "../../src/backend/models/Tournament";
import { Player } from "../../src/backend/models/Player";
import { Match } from "../../src/backend/models/Match";

describe("LiveStatsService Integration", () => {
    let player1Id: string;
    let player2Id: string;
    let player3Id: string;
    let player4Id: string;

    beforeAll(async () => {
        // Create test players with known stats
        await Player.deleteMany({});
        const players = await Player.create([
            { name: "Stats Player 1", gender: "male", wins: 10, losses: 2 },
            { name: "Stats Player 2", gender: "female", wins: 8, losses: 4 },
            { name: "Stats Player 3", gender: "male", wins: 5, losses: 5 },
            { name: "Stats Player 4", gender: "female", wins: 3, losses: 7 },
        ]);
        player1Id = players[0]._id.toString();
        player2Id = players[1]._id.toString();
        player3Id = players[2]._id.toString();
        player4Id = players[3]._id.toString();
    });

    afterAll(async () => {
        await Player.deleteMany({});
    });

    beforeEach(async () => {
        await Tournament.deleteMany({});
        await Match.deleteMany({});
    });

    describe("calculateLiveTournamentStats", () => {
        it("should calculate live statistics for a tournament", async () => {
            const tournament = await Tournament.create({
                date: new Date("2025-06-15"),
                bodNumber: 600,
                format: "Mixed",
                location: "Stats Location",
                status: "active",
                maxPlayers: 8,
                registrationType: "preselected",
                advancementCriteria: "Top 2",
            });

            // Create some completed matches
            await Match.create([
                {
                    tournament: tournament._id,
                    round: "round-robin",
                    matchNumber: 1,
                    team1: {
                        players: [player1Id],
                        playerNames: ["Stats Player 1"],
                        score: 11,
                    },
                    team2: {
                        players: [player2Id],
                        playerNames: ["Stats Player 2"],
                        score: 6,
                    },
                    status: "completed",
                    winner: 1,
                },
            ]);

            // Calculate live stats
            const stats = await LiveStatsService.calculateLiveTournamentStats(
                tournament._id.toString()
            );

            expect(stats).toBeDefined();
            expect(stats?.tournamentId).toBe(tournament._id.toString());
        });

        it("should return null for non-existent tournament", async () => {
            const fakeId = new mongoose.Types.ObjectId().toString();
            const stats = await LiveStatsService.calculateLiveTournamentStats(fakeId);

            expect(stats).toBeNull();
        });
    });

    describe("calculatePlayerStatsForTournament", () => {
        it("should calculate player statistics for tournament", async () => {
            const tournament = await Tournament.create({
                date: new Date("2025-06-15"),
                bodNumber: 601,
                format: "M",
                location: "Player Stats",
                status: "active",
                registrationType: "preselected",
                advancementCriteria: "Top 2",
            });

            // Create matches with playerScores
            await Match.create([
                {
                    tournament: tournament._id,
                    round: "round-robin",
                    matchNumber: 1,
                    team1: {
                        players: [player1Id],
                        playerNames: ["Stats Player 1"],
                        score: 11,
                        playerScores: [{ playerId: player1Id, points: 11 }],
                    },
                    team2: {
                        players: [player2Id],
                        playerNames: ["Stats Player 2"],
                        score: 7,
                        playerScores: [{ playerId: player2Id, points: 7 }],
                    },
                    status: "completed",
                    winner: 1,
                },
            ]);

            const playerStats = await LiveStatsService.calculatePlayerStatsForTournament(
                tournament._id.toString()
            );

            expect(playerStats).toBeDefined();
            expect(Array.isArray(playerStats)).toBe(true);
        });
    });

    describe("updateLiveStats", () => {
        it("should update stats after match completion", async () => {
            const tournament = await Tournament.create({
                date: new Date("2025-06-15"),
                bodNumber: 602,
                format: "Mixed",
                location: "Update Test",
                status: "active",
                registrationType: "preselected",
                advancementCriteria: "Top 2",
            });

            const match = await Match.create({
                tournament: tournament._id,
                round: "round-robin",
                matchNumber: 1,
                team1: {
                    players: [player1Id],
                    playerNames: ["Stats Player 1"],
                    score: 11,
                },
                team2: {
                    players: [player2Id],
                    playerNames: ["Stats Player 2"],
                    score: 8,
                },
                status: "completed",
                winner: 1,
            });

            // This should not throw
            await expect(
                LiveStatsService.updateLiveStats(match._id.toString())
            ).resolves.not.toThrow();
        });
    });
});
