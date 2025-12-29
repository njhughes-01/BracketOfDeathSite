import { EmailService } from "../../../../src/backend/services/EmailService";
import SystemSettings from "../../../../src/backend/models/SystemSettings";
import { MailjetProvider } from "../../../../src/backend/services/email/MailjetProvider";
import { MailgunProvider } from "../../../../src/backend/services/email/MailgunProvider";

jest.mock("../../../../src/backend/models/SystemSettings");
jest.mock("../../../../src/backend/services/email/MailjetProvider");
jest.mock("../../../../src/backend/services/email/MailgunProvider");

describe("EmailService", () => {
    let emailService: EmailService;

    beforeEach(() => {
        jest.clearAllMocks();
        emailService = new EmailService();
    });

    describe("getConfig", () => {
        it("should return default Mailjet config if no settings found", async () => {
            (SystemSettings.findOne as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue(null),
            });

            // Accessing private method for testing
            const config = await (emailService as any).getConfig();

            expect(config.activeProvider).toBe("mailjet");
            expect(config.provider).toBeInstanceOf(MailjetProvider);
            expect(config.brandName).toBe("Bracket of Death");
        });

        it("should return Mailgun config if activeProvider is mailgun", async () => {
            const mockSettings = {
                activeProvider: "mailgun",
                mailgunApiKey: "mg-key",
                mailgunDomain: "mg-domain",
                brandName: "Custom Brand",
            };

            (SystemSettings.findOne as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue(mockSettings),
            });

            const config = await (emailService as any).getConfig();

            expect(config.activeProvider).toBe("mailgun");
            expect(config.provider).toBeInstanceOf(MailgunProvider);
            expect(config.brandName).toBe("Custom Brand");
        });
    });

    describe("sendEmail", () => {
        it("should use the provider from config to send email", async () => {
            const mockSend = jest.fn().mockResolvedValue(true);
            const mockProvider = { sendEmail: mockSend };

            jest.spyOn(emailService as any, "getConfig").mockResolvedValue({
                provider: mockProvider,
                activeProvider: "mailjet",
            });

            const params = { to: "test@example.com", subject: "Test", text: "Hello", html: "<p>Hello</p>" };
            const result = await emailService.sendEmail(params);

            expect(result).toBe(true);
            expect(mockSend).toHaveBeenCalledWith(params, expect.any(Object));
        });
    });

    describe("sendClaimInvitation", () => {
        it("should call sendEmail with correct template", async () => {
            const sendEmailSpy = jest.spyOn(emailService, "sendEmail").mockResolvedValue(true);

            await emailService.sendClaimInvitation("user@example.com", "token123", "John Doe");

            expect(sendEmailSpy).toHaveBeenCalledWith(expect.objectContaining({
                to: "user@example.com",
                subject: expect.stringContaining("Claim"),
                html: expect.stringContaining("John Doe"),
            }));
        });
    });

    describe("verifyProvider", () => {
        it("should return true if provider verifies successfully", async () => {
            (MailgunProvider as jest.Mock).mockImplementation(() => ({
                verifyCredentials: jest.fn().mockResolvedValue(true),
            }));

            const result = await emailService.verifyProvider("mailgun", {
                mailgunApiKey: "key",
                mailgunDomain: "domain",
            });

            expect(result).toBe(true);
        });

        it("should return false if credentials missing", async () => {
            const result = await emailService.verifyProvider("mailjet", {});
            expect(result).toBe(false);
        });
    });
});
