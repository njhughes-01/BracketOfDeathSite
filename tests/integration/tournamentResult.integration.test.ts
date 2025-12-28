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
    let player3Id: string;
    let player4Id: string;

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
            { name: "Champion Player" },
            { name: "Finalist Player" },
            { name: "Third Place Player" },
            { name: "Fourth Place Player" },
        ]);
        player1Id = players[0]._id.toString();
        player2Id = players[1]._id.toString();
        player3Id = players[2]._id.toString();
        player4Id = players[3]._id.toString();

        // Create test tournament
        const tournament = await Tournament.create({
            date: new Date("2024-06-15"),
            bodNumber: 100,
            format: "M",
            location: "Test Location",
            status: "completed",
            advancementCriteria: "Top 2 teams advance",
            registrationType: "admin",
        });
        tournamentId = tournament._id.toString();
    });

    afterAll(async () => {
        await TournamentResult.deleteMany({});
        await Tournament.deleteMany({});
        await Player.deleteMany({});
    });

    describe("POST /api/tournament-results", () => {
        it("should create a tournament result", async () => {
            const resultData = {
                tournament: tournamentId,
                champion: {
                    team: [
                        { player: player1Id, playerName: "Champion Player" },
                        { player: player2Id, playerName: "Finalist Player" },
                    ],
                },
                finalist: {
                    team: [
                        { player: player3Id, playerName: "Third Place Player" },
                        { player: player4Id, playerName: "Fourth Place Player" },
                    ],
                },
                totalTeams: 8,
                totalGames: 15,
                roundRobinGames: 12,
                bracketGames: 3,
                finalScore: "11-7",
            };

            const resp = await request(app)
                .post("/api/tournament-results")
                .set(adminHeaders)
                .send(resultData);

            expect(resp.status).toBe(201);
            expect(resp.body.success).toBe(true);
            expect(resp.body.data.tournament.toString()).toBe(tournamentId);
            expect(resp.body.data.champion.team.length).toBe(2);
            expect(resp.body.data.totalTeams).toBe(8);
        });

        it("should reject duplicate tournament results", async () => {
            const resultData = {
                tournament: tournamentId,
                champion: {
                    team: [{ player: player1Id, playerName: "Champion Player" }],
                },
                finalist: {
                    team: [{ player: player2Id, playerName: "Finalist Player" }],
                },
            };

            const resp = await request(app)
                .post("/api/tournament-results")
                .set(adminHeaders)
                .send(resultData);

            // Should fail because we already created a result for this tournament
            expect(resp.status).toBe(400);
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
            expect(resp.body.data.length).toBeGreaterThan(0);
        });

        it("should filter by year", async () => {
            const resp = await request(app)
                .get("/api/tournament-results?year=2024")
                .set(adminHeaders);

            expect(resp.status).toBe(200);
            expect(resp.body.success).toBe(true);
        });
    });

    describe("GET /api/tournament-results/:id", () => {
        it("should get a specific tournament result", async () => {
            // First get the list to find an ID
            const listResp = await request(app)
                .get("/api/tournament-results")
                .set(adminHeaders);

            const resultId = listResp.body.data[0]._id;

            const resp = await request(app)
                .get(`/api/tournament-results/${resultId}`)
                .set(adminHeaders);

            expect(resp.status).toBe(200);
            expect(resp.body.success).toBe(true);
            expect(resp.body.data._id.toString()).toBe(resultId);
        });

        it("should return 404 for non-existent ID", async () => {
            const fakeId = new mongoose.Types.ObjectId().toString();

            const resp = await request(app)
                .get(`/api/tournament-results/${fakeId}`)
                .set(adminHeaders);

            expect(resp.status).toBe(404);
        });
    });

    describe("PUT /api/tournament-results/:id", () => {
        it("should update a tournament result", async () => {
            // First get the list to find an ID
            const listResp = await request(app)
                .get("/api/tournament-results")
                .set(adminHeaders);

            const resultId = listResp.body.data[0]._id;

            const resp = await request(app)
                .put(`/api/tournament-results/${resultId}`)
                .set(adminHeaders)
                .send({
                    totalTeams: 16,
                    notes: "Updated notes",
                });

            expect(resp.status).toBe(200);
            expect(resp.body.success).toBe(true);
            expect(resp.body.data.totalTeams).toBe(16);
        });
    });

    describe("GET /api/tournament-results/by-tournament/:tournamentId", () => {
        it("should get result by tournament ID", async () => {
            const resp = await request(app)
                .get(`/api/tournament-results/by-tournament/${tournamentId}`)
                .set(adminHeaders);

            expect(resp.status).toBe(200);
            expect(resp.body.success).toBe(true);
            expect(resp.body.data.tournament.toString()).toBe(tournamentId);
        });
    });

    describe("GET /api/tournament-results/stats/player/:playerId", () => {
        it("should get player statistics", async () => {
            const resp = await request(app)
                .get(`/api/tournament-results/stats/player/${player1Id}`)
                .set(adminHeaders);

            expect(resp.status).toBe(200);
            expect(resp.body.success).toBe(true);
        });
    });
});
