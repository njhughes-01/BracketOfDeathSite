import mongoose from "mongoose";
import SystemSettings from "../../../src/backend/models/SystemSettings";

describe("SystemSettings Model", () => {
    beforeAll(async () => {
        await mongoose.connect(
            process.env.MONGODB_URI || "mongodb://localhost:27017/test"
        );
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        await SystemSettings.deleteMany({});
    });

    describe("Validation", () => {
        it("should create settings with required fields", async () => {
            const settings = await SystemSettings.create({
                updatedBy: "admin-user",
            });

            expect(settings.updatedBy).toBe("admin-user");
            expect(settings.activeProvider).toBe("mailjet"); // Default
            expect(settings.brandName).toBe("Bracket of Death"); // Default
        });

        it("should require updatedBy field", async () => {
            const settings = new SystemSettings({});

            await expect(settings.save()).rejects.toThrow("required");
        });

        it("should validate activeProvider enum", async () => {
            const settings = new SystemSettings({
                updatedBy: "admin",
                activeProvider: "invalid_provider",
            });

            await expect(settings.save()).rejects.toThrow();
        });

        it("should accept valid email providers", async () => {
            const settings = await SystemSettings.create({
                updatedBy: "admin",
                activeProvider: "mailgun",
            });

            expect(settings.activeProvider).toBe("mailgun");
        });
    });

    describe("Defaults", () => {
        it("should set default brand colors", async () => {
            const settings = await SystemSettings.create({
                updatedBy: "admin",
            });

            expect(settings.brandPrimaryColor).toBe("#4CAF50");
            expect(settings.brandSecondaryColor).toBe("#008CBA");
        });

        it("should allow custom brand colors", async () => {
            const settings = await SystemSettings.create({
                updatedBy: "admin",
                brandPrimaryColor: "#FF5733",
                brandSecondaryColor: "#333333",
            });

            expect(settings.brandPrimaryColor).toBe("#FF5733");
            expect(settings.brandSecondaryColor).toBe("#333333");
        });
    });

    describe("getInstance Static Method", () => {
        it("should return existing settings if present", async () => {
            await SystemSettings.create({
                updatedBy: "existing-admin",
                brandName: "Existing Brand",
            });

            const settings = await (SystemSettings as any).getInstance();

            expect(settings.brandName).toBe("Existing Brand");
            expect(settings.updatedBy).toBe("existing-admin");
        });

        it("should create new instance if no settings exist", async () => {
            const settings = await (SystemSettings as any).getInstance();

            expect(settings).toBeDefined();
            expect(settings.updatedBy).toBe("system");
            expect(settings.isNew).toBe(true); // Not yet saved
        });
    });

    describe("Sensitive Fields", () => {
        it("should not return sensitive fields by default", async () => {
            await SystemSettings.create({
                updatedBy: "admin",
                mailjetApiKey: "secret-key",
                mailjetApiSecret: "secret-secret",
                mailgunApiKey: "mailgun-secret",
            });

            const settings = await SystemSettings.findOne();

            // Sensitive fields should be undefined (select: false)
            expect(settings?.mailjetApiKey).toBeUndefined();
            expect(settings?.mailjetApiSecret).toBeUndefined();
            expect(settings?.mailgunApiKey).toBeUndefined();
        });

        it("should return sensitive fields when explicitly selected", async () => {
            await SystemSettings.create({
                updatedBy: "admin",
                mailjetApiKey: "secret-key",
            });

            const settings = await SystemSettings.findOne().select("+mailjetApiKey");

            expect(settings?.mailjetApiKey).toBe("secret-key");
        });
    });

    describe("Timestamps", () => {
        it("should auto-set createdAt and updatedAt", async () => {
            const settings = await SystemSettings.create({
                updatedBy: "admin",
            });

            expect((settings as any).createdAt).toBeDefined();
            expect(settings.updatedAt).toBeDefined();
        });
    });
});
