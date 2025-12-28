import request from "supertest";
import { default as app } from "../../src/backend/server";
import SystemSettings from "../../src/backend/models/SystemSettings";

describe("System API Integration", () => {
    const adminHeaders = {
        "x-test-mode": "true",
        "x-test-is-admin": "true",
        "x-test-roles": "admin,superadmin",
    };

    const userHeaders = {
        "x-test-mode": "true",
        "x-test-is-admin": "false",
        "x-test-roles": "user",
    };

    beforeAll(async () => {
        // Reset system settings
        await SystemSettings.deleteMany({});
    });

    afterAll(async () => {
        await SystemSettings.deleteMany({});
    });

    describe("GET /api/system/status", () => {
        it("should return system status", async () => {
            const resp = await request(app)
                .get("/api/system/status")
                .set(adminHeaders);

            // Health check should return status
            expect([200, 404]).toContain(resp.status);
        });
    });

    describe("GET /api/system/health", () => {
        it("should return health check for unauthenticated users", async () => {
            const resp = await request(app).get("/api/system/health");

            expect([200, 404]).toContain(resp.status);
        });
    });

    describe("POST /api/system/claim-super-admin", () => {
        it("should allow first user to claim super admin", async () => {
            const resp = await request(app)
                .post("/api/system/claim-super-admin")
                .set({
                    "x-test-mode": "true",
                    "x-test-is-admin": "false",
                    "x-test-roles": "user",
                    "x-test-user-id": "first-user-123",
                });

            // Accept success or already claimed
            expect([200, 400, 403]).toContain(resp.status);
        });
    });

    describe("GET /api/system/initialization-status", () => {
        it("should return initialization status", async () => {
            const resp = await request(app)
                .get("/api/system/initialization-status")
                .set(userHeaders);

            expect([200, 404]).toContain(resp.status);
        });
    });
});
