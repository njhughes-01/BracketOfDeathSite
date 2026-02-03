import { EmailService } from "../../services/EmailService";

// Mock SystemSettings to avoid MongoDB calls
jest.mock("../../models/SystemSettings", () => ({
    __esModule: true,
    default: {
        findOne: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue(null),
        }),
    },
}));

// Mock the email providers (correct path: services/email/)
jest.mock("../../services/email/MailjetProvider", () => {
    return {
        MailjetProvider: jest.fn().mockImplementation(() => ({
            sendEmail: jest.fn().mockResolvedValue(true),
            verifyCredentials: jest.fn().mockResolvedValue(true),
            getName: jest.fn().mockReturnValue("Mailjet"),
        })),
    };
});

jest.mock("../../services/email/MailgunProvider", () => {
    return {
        MailgunProvider: jest.fn().mockImplementation(() => ({
            sendEmail: jest.fn().mockResolvedValue(true),
            verifyCredentials: jest.fn().mockResolvedValue(true),
            getName: jest.fn().mockReturnValue("Mailgun"),
        })),
    };
});

describe("EmailService", () => {
    let emailService: EmailService;

    beforeEach(() => {
        jest.clearAllMocks();
        emailService = new EmailService();
    });

    it("should send an email using the configured provider", async () => {
        const params = {
            to: "user@example.com",
            subject: "Test Subject",
            html: "<p>Hello</p>",
            text: "Hello",
        };

        const result = await emailService.sendEmail(params);

        expect(result).toBe(true);
    });

    it("should handle provider returning false", async () => {
        // Get the mocked MailjetProvider
        const { MailjetProvider } = require("../../services/email/MailjetProvider");

        // Make sendEmail return false for this test
        MailjetProvider.mockImplementation(() => ({
            sendEmail: jest.fn().mockResolvedValue(false),
            verifyCredentials: jest.fn().mockResolvedValue(true),
            getName: jest.fn().mockReturnValue("Mailjet"),
        }));

        // Create a new instance to pick up the new mock
        const failingEmailService = new EmailService();

        const params = {
            to: "user@example.com",
            subject: "Test Subject",
            html: "<p>Hello</p>",
            text: "Hello",
        };

        const result = await failingEmailService.sendEmail(params);
        expect(result).toBe(false);
    });

    describe("Tournament Registration Emails", () => {
        beforeEach(() => {
            const { MailjetProvider } = require("../../services/email/MailjetProvider");
            MailjetProvider.mockImplementation(() => ({
                sendEmail: jest.fn().mockResolvedValue(true),
                verifyCredentials: jest.fn().mockResolvedValue(true),
                getName: jest.fn().mockReturnValue("Mailjet"),
            }));
            emailService = new EmailService();
        });

        it("should send registration confirmation email", async () => {
            const result = await emailService.sendRegistrationConfirmation(
                "player@example.com",
                "John Doe",
                "BOD #50",
                new Date("2025-03-15"),
            );
            expect(result).toBe(true);
        });

        it("should send waitlist confirmation email", async () => {
            const result = await emailService.sendWaitlistConfirmation(
                "player@example.com",
                "John Doe",
                "BOD #50",
                3,
            );
            expect(result).toBe(true);
        });

        it("should send spot available notification email", async () => {
            const result = await emailService.sendSpotAvailableNotification(
                "player@example.com",
                "John Doe",
                "BOD #50",
            );
            expect(result).toBe(true);
        });

        it("should send tournament reminder email", async () => {
            const result = await emailService.sendTournamentReminder(
                "player@example.com",
                "John Doe",
                "BOD #50",
                new Date("2025-03-15"),
                "Mill Valley Courts",
            );
            expect(result).toBe(true);
        });
    });
});
