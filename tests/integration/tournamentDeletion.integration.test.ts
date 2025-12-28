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
            // Create a tournament
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

            // Create associated matches with correct field name and winner enum
            await Match.create([
                {
                    tournamentId: tournament._id, // Correct field name
                    round: "RR_R1",
                    roundNumber: 1,
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
                    winner: "team1", // Correct enum value
                },
            ]);

            const tournamentId = tournament._id.toString();
            const adminUserId = "test-admin-user";

            // Delete tournament with required adminUserId
            const result = await deletionService.deleteTournament(tournamentId, adminUserId);

            expect(result.success).toBe(true);

            // Verify tournament is deleted
            const deleted = await Tournament.findById(tournamentId);
            expect(deleted).toBeNull();

            // Verify matches are deleted
            const matches = await Match.find({ tournamentId: tournament._id });
            expect(matches.length).toBe(0);
        });

        it("should handle non-existent tournament gracefully", async () => {
            const fakeId = new mongoose.Types.ObjectId().toString();
            const adminUserId = "test-admin-user";

            // Should throw for non-existent tournament
            await expect(
                deletionService.deleteTournament(fakeId, adminUserId)
            ).rejects.toThrow();
        });
    });

    describe("Direct Model Operations", () => {
        it("should delete tournament matches directly", async () => {
            const tournament = await Tournament.create({
                date: new Date("2024-06-15"),
                bodNumber: 301,
                format: "M",
                location: "Summary Test",
                status: "scheduled",
                registrationType: "preselected",
                advancementCriteria: "Top 2",
            });

            // Create matches with correct field name
            await Match.create({
                tournamentId: tournament._id, // Correct field name
                round: "RR_R1",
                roundNumber: 1,
                matchNumber: 1,
                team1: {
                    players: [player1Id],
                    playerNames: ["Player 1"],
                    score: 0,
                },
                team2: {
                    players: [player2Id],
                    playerNames: ["Player 2"],
                    score: 0,
                },
                status: "scheduled",
            });

            // Verify match exists
            const before = await Match.find({ tournamentId: tournament._id });
            expect(before.length).toBe(1);

            // Delete matches
            await Match.deleteMany({ tournamentId: tournament._id });

            // Verify deleted
            const after = await Match.find({ tournamentId: tournament._id });
            expect(after.length).toBe(0);
        });
    });
});
