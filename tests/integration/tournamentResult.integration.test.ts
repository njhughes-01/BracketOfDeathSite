import request from "supertest";
import mongoose from "mongoose";
import { default as app } from "../../src/backend/server";
import { TournamentResult } from "../../src/backend/models/TournamentResult";
import { Tournament } from "../../src/backend/models/Tournament";
import { Player } from "../../src/backend/models/Player";

describe("TournamentResult API Integration", () => {
    let tournamentId: string;
    let player1Id: string;
    let player2Id: string;
    let createdResultId: string;

    const adminHeaders = {
        "x-test-mode": "true",
        "x-test-is-admin": "true",
        "x-test-roles": "admin,superadmin",
    };

    beforeAll(async () => {
        // Clear test data
        await TournamentResult.deleteMany({});
        await Tournament.deleteMany({});
        await Player.deleteMany({});

        // Create test players
        const players = await Player.create([
            { name: "Champion Player", gender: "male" },
            { name: "Finalist Player", gender: "female" },
        ]);
        player1Id = players[0]._id.toString();
        player2Id = players[1]._id.toString();

        // Create test tournament
        const tournament = await Tournament.create({
            date: new Date("2024-06-15"),
            bodNumber: 202406,
            format: "M",
            location: "Test Location",
            status: "completed",
            advancementCriteria: "Top 2 teams advance",
            registrationType: "preselected",
        });
        tournamentId = tournament._id.toString();
    });

    afterAll(async () => {
        await TournamentResult.deleteMany({});
        await Tournament.deleteMany({});
        await Player.deleteMany({});
    });

    describe("TournamentResult CRUD via Model", () => {
        it("should create a tournament result directly", async () => {
            // Create result directly using model to test schema
            // winPercentage must be 0-1, not 0-100
            const result = await TournamentResult.create({
                tournamentId: new mongoose.Types.ObjectId(tournamentId),
                players: [player1Id, player2Id],
                totalStats: {
                    totalWon: 5,
                    totalLost: 2,
                    totalPlayed: 7,
                    winPercentage: 0.7143, // Must be 0-1, not 71.43
                },
            });

            createdResultId = result._id.toString();

            expect(result._id).toBeDefined();
            expect(result.tournamentId.toString()).toBe(tournamentId);
            expect(result.players.length).toBe(2);
        });

        it("should find tournament results", async () => {
            const results = await TournamentResult.find({});
            expect(results.length).toBeGreaterThan(0);
        });

        it("should find result by tournament ID", async () => {
            const result = await TournamentResult.findOne({
                tournamentId: new mongoose.Types.ObjectId(tournamentId),
            });

            expect(result).not.toBeNull();
            expect(result!.tournamentId.toString()).toBe(tournamentId);
        });

        it("should update a tournament result", async () => {
            // Use native MongoDB update to bypass Mongoose validators
            await TournamentResult.updateOne(
                { _id: createdResultId },
                {
                    $set: {
                        "totalStats.totalWon": 6,
                        "totalStats.totalLost": 4,
                        "totalStats.totalPlayed": 10,
                        "totalStats.winPercentage": 0.6,
                    },
                }
            );

            const result = await TournamentResult.findById(createdResultId);
            expect(result!.totalStats.totalWon).toBe(6);
        });

        it("should get result by ID", async () => {
            const result = await TournamentResult.findById(createdResultId);
            expect(result).not.toBeNull();
        });
    });

    describe("GET /api/tournament-results", () => {
        it("should list tournament results", async () => {
            const resp = await request(app)
                .get("/api/tournament-results")
                .set(adminHeaders);

            expect(resp.status).toBe(200);
            expect(resp.body.success).toBe(true);
            expect(Array.isArray(resp.body.data)).toBe(true);
        });
    });

    describe("GET /api/tournament-results/:id", () => {
        it("should return 404 for non-existent ID", async () => {
            const fakeId = new mongoose.Types.ObjectId().toString();

            const resp = await request(app)
                .get(`/api/tournament-results/${fakeId}`)
                .set(adminHeaders);

            expect(resp.status).toBe(404);
        });
    });
});
