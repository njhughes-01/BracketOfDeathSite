import mongoose from "mongoose";
import { Match } from "../../../src/backend/models/Match";
import { Tournament } from "../../../src/backend/models/Tournament";
import { Player } from "../../../src/backend/models/Player";

describe("Match Model", () => {
    let tournamentId: mongoose.Types.ObjectId;
    let player1Id: mongoose.Types.ObjectId;
    let player2Id: mongoose.Types.ObjectId;
    let player3Id: mongoose.Types.ObjectId;
    let player4Id: mongoose.Types.ObjectId;

    beforeAll(async () => {
        await mongoose.connect(
            process.env.MONGODB_URI || "mongodb://localhost:27017/test"
        );
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        await Match.deleteMany({});
        await Tournament.deleteMany({});
        await Player.deleteMany({});

        // Create test players
        const players = await Player.create([
            { name: "Player One" },
            { name: "Player Two" },
            { name: "Player Three" },
            { name: "Player Four" },
        ]);
        player1Id = players[0]._id;
        player2Id = players[1]._id;
        player3Id = players[2]._id;
        player4Id = players[3]._id;

        // Create test tournament
        const tournament = await Tournament.create({
            date: new Date(),
            bodNumber: 1,
            format: "M",
            location: "Test Court",
            advancementCriteria: "Top 2 advance",
            registrationType: "open",
        });
        tournamentId = tournament._id;
    });

    describe("Validation", () => {
        it("should create a valid match with minimal data", async () => {
            const match = await Match.create({
                tournamentId,
                matchNumber: 1,
                round: "RR_R1",
                roundNumber: 1,
                team1: {
                    players: [player1Id, player2Id],
                    playerNames: ["Player One", "Player Two"],
                },
                team2: {
                    players: [player3Id, player4Id],
                    playerNames: ["Player Three", "Player Four"],
                },
            });

            expect(match.tournamentId.toString()).toBe(tournamentId.toString());
            expect(match.matchNumber).toBe(1);
            expect(match.round).toBe("RR_R1");
            expect(match.status).toBe("scheduled");
            expect(match.team1.score).toBe(0);
            expect(match.team2.score).toBe(0);
        });

        it("should require tournamentId", async () => {
            const match = new Match({
                matchNumber: 1,
                round: "RR_R1",
                roundNumber: 1,
                team1: {
                    players: [player1Id],
                    playerNames: ["Player One"],
                },
                team2: {
                    players: [player2Id],
                    playerNames: ["Player Two"],
                },
            });

            await expect(match.save()).rejects.toThrow("required");
        });

        it("should validate round enum values", async () => {
            const match = new Match({
                tournamentId,
                matchNumber: 1,
                round: "invalid_round",
                roundNumber: 1,
                team1: {
                    players: [player1Id],
                    playerNames: ["Player One"],
                },
                team2: {
                    players: [player2Id],
                    playerNames: ["Player Two"],
                },
            });

            await expect(match.save()).rejects.toThrow("Round must be one of");
        });

        it("should require at least 1 player per team", async () => {
            const match = new Match({
                tournamentId,
                matchNumber: 1,
                round: "RR_R1",
                roundNumber: 1,
                team1: {
                    players: [],
                    playerNames: [],
                },
                team2: {
                    players: [player2Id],
                    playerNames: ["Player Two"],
                },
            });

            await expect(match.save()).rejects.toThrow("Team must have 1 or 2 players");
        });

        it("should require player names to match player count", async () => {
            const match = new Match({
                tournamentId,
                matchNumber: 1,
                round: "RR_R1",
                roundNumber: 1,
                team1: {
                    players: [player1Id, player2Id],
                    playerNames: ["Player One"], // Missing second name
                },
                team2: {
                    players: [player3Id],
                    playerNames: ["Player Three"],
                },
            });

            await expect(match.save()).rejects.toThrow("Player names must match player count");
        });

        it("should not allow negative scores", async () => {
            const match = new Match({
                tournamentId,
                matchNumber: 1,
                round: "RR_R1",
                roundNumber: 1,
                team1: {
                    players: [player1Id],
                    playerNames: ["Player One"],
                    score: -1,
                },
                team2: {
                    players: [player2Id],
                    playerNames: ["Player Two"],
                },
            });

            await expect(match.save()).rejects.toThrow("Score cannot be negative");
        });
    });

    describe("Score and Winner Validation", () => {
        it("should auto-determine winner based on scores", async () => {
            const match = await Match.create({
                tournamentId,
                matchNumber: 1,
                round: "RR_R1",
                roundNumber: 1,
                team1: {
                    players: [player1Id],
                    playerNames: ["Player One"],
                    score: 11,
                },
                team2: {
                    players: [player2Id],
                    playerNames: ["Player Two"],
                    score: 5,
                },
            });

            expect(match.winner).toBe("team1");
        });

        it("should reject completed match with mismatched winner", async () => {
            const match = new Match({
                tournamentId,
                matchNumber: 1,
                round: "RR_R1",
                roundNumber: 1,
                team1: {
                    players: [player1Id],
                    playerNames: ["Player One"],
                    score: 5,
                },
                team2: {
                    players: [player2Id],
                    playerNames: ["Player Two"],
                    score: 11,
                },
                winner: "team1", // Wrong - team2 has higher score
                status: "completed",
            });

            await expect(match.save()).rejects.toThrow("Winner must be the team with the higher score");
        });

        it("should reject invalid tennis score without admin override", async () => {
            const match = new Match({
                tournamentId,
                matchNumber: 1,
                round: "RR_R1",
                roundNumber: 1,
                team1: {
                    players: [player1Id],
                    playerNames: ["Player One"],
                    score: 11,
                },
                team2: {
                    players: [player2Id],
                    playerNames: ["Player Two"],
                    score: 10, // Invalid - must win by 2 if over 10-10
                },
                status: "completed",
            });

            await expect(match.save()).rejects.toThrow();
        });

        it("should allow unusual score with admin override", async () => {
            const match = await Match.create({
                tournamentId,
                matchNumber: 1,
                round: "RR_R1",
                roundNumber: 1,
                team1: {
                    players: [player1Id],
                    playerNames: ["Player One"],
                    score: 15,
                },
                team2: {
                    players: [player2Id],
                    playerNames: ["Player Two"],
                    score: 13,
                },
                status: "completed",
                adminOverride: {
                    reason: "Extended tiebreaker game",
                    authorizedBy: "Admin User",
                },
            });

            expect(match.status).toBe("completed");
            expect(match.winner).toBe("team1");
        });
    });

    describe("Virtuals", () => {
        it("should display match description", async () => {
            const match = await Match.create({
                tournamentId,
                matchNumber: 1,
                round: "RR_R1",
                roundNumber: 1,
                team1: {
                    players: [player1Id, player2Id],
                    playerNames: ["Player One", "Player Two"],
                },
                team2: {
                    players: [player3Id, player4Id],
                    playerNames: ["Player Three", "Player Four"],
                },
            });

            expect(match.description).toBe("Player One & Player Two vs Player Three & Player Four");
        });

        it("should display score for completed matches", async () => {
            const match = await Match.create({
                tournamentId,
                matchNumber: 1,
                round: "RR_R1",
                roundNumber: 1,
                team1: {
                    players: [player1Id],
                    playerNames: ["Player One"],
                    score: 11,
                },
                team2: {
                    players: [player2Id],
                    playerNames: ["Player Two"],
                    score: 7,
                },
                status: "completed",
            });

            expect(match.scoreDisplay).toBe("11-7");
        });
    });

    describe("Indexes", () => {
        it("should enforce unique tournament + matchNumber constraint", async () => {
            await Match.create({
                tournamentId,
                matchNumber: 1,
                round: "RR_R1",
                roundNumber: 1,
                team1: {
                    players: [player1Id],
                    playerNames: ["Player One"],
                },
                team2: {
                    players: [player2Id],
                    playerNames: ["Player Two"],
                },
            });

            const duplicate = new Match({
                tournamentId,
                matchNumber: 1, // Same match number in same tournament
                round: "RR_R2",
                roundNumber: 2,
                team1: {
                    players: [player3Id],
                    playerNames: ["Player Three"],
                },
                team2: {
                    players: [player4Id],
                    playerNames: ["Player Four"],
                },
            });

            await expect(duplicate.save()).rejects.toThrow();
        });
    });
});
