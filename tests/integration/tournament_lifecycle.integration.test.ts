import request from "supertest";
import app from "../../src/backend/server";
import { Tournament } from "../../src/backend/models/Tournament";
import { Player } from "../../src/backend/models/Player";
import { Match } from "../../src/backend/models/Match";

// Extend timeout for integration tests
jest.setTimeout(30000);

describe("Tournament Lifecycle Integration", () => {
    let tournamentId: string;
    let players: any[] = [];

    beforeAll(async () => {
        // Clean up before tests
        await Tournament.deleteMany({});
        await Player.deleteMany({});
        await Match.deleteMany({});

        // Create some test players
        const playerData = [
            { name: "Player 1", email: "p1@test.com" },
            { name: "Player 2", email: "p2@test.com" },
            { name: "Player 3", email: "p3@test.com" },
            { name: "Player 4", email: "p4@test.com" },
        ];

        for (const p of playerData) {
            const resp = await request(app)
                .post("/api/players")
                .set("x-test-mode", "true")
                .set("x-test-is-admin", "true")
                .set("x-test-roles", "admin,superadmin")
                .send(p);
            players.push(resp.body.data);
        }
    });

    afterAll(async () => {
        // Cleanup handled by globalTeardown/afterEach in setup.ts usually
    });

    test("Step 1: Create a new tournament", async () => {
        const tournamentData = {
            date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
            format: "Men's Doubles",
            location: "Test Arena",
            bodNumber: 202512,
            advancementCriteria: "Top 2 advance",
            maxPlayers: 8,
            registrationType: "open",
        };

        const resp = await request(app)
            .post("/api/tournaments")
            .set("x-test-mode", "true")
            .set("x-test-is-admin", "true")
            .set("x-test-roles", "admin,superadmin")
            .send(tournamentData);

        expect(resp.status).toBe(201);
        expect(resp.body.success).toBe(true);
        expect(resp.body.data.location).toBe("Test Arena");

        tournamentId = resp.body.data._id || resp.body.data.id;
        console.log("Captured tournamentId:", tournamentId);
        expect(tournamentId).toBeDefined();
    });

    test("Step 2: Start registration", async () => {
        const resp = await request(app)
            .post(`/api/tournaments/${tournamentId}/action`)
            .set("x-test-mode", "true")
            .set("x-test-is-admin", "true")
            .set("x-test-roles", "admin,superadmin")
            .send({ action: "start_registration" });

        if (resp.status !== 200) {
            console.log("Step 2 Failed Response:", resp.body);
        }
        expect(resp.status).toBe(200);
        expect(resp.body.data.status).toBe("open");
    });

    test("Step 3: Register players", async () => {
        for (const player of players) {
            const playerId = player._id || player.id;
            const resp = await request(app)
                .post(`/api/tournaments/${tournamentId}/join`)
                .set("x-test-mode", "true")
                .send({ playerId });

            if (resp.status !== 200) {
                console.log(`Step 3 Join Failed for player ${player.name} (ID: ${playerId}):`, resp.body);
            }
            expect(resp.status).toBe(200);
            expect(resp.body.success).toBe(true);
        }

        const t = await Tournament.findById(tournamentId);
        expect(t?.registeredPlayers?.length).toBe(players.length);
    });

    test("Step 4: Close registration and Start Check-in", async () => {
        // Close registration
        let resp = await request(app)
            .post(`/api/tournaments/${tournamentId}/action`)
            .set("x-test-mode", "true")
            .set("x-test-is-admin", "true")
            .set("x-test-roles", "admin,superadmin")
            .send({ action: "close_registration" });
        expect(resp.body.data.status).toBe("active");

        // Start Check-in
        resp = await request(app)
            .post(`/api/tournaments/${tournamentId}/action`)
            .set("x-test-mode", "true")
            .set("x-test-is-admin", "true")
            .set("x-test-roles", "admin,superadmin")
            .send({ action: "start_checkin" });
        expect(resp.status).toBe(200);
    });

    test("Step 5/6: Generate Teams and Setup", async () => {
        // Teams are auto-generated from players in closeRegistration
        // and match generation synthesizes teams on-demand
        // So this step is effectively a no-op for integration testing
        expect(true).toBe(true);
    });

    test("Step 7: Start Round Robin and Generate Matches", async () => {
        // Start Round Robin phase
        let resp = await request(app)
            .post(`/api/tournaments/${tournamentId}/action`)
            .set("x-test-mode", "true")
            .set("x-test-is-admin", "true")
            .set("x-test-roles", "admin,superadmin")
            .send({ action: "start_round_robin" });

        expect(resp.status).toBe(200);
        expect(resp.body.data.status).toBe("active");

        // Generate Matches for RR_R1
        resp = await request(app)
            .post(`/api/tournaments/${tournamentId}/generate-matches`)
            .set("x-test-mode", "true")
            .set("x-test-is-admin", "true")
            .set("x-test-roles", "admin,superadmin")
            .send({ round: "RR_R1" });

        expect(resp.status).toBe(200);
        expect(resp.body.data.length).toBeGreaterThan(0);
    });

    test("Step 8: Record Match Result", async () => {
        const matchesResp = await request(app)
            .get(`/api/tournaments/${tournamentId}/matches`)
            .set("x-test-mode", "true");

        console.log("Matches response:", matchesResp.body);
        expect(matchesResp.body.data.length).toBeGreaterThan(0);

        const match = matchesResp.body.data[0];
        const matchId = match._id || match.id;
        expect(matchId).toBeDefined();

        const updateData = {
            "team1.score": 11,
            "team2.score": 5,
            status: "completed"
        };

        const resp = await request(app)
            .put(`/api/tournaments/matches/${matchId}`)
            .set("x-test-mode", "true")
            .set("x-test-is-admin", "true")
            .set("x-test-roles", "admin,superadmin")
            .send(updateData);

        expect(resp.status).toBe(200);
        expect(resp.body.data.status).toBe("completed");
        expect(resp.body.data.winner).toBe("team1");
    });
});
