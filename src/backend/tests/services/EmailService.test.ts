import { EmailService } from "../../services/EmailService";

// Mock the dependencies
const mockSendEmail = jest.fn();

// Mock the EmailService prototype to overridegetConfig/provider loading
// to avoid messing with actual config files/env vars
jest.spyOn(EmailService.prototype as any, "getConfig").mockResolvedValue({
    provider: {
        sendEmail: mockSendEmail
    },
    defaultFrom: "test@example.com",
    templates: {}
});

describe("EmailService", () => {
    let emailService: EmailService;

    beforeEach(() => {
        jest.clearAllMocks();
        emailService = new EmailService();
        mockSendEmail.mockResolvedValue(true);
    });

    it("should send an email using the configured provider", async () => {
        const params = {
            to: "user@example.com",
            subject: "Test Subject",
            html: "<p>Hello</p>",
            text: "Hello"
        };

        const result = await emailService.sendEmail(params);

        expect(result).toBe(true);
        expect(mockSendEmail).toHaveBeenCalledWith(params, expect.anything());
    });

    it("should handle provider failure", async () => {
        mockSendEmail.mockResolvedValue(false);

        const params = {
            to: "user@example.com",
            subject: "Test Subject",
            html: "<p>Hello</p>",
            text: "Hello"
        };

        const result = await emailService.sendEmail(params);
        expect(result).toBe(false);
    });
});
