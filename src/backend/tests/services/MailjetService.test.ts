import axios from "axios";
import mailjetService from "../../services/MailjetService";

jest.mock("axios", () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock("../../models/SystemSettings", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({
        activeProvider: "mailjet",
        mailjetApiKey: "test-key",
        mailjetApiSecret: "test-secret",
        senderEmail: "test@example.com",
      }),
    }),
  },
}));

describe("MailjetService (via EmailService)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    mockedAxios.post.mockClear();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should log email when configured", async () => {
    // We mock SystemSettings above, so we don't need to poke env or service props
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();

    mockedAxios.post.mockResolvedValue({ status: 200 });

    const result = await mailjetService.sendClaimInvitation(
      "test@example.com",
      "token123",
      "John Doe",
    );

    expect(result).toBe(true);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      "https://api.mailjet.com/v3.1/send",
      expect.objectContaining({
        Messages: expect.arrayContaining([
          expect.objectContaining({
            To: [{ Email: "test@example.com" }],
            Subject: "Claim your Bracket of Death Profile",
          }),
        ]),
      }),
      expect.anything(),
    );

    consoleSpy.mockRestore();
  });

  it("should handle API errors gracefully", async () => {
    mockedAxios.post.mockRejectedValue(new Error("API Error"));

    const result = await mailjetService.sendClaimInvitation(
      "test@example.com",
      "token",
      "John",
    );
    expect(result).toBe(false);
  });
});
