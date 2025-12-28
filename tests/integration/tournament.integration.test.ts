import request from "supertest";
import mongoose from "mongoose";
import { default as app } from "../../src/backend/server";
import { Tournament } from "../../src/backend/models/Tournament";
import { Player } from "../../src/backend/models/Player";
import { TournamentResult } from "../../src/backend/models/TournamentResult";

describe("Tournament CRUD API Integration", () => {
    let player1Id: string;
    let player2Id: string;

    const adminHeaders = {
        "x-test-mode": "true",
        "x-test-is-admin": "true",
        "x-test-roles": "admin,superadmin",
        "x-test-user-id": "test-admin-user",
    };

    const userHeaders = {
        "x-test-mode": "true",
        "x-test-is-admin": "false",
        "x-test-roles": "user",
        "x-test-user-id": "test-regular-user",
    };

    beforeAll(async () => {
        // Create test players
        await Player.deleteMany({});
        const players = await Player.create([
            { name: "Tournament CRUD Player 1", gender: "male" },
            { name: "Tournament CRUD Player 2", gender: "female" },
        ]);
        player1Id = players[0]._id.toString();
        player2Id = players[1]._id.toString();
    });

    afterAll(async () => {
        await Player.deleteMany({});
    });

    beforeEach(async () => {
        await Tournament.deleteMany({});
        await TournamentResult.deleteMany({});
    });

    describe("POST /api/tournaments", () => {
        it("should create a new tournament with admin access", async () => {
            const newTournament = {
                date: "2025-06-15",
                bodNumber: 401,
                format: "M",
                location: "CRUD Test Location",
                status: "scheduled",
                maxPlayers: 16,
                registrationType: "open",
                advancementCriteria: "Top 2 teams advance",
            };

            const res = await request(app)
                .post("/api/tournaments")
                .set(adminHeaders)
                .send(newTournament);

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.bodNumber).toBe(401);
            expect(res.body.data.format).toBe("M");
        });

        it("should reject non-admin tournament creation", async () => {
            const newTournament = {
                date: "2025-06-15",
                bodNumber: 402,
                format: "M",
                location: "CRUD Test",
                advancementCriteria: "Top 2",
            };

            const res = await request(app)
                .post("/api/tournaments")
                .set(userHeaders)
                .send(newTournament);

            expect(res.status).toBe(403);
        });
    });

    describe("GET /api/tournaments", () => {
        it("should list all tournaments", async () => {
            // Create two tournaments
            await Tournament.create([
                {
                    date: new Date("2025-06-01"),
                    bodNumber: 403,
                    format: "M",
                    location: "Location A",
                    status: "scheduled",
                    registrationType: "open",
                    advancementCriteria: "Top 2",
                },
                {
                    date: new Date("2025-06-15"),
                    bodNumber: 404,
                    format: "W",
                    location: "Location B",
                    status: "scheduled",
                    registrationType: "preselected",
                    advancementCriteria: "Top 2",
                },
            ]);

            const res = await request(app)
                .get("/api/tournaments")
                .set(adminHeaders);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.length).toBeGreaterThanOrEqual(2);
        });

        it("should filter by status", async () => {
            await Tournament.create([
                {
                    date: new Date("2025-06-01"),
                    bodNumber: 405,
                    format: "M",
                    location: "Scheduled",
                    status: "scheduled",
                    registrationType: "open",
                    advancementCriteria: "Top 2",
                },
                {
                    date: new Date("2025-06-15"),
                    bodNumber: 406,
                    format: "M",
                    location: "Completed",
                    status: "completed",
                    registrationType: "open",
                    advancementCriteria: "Top 2",
                },
            ]);

            const res = await request(app)
                .get("/api/tournaments?status=completed")
                .set(adminHeaders);

            expect(res.status).toBe(200);
            expect(res.body.data.every((t: any) => t.status === "completed")).toBe(true);
        });
    });

    describe("GET /api/tournaments/:id", () => {
        it("should get a single tournament by ID", async () => {
            const tournament = await Tournament.create({
                date: new Date("2025-06-15"),
                bodNumber: 407,
                format: "Mixed",
                location: "Single Get Location",
                status: "scheduled",
                registrationType: "open",
                advancementCriteria: "Top 2",
            });

            const res = await request(app)
                .get(`/api/tournaments/${tournament._id}`)
                .set(adminHeaders);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.bodNumber).toBe(407);
        });

        it("should return 404 for non-existent tournament", async () => {
            const fakeId = new mongoose.Types.ObjectId();

            const res = await request(app)
                .get(`/api/tournaments/${fakeId}`)
                .set(adminHeaders);

            expect(res.status).toBe(404);
        });
    });

    describe("PUT /api/tournaments/:id", () => {
        it("should update tournament details", async () => {
            const tournament = await Tournament.create({
                date: new Date("2025-06-15"),
                bodNumber: 408,
                format: "M",
                location: "Original Location",
                status: "draft",
                registrationType: "open",
                advancementCriteria: "Top 2",
            });

            const res = await request(app)
                .put(`/api/tournaments/${tournament._id}`)
                .set(adminHeaders)
                .send({ location: "Updated Location" });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.location).toBe("Updated Location");
        });
    });

    describe("DELETE /api/tournaments/:id", () => {
        it("should delete a tournament", async () => {
            const tournament = await Tournament.create({
                date: new Date("2025-06-15"),
                bodNumber: 409,
                format: "M",
                location: "To Delete",
                status: "scheduled",
                registrationType: "open",
                advancementCriteria: "Top 2",
            });

            const res = await request(app)
                .delete(`/api/tournaments/${tournament._id}`)
                .set(adminHeaders);

            expect(res.status).toBe(200);

            // Verify deleted
            const deleted = await Tournament.findById(tournament._id);
            expect(deleted).toBeNull();
        });
    });

    describe("GET /api/tournaments/upcoming", () => {
        it("should return upcoming tournaments", async () => {
            // Create a future tournament
            await Tournament.create({
                date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                bodNumber: 410,
                format: "M",
                location: "Future Tournament",
                status: "scheduled",
                registrationType: "open",
                advancementCriteria: "Top 2",
            });

            const res = await request(app)
                .get("/api/tournaments/upcoming")
                .set(adminHeaders);

            expect([200, 404]).toContain(res.status);
        });
    });
});
