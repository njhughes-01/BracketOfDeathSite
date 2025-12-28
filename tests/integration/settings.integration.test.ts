import request from "supertest";
import { default as app } from "../../src/backend/server";
import SystemSettings from "../../src/backend/models/SystemSettings";

describe("Settings API Integration", () => {
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
        });

        it("should allow non-admin users to view settings", async () => {
            const resp = await request(app)
                .get("/api/settings")
                .set(userHeaders);

            expect(resp.status).toBe(200);
            expect(resp.body.success).toBe(true);
        });
    });

    describe("PUT /api/settings", () => {
        it("should update settings as admin", async () => {
            const resp = await request(app)
                .put("/api/settings")
                .set(adminHeaders)
                .send({
                    siteName: "Test Tournament Site",
                    siteDescription: "A test site for tournaments",
                });

            expect(resp.status).toBe(200);
            expect(resp.body.success).toBe(true);
            expect(resp.body.data.siteName).toBe("Test Tournament Site");
        });

        it("should persist settings updates", async () => {
            // Update
            await request(app)
                .put("/api/settings")
                .set(adminHeaders)
                .send({
                    siteName: "Persistent Test Site",
                });

            // Verify
            const resp = await request(app)
                .get("/api/settings")
                .set(adminHeaders);

            expect(resp.body.data.siteName).toBe("Persistent Test Site");
        });

        it("should sanitize HTML in text fields", async () => {
            const resp = await request(app)
                .put("/api/settings")
                .set(adminHeaders)
                .send({
                    siteName: "<script>alert('xss')</script>Safe Name",
                });

            expect(resp.status).toBe(200);
            // HTML should be stripped
            expect(resp.body.data.siteName).not.toContain("<script>");
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
        });
    });

    describe("PUT /api/settings/email", () => {
        it("should update email settings", async () => {
            const resp = await request(app)
                .put("/api/settings/email")
                .set(adminHeaders)
                .send({
                    provider: "console",
                    fromEmail: "test@example.com",
                    fromName: "Test Sender",
                });

            expect(resp.status).toBe(200);
            expect(resp.body.success).toBe(true);
        });

        it("should reject invalid email provider", async () => {
            const resp = await request(app)
                .put("/api/settings/email")
                .set(adminHeaders)
                .send({
                    provider: "invalid_provider",
                    fromEmail: "test@example.com",
                });

            expect(resp.status).toBe(400);
        });
    });

    describe("POST /api/settings/email/test", () => {
        it("should send test email when valid config exists", async () => {
            // First configure console provider (always available)
            await request(app)
                .put("/api/settings/email")
                .set(adminHeaders)
                .send({
                    provider: "console",
                    fromEmail: "test@example.com",
                    fromName: "Test Sender",
                });

            const resp = await request(app)
                .post("/api/settings/email/test")
                .set(adminHeaders)
                .send({
                    recipientEmail: "recipient@example.com",
                });

            // Console provider should always succeed
            expect(resp.status).toBe(200);
            expect(resp.body.success).toBe(true);
        });
    });
});
