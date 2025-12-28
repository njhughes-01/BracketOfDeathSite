/**
 * Player API Integration Tests
 *
 * Tests real CRUD operations against a live MongoDB instance.
 */
import request from "supertest";
import mongoose from "mongoose";
import app from "../../src/backend/server";
import Player from "../../src/backend/models/Player";

// Test headers for bypassing Keycloak auth
const testHeaders = {
    "x-test-mode": "true",
    "x-test-user-id": "integration-test-user",
    "x-test-username": "inttest",
    "x-test-is-admin": "true",
    "x-test-roles": "superadmin,admin,user",
};

// Generate unique player names to avoid conflicts
const uniqueName = (base: string) => `${base}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

describe("Player API (Integration)", () => {
    beforeEach(async () => {
        // Clean up before each test to ensure isolation
        await Player.deleteMany({});
    });

    describe("GET /api/players", () => {
        it("should return an empty array when no players exist", async () => {
            const res = await request(app)
                .get("/api/players")
                .set(testHeaders);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toEqual([]);
        });

        it("should return players when they exist", async () => {
            const playerName = uniqueName("Test Player");
            // Create a player directly in the database
            await Player.create({
                name: playerName,
                gender: "male",
                isActive: true,
            });

            const res = await request(app)
                .get("/api/players")
                .set(testHeaders);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0].name).toBe(playerName);
        });
    });

    describe("POST /api/players", () => {
        it("should create a new player", async () => {
            const playerName = uniqueName("New Test Player");
            const newPlayer = {
                name: playerName,
                gender: "female",
                isActive: true,
            };

            const res = await request(app)
                .post("/api/players")
                .set(testHeaders)
                .send(newPlayer);

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toBe(playerName);
            expect(res.body.data._id).toBeDefined();

            // Verify it was actually saved to the database
            const savedPlayer = await Player.findById(res.body.data._id);
            expect(savedPlayer).not.toBeNull();
            expect(savedPlayer?.name).toBe(playerName);
        });

        it("should reject a player without a name", async () => {
            const invalidPlayer = {
                gender: "male",
                isActive: true,
            };

            const res = await request(app)
                .post("/api/players")
                .set(testHeaders)
                .send(invalidPlayer);

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });

    describe("GET /api/players/:id", () => {
        it("should return a single player by ID", async () => {
            const playerName = uniqueName("Single Player");
            const player = await Player.create({
                name: playerName,
                gender: "male",
                isActive: true,
            });

            const res = await request(app)
                .get(`/api/players/${player._id}`)
                .set(testHeaders);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toBe(playerName);
        });

        it("should return 404 for non-existent player", async () => {
            const fakeId = new mongoose.Types.ObjectId();

            const res = await request(app)
                .get(`/api/players/${fakeId}`)
                .set(testHeaders);

            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
        });
    });

    describe("PUT /api/players/:id", () => {
        it("should update an existing player", async () => {
            const player = await Player.create({
                name: uniqueName("Original Name"),
                gender: "male",
                isActive: true,
            });

            const updatedName = uniqueName("Updated Name");
            const res = await request(app)
                .put(`/api/players/${player._id}`)
                .set(testHeaders)
                .send({ name: updatedName });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toBe(updatedName);

            // Verify the update persisted
            const updatedPlayer = await Player.findById(player._id);
            expect(updatedPlayer?.name).toBe(updatedName);
        });
    });

    describe("DELETE /api/players/:id", () => {
        it("should delete a player", async () => {
            const player = await Player.create({
                name: uniqueName("To Be Deleted"),
                gender: "female",
                isActive: true,
            });

            const res = await request(app)
                .delete(`/api/players/${player._id}`)
                .set(testHeaders);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            // Verify it was actually deleted
            const deletedPlayer = await Player.findById(player._id);
            expect(deletedPlayer).toBeNull();
        });
    });
});
