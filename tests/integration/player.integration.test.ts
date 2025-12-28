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

describe("Player API (Integration)", () => {
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
            // Create a player directly in the database
            await Player.create({
                name: "Test Player 1",
                gender: "Male",
                isActive: true,
            });

            const res = await request(app)
                .get("/api/players")
                .set(testHeaders);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0].name).toBe("Test Player 1");
        });
    });

    describe("POST /api/players", () => {
        it("should create a new player", async () => {
            const newPlayer = {
                name: "New Test Player",
                gender: "Female",
                isActive: true,
            };

            const res = await request(app)
                .post("/api/players")
                .set(testHeaders)
                .send(newPlayer);

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toBe("New Test Player");
            expect(res.body.data._id).toBeDefined();

            // Verify it was actually saved to the database
            const savedPlayer = await Player.findById(res.body.data._id);
            expect(savedPlayer).not.toBeNull();
            expect(savedPlayer?.name).toBe("New Test Player");
        });

        it("should reject a player without a name", async () => {
            const invalidPlayer = {
                gender: "Male",
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
            const player = await Player.create({
                name: "Single Player",
                gender: "Male",
                isActive: true,
            });

            const res = await request(app)
                .get(`/api/players/${player._id}`)
                .set(testHeaders);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toBe("Single Player");
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
                name: "Original Name",
                gender: "Male",
                isActive: true,
            });

            const res = await request(app)
                .put(`/api/players/${player._id}`)
                .set(testHeaders)
                .send({ name: "Updated Name" });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toBe("Updated Name");

            // Verify the update persisted
            const updatedPlayer = await Player.findById(player._id);
            expect(updatedPlayer?.name).toBe("Updated Name");
        });
    });

    describe("DELETE /api/players/:id", () => {
        it("should delete a player", async () => {
            const player = await Player.create({
                name: "To Be Deleted",
                gender: "Female",
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
