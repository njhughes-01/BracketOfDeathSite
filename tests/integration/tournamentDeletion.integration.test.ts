import mongoose from "mongoose";
import TournamentDeletionService from "../../src/backend/services/TournamentDeletionService";
import { Tournament } from "../../src/backend/models/Tournament";
import { Match } from "../../src/backend/models/Match";
import { TournamentResult } from "../../src/backend/models/TournamentResult";
import { Player } from "../../src/backend/models/Player";

describe("TournamentDeletionService Integration", () => {
    let player1Id: string;
    let player2Id: string;
    let deletionService: InstanceType<typeof TournamentDeletionService>;

    beforeAll(async () => {
        // Connect to MongoDB if not already connected
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(
                process.env.MONGODB_URI || "mongodb://localhost:27017/bod_test"
            );
        }

        // Create service instance
        deletionService = new TournamentDeletionService();

        // Create test players
        await Player.deleteMany({});
        const players = await Player.create([
            { name: "Deletion Test Player 1", gender: "male" },
            { name: "Deletion Test Player 2", gender: "female" },
        ]);
        player1Id = players[0]._id.toString();
        player2Id = players[1]._id.toString();
    });

    afterAll(async () => {
        await Player.deleteMany({});
    });

    beforeEach(async () => {
        // Clean up before each test
        await Match.deleteMany({});
        await TournamentResult.deleteMany({});
        await Tournament.deleteMany({});
    });

    describe("deleteTournament", () => {
        it("should delete tournament and all related data", async () => {
            // Create a tournament with matches and result - use "scheduled" status for deletion
            const tournament = await Tournament.create({
                date: new Date("2024-06-15"),
                bodNumber: 300,
                format: "M",
                location: "Deletion Test Location",
                status: "scheduled",
                maxPlayers: 8,
                registrationType: "preselected",
                advancementCriteria: "Top 2 teams advance",
            });

            // Create associated matches
            await Match.create([
                {
                    tournament: tournament._id,
                    round: "round-robin",
                    matchNumber: 1,
                    team1: {
                        players: [player1Id],
                        playerNames: ["Deletion Test Player 1"],
                        score: 11,
                    },
                    team2: {
                        players: [player2Id],
                        playerNames: ["Deletion Test Player 2"],
                        score: 8,
                    },
                    status: "completed",
                    winner: 1,
                },
            ]);

            // Create tournament result
            await TournamentResult.create({
                tournament: tournament._id,
                champion: {
                    team: [{ player: player1Id, playerName: "Deletion Test Player 1" }],
                },
                finalist: {
                    team: [{ player: player2Id, playerName: "Deletion Test Player 2" }],
                },
                totalTeams: 4,
            });

            // Perform deletion
            const result = await deletionService.deleteTournament(
                tournament._id.toString(),
                "test-admin-user"
            );

            expect(result.success).toBe(true);
            expect(result.operation.status).toBe("completed");

            // Verify tournament is deleted
            expect(await Tournament.countDocuments({ _id: tournament._id })).toBe(0);
        });

        it("should return error for non-existent tournament", async () => {
            const fakeId = new mongoose.Types.ObjectId().toString();

            await expect(
                deletionService.deleteTournament(fakeId, "test-admin-user")
            ).rejects.toThrow();
        });

        it("should handle tournament with no matches gracefully", async () => {
            const tournament = await Tournament.create({
                date: new Date("2024-06-15"),
                bodNumber: 301,
                format: "M",
                location: "Empty Tournament",
                status: "scheduled",
                maxPlayers: 8,
                registrationType: "preselected",
                advancementCriteria: "Top 2 teams advance",
            });

            const result = await deletionService.deleteTournament(
                tournament._id.toString(),
                "test-admin-user"
            );

            expect(result.success).toBe(true);
            expect(await Tournament.countDocuments({ _id: tournament._id })).toBe(0);
        });
    });

    describe("getOperationSummary", () => {
        it("should provide operation summary after deletion", async () => {
            const tournament = await Tournament.create({
                date: new Date("2024-06-15"),
                bodNumber: 302,
                format: "M",
                location: "Summary Test",
                status: "scheduled",
                registrationType: "preselected",
                advancementCriteria: "Top 2 teams advance",
            });

            const result = await deletionService.deleteTournament(
                tournament._id.toString(),
                "test-admin-user"
            );

            const summary = deletionService.getOperationSummary(result.operation);

            expect(summary).toBeDefined();
            expect(summary.correlationId).toBeDefined();
            expect(summary.tournamentId).toBe(tournament._id.toString());
        });
    });
});
