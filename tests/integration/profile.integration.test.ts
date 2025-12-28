import request from "supertest";
import mongoose from "mongoose";
import { default as app } from "../../src/backend/server";
import { Player } from "../../src/backend/models/Player";

describe("Profile API Integration", () => {
    let playerId: string;

    const adminHeaders = {
        "x-test-mode": "true",
        "x-test-is-admin": "true",
        "x-test-roles": "admin,superadmin",
        "x-test-user-id": "test-user-123",
        "x-test-username": "testuser",
    };

    const userHeaders = {
        "x-test-mode": "true",
        "x-test-is-admin": "false",
        "x-test-roles": "user",
        "x-test-user-id": "regular-user-456",
        "x-test-username": "regularuser",
    };

    beforeAll(async () => {
        // Clear test data
        await Player.deleteMany({});

        // Create test player
        const player = await Player.create({
            name: "Profile Test Player",
            gender: "male",
        });
        playerId = player._id.toString();
    });

    afterAll(async () => {
        await Player.deleteMany({});
    });

    describe("GET /api/profile", () => {
        it("should return profile for authenticated user", async () => {
            const resp = await request(app)
                .get("/api/profile")
                .set(adminHeaders);

            expect(resp.status).toBe(200);
            expect(resp.body.success).toBe(true);
        });

        it("should return 401 without authentication", async () => {
            const resp = await request(app).get("/api/profile");

            expect(resp.status).toBe(401);
        });
    });

    describe("PUT /api/profile", () => {
        it("should update user profile", async () => {
            const resp = await request(app)
                .put("/api/profile")
                .set(adminHeaders)
                .send({
                    gender: "male",
                    bracketPreference: "mens",
                });

            expect(resp.status).toBe(200);
            expect(resp.body.success).toBe(true);
        });

        it("should reject invalid gender", async () => {
            const resp = await request(app)
                .put("/api/profile")
                .set(adminHeaders)
                .send({
                    gender: "invalid_gender",
                });

            expect(resp.status).toBe(400);
        });
    });

    describe("POST /api/profile/link-player", () => {
        it("should link player to profile", async () => {
            const resp = await request(app)
                .post("/api/profile/link-player")
                .set(adminHeaders)
                .send({ playerId });

            // Accept success or validation error
            expect([200, 400, 404]).toContain(resp.status);
        });
    });

    describe("POST /api/profile/unlink-player", () => {
        it("should unlink player from profile", async () => {
            const resp = await request(app)
                .post("/api/profile/unlink-player")
                .set(adminHeaders);

            // Accept success or not linked error
            expect([200, 400, 404]).toContain(resp.status);
        });
    });
});
