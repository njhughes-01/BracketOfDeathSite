import request from "supertest";
import { default as app } from "../../src/backend/server";
import SystemSettings from "../../src/backend/models/SystemSettings";

describe("Settings API Integration", () => {
    const adminHeaders = {
        "x-test-mode": "true",
        "x-test-is-admin": "true",
        "x-test-roles": "admin,superadmin",
    };

    beforeAll(async () => {
        // Clear any existing settings
        await SystemSettings.deleteMany({});
    });

    afterAll(async () => {
        await SystemSettings.deleteMany({});
    });

    describe("GET /api/settings", () => {
        it("should return default settings when none exist", async () => {
            const resp = await request(app)
                .get("/api/settings")
                .set(adminHeaders);

            expect(resp.status).toBe(200);
            expect(resp.body.success).toBe(true);
            // Should have default structure
            expect(resp.body.data).toBeDefined();
            expect(resp.body.data.activeProvider).toBeDefined();
        });

        it("should require superadmin for settings", async () => {
            const resp = await request(app)
                .get("/api/settings")
                .set({
                    "x-test-mode": "true",
                    "x-test-is-admin": "false",
                    "x-test-roles": "user",
                });

            expect(resp.status).toBe(403);
        });
    });

    describe("PUT /api/settings", () => {
        it("should update branding settings as admin", async () => {
            const resp = await request(app)
                .put("/api/settings")
                .set(adminHeaders)
                .send({
                    brandName: "Test Tournament Site",
                    brandPrimaryColor: "#4CAF50",
                });

            expect(resp.status).toBe(200);
            expect(resp.body.success).toBe(true);
        });

        it("should persist branding updates", async () => {
            // Update brandName
            await request(app)
                .put("/api/settings")
                .set(adminHeaders)
                .send({
                    brandName: "Persistent Test Site",
                });

            // Verify
            const resp = await request(app)
                .get("/api/settings")
                .set(adminHeaders);

            expect(resp.body.data.brandName).toBe("Persistent Test Site");
        });

        it("should sanitize HTML in text fields", async () => {
            const resp = await request(app)
                .put("/api/settings")
                .set(adminHeaders)
                .send({
                    brandName: "<script>alert('xss')</script>Safe Name",
                });

            expect(resp.status).toBe(200);

            // Verify the brandName is sanitized
            const getResp = await request(app)
                .get("/api/settings")
                .set(adminHeaders);

            expect(getResp.body.data.brandName).not.toContain("<script>");
        });
    });

    describe("GET /api/settings/email-providers", () => {
        it("should list available email providers", async () => {
            const resp = await request(app)
                .get("/api/settings/email-providers")
                .set(adminHeaders);

            expect(resp.status).toBe(200);
            expect(resp.body.success).toBe(true);
            expect(Array.isArray(resp.body.data)).toBe(true);
            expect(resp.body.data.length).toBeGreaterThan(0);
        });
    });

    describe("PUT /api/settings/email", () => {
        it("should update email settings", async () => {
            const resp = await request(app)
                .put("/api/settings/email")
                .set(adminHeaders)
                .send({
                    activeProvider: "mailjet",
                    senderEmail: "test@example.com",
                });

            expect(resp.status).toBe(200);
            expect(resp.body.success).toBe(true);
            expect(resp.body.data.activeProvider).toBe("mailjet");
        });

        it("should reject invalid email provider", async () => {
            const resp = await request(app)
                .put("/api/settings/email")
                .set(adminHeaders)
                .send({
                    activeProvider: "invalid_provider",
                });

            expect(resp.status).toBe(400);
        });
    });

    describe("POST /api/settings/email/test", () => {
        it("should require testEmail parameter", async () => {
            const resp = await request(app)
                .post("/api/settings/email/test")
                .set(adminHeaders)
                .send({});

            expect(resp.status).toBe(400);
        });

        it("should validate email format for test", async () => {
            const resp = await request(app)
                .post("/api/settings/email/test")
                .set(adminHeaders)
                .send({
                    testEmail: "invalid-email",
                });

            expect(resp.status).toBe(400);
        });
    });
});
