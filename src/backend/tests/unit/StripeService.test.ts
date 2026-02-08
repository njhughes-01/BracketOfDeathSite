import StripeService from "../../services/StripeService";
import SystemSettings from "../../models/SystemSettings";

// Mock Stripe
const mockCreate = jest.fn();
const mockRetrieve = jest.fn();
const mockRefundCreate = jest.fn();
const mockCouponCreate = jest.fn();
const mockCouponDel = jest.fn();
const mockCouponsList = jest.fn();
const mockCustomersList = jest.fn();
const mockCustomersCreate = jest.fn();
const mockConstructEvent = jest.fn();
const mockAccountsCreate = jest.fn();
const mockAccountsRetrieve = jest.fn();
const mockAccountLinksCreate = jest.fn();
const mockAccountsCreateLoginLink = jest.fn();

jest.mock("stripe", () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: { create: mockCreate, retrieve: mockRetrieve },
    },
    refunds: { create: mockRefundCreate },
    coupons: { create: mockCouponCreate, del: mockCouponDel, list: mockCouponsList },
    customers: { list: mockCustomersList, create: mockCustomersCreate },
    accounts: { create: mockAccountsCreate, retrieve: mockAccountsRetrieve, createLoginLink: mockAccountsCreateLoginLink },
    accountLinks: { create: mockAccountLinksCreate },
    billingPortal: { sessions: { create: jest.fn().mockResolvedValue({ url: "https://portal" }) } },
    webhooks: { constructEvent: mockConstructEvent },
  }));
});

jest.mock("../../models/SystemSettings");
jest.mock("../../utils/logger");

describe("StripeService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    StripeService.resetClient();
  });

  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
  });

  describe("isStripeConfigured", () => {
    it("should return true when env var is set", async () => {
      const result = await StripeService.isStripeConfigured();
      expect(result).toBe(true);
    });

    it("should check DB when env var not set", async () => {
      delete process.env.STRIPE_SECRET_KEY;
      const selectMock = jest.fn().mockResolvedValue({ stripeSecretKey: "sk_test_db" });
      (SystemSettings.findOne as jest.Mock).mockReturnValue({ select: selectMock });
      const result = await StripeService.isStripeConfigured();
      expect(result).toBe(true);
    });

    it("should return false when nothing configured", async () => {
      delete process.env.STRIPE_SECRET_KEY;
      const selectMock = jest.fn().mockResolvedValue(null);
      (SystemSettings.findOne as jest.Mock).mockReturnValue({ select: selectMock });
      const result = await StripeService.isStripeConfigured();
      expect(result).toBe(false);
    });
  });

  describe("createCheckoutSession", () => {
    it("should create session with correct params", async () => {
      mockCreate.mockResolvedValue({ id: "sess_123", url: "https://checkout" });
      mockCouponsList.mockResolvedValue({ data: [] });

      const result = await StripeService.createCheckoutSession({
        tournamentId: "t1",
        tournamentName: "BOD #123456",
        userId: "u1",
        playerId: "p1",
        playerEmail: "test@test.com",
        reservationId: "r1",
        amount: 2000,
        successUrl: "https://app/success",
        cancelUrl: "https://app/cancel",
      });

      expect(result.id).toBe("sess_123");
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        mode: "payment",
        customer_email: "test@test.com",
        line_items: expect.arrayContaining([
          expect.objectContaining({
            price_data: expect.objectContaining({ unit_amount: 2000 }),
          }),
        ]),
        metadata: expect.objectContaining({ tournamentId: "t1", userId: "u1" }),
      }));
    });

    it("should apply discount code if found in Stripe", async () => {
      mockCreate.mockResolvedValue({ id: "sess_disc" });
      mockCouponsList.mockResolvedValue({
        data: [{ id: "coupon_SAVE50", name: "SAVE50" }],
      });

      await StripeService.createCheckoutSession({
        tournamentId: "t1",
        tournamentName: "BOD #123",
        userId: "u1",
        playerId: "p1",
        playerEmail: "test@test.com",
        reservationId: "r1",
        amount: 1000,
        discountCode: "SAVE50",
        successUrl: "https://app/success",
        cancelUrl: "https://app/cancel",
      });

      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        discounts: [{ coupon: "coupon_SAVE50" }],
      }));
    });
  });

  describe("retrieveCheckoutSession", () => {
    it("should retrieve session with expanded fields", async () => {
      mockRetrieve.mockResolvedValue({ id: "sess_123", payment_status: "paid" });
      const result = await StripeService.retrieveCheckoutSession("sess_123");
      expect(result.id).toBe("sess_123");
      expect(mockRetrieve).toHaveBeenCalledWith("sess_123", {
        expand: ["payment_intent", "customer"],
      });
    });
  });

  describe("createRefund", () => {
    it("should create full refund", async () => {
      mockRefundCreate.mockResolvedValue({ id: "re_123" });
      const result = await StripeService.createRefund("pi_123");
      expect(result.id).toBe("re_123");
      expect(mockRefundCreate).toHaveBeenCalledWith(expect.objectContaining({
        payment_intent: "pi_123",
      }));
    });

    it("should create partial refund with amount", async () => {
      mockRefundCreate.mockResolvedValue({ id: "re_456" });
      await StripeService.createRefund("pi_123", 500, "requested_by_customer");
      expect(mockRefundCreate).toHaveBeenCalledWith(expect.objectContaining({
        payment_intent: "pi_123",
        amount: 500,
        reason: "requested_by_customer",
      }));
    });
  });

  describe("createCoupon", () => {
    it("should create percent coupon", async () => {
      mockCouponCreate.mockResolvedValue({ id: "SAVE50" });
      const result = await StripeService.createCoupon({
        code: "SAVE50",
        type: "percent",
        percentOff: 50,
      });
      expect(result.id).toBe("SAVE50");
      expect(mockCouponCreate).toHaveBeenCalledWith(expect.objectContaining({
        percent_off: 50,
      }));
    });

    it("should create amount coupon", async () => {
      mockCouponCreate.mockResolvedValue({ id: "FLAT5" });
      await StripeService.createCoupon({
        code: "FLAT5",
        type: "amount",
        amountOff: 500,
      });
      expect(mockCouponCreate).toHaveBeenCalledWith(expect.objectContaining({
        amount_off: 500,
        currency: "usd",
      }));
    });
  });

  describe("deleteCoupon", () => {
    it("should delete coupon", async () => {
      mockCouponDel.mockResolvedValue({});
      await StripeService.deleteCoupon("SAVE50");
      expect(mockCouponDel).toHaveBeenCalledWith("SAVE50");
    });
  });

  describe("verifyWebhookSignature", () => {
    it("should throw if no secret configured", () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;
      expect(() => StripeService.verifyWebhookSignature("body", "sig")).toThrow("Stripe webhook secret not configured");
    });

    it("should call constructEvent with correct params", () => {
      process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
      mockConstructEvent.mockReturnValue({ type: "test" });
      const result = StripeService.verifyWebhookSignature("body", "sig", "whsec_test");
      expect(mockConstructEvent).toHaveBeenCalledWith("body", "sig", "whsec_test");
      delete process.env.STRIPE_WEBHOOK_SECRET;
    });
  });

  describe("getPublishableKey", () => {
    it("should return env var if set", async () => {
      process.env.STRIPE_PUBLISHABLE_KEY = "pk_test_123";
      const result = await StripeService.getPublishableKey();
      expect(result).toBe("pk_test_123");
      delete process.env.STRIPE_PUBLISHABLE_KEY;
    });

    it("should fall back to DB", async () => {
      (SystemSettings.findOne as jest.Mock).mockResolvedValue({ stripePublishableKey: "pk_db" });
      const result = await StripeService.getPublishableKey();
      expect(result).toBe("pk_db");
    });
  });

  describe("createConnectAccount", () => {
    it("should create an Express connect account", async () => {
      mockAccountsCreate.mockResolvedValue({ id: "acct_123" });
      const result = await StripeService.createConnectAccount("test@test.com", "Test Biz");
      expect(result.id).toBe("acct_123");
      expect(mockAccountsCreate).toHaveBeenCalledWith(expect.objectContaining({
        type: "express",
        email: "test@test.com",
      }));
    });
  });

  describe("createAccountLink", () => {
    it("should create an account link for onboarding", async () => {
      mockAccountLinksCreate.mockResolvedValue({ url: "https://connect.stripe.com/onboard" });
      const result = await StripeService.createAccountLink("acct_123", "https://refresh", "https://return");
      expect(result.url).toBe("https://connect.stripe.com/onboard");
      expect(mockAccountLinksCreate).toHaveBeenCalledWith(expect.objectContaining({
        account: "acct_123",
        type: "account_onboarding",
      }));
    });
  });

  describe("getAccountStatus", () => {
    it("should retrieve account status", async () => {
      mockAccountsRetrieve.mockResolvedValue({ id: "acct_123", charges_enabled: true });
      const result = await StripeService.getAccountStatus("acct_123");
      expect(result.charges_enabled).toBe(true);
    });
  });

  describe("createLoginLink", () => {
    it("should create a login link", async () => {
      mockAccountsCreateLoginLink.mockResolvedValue({ url: "https://dashboard" });
      const result = await StripeService.createLoginLink("acct_123");
      expect(result.url).toBe("https://dashboard");
    });
  });

  describe("createCheckoutSession with Connect", () => {
    it("should include payment_intent_data when connectedAccountId is provided", async () => {
      mockCreate.mockResolvedValue({ id: "sess_connect", url: "https://checkout" });
      const mockCoupons = jest.fn().mockResolvedValue({ data: [] });
      
      await StripeService.createCheckoutSession({
        tournamentId: "t1",
        tournamentName: "BOD #1",
        userId: "u1",
        playerId: "p1",
        playerEmail: "test@test.com",
        reservationId: "r1",
        amount: 2500,
        successUrl: "https://success",
        cancelUrl: "https://cancel",
        connectedAccountId: "acct_123",
        applicationFeeAmount: 250,
      });

      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        payment_intent_data: {
          application_fee_amount: 250,
          transfer_data: { destination: "acct_123" },
        },
      }));
    });

    it("should not include payment_intent_data without connectedAccountId", async () => {
      mockCreate.mockResolvedValue({ id: "sess_direct", url: "https://checkout" });

      await StripeService.createCheckoutSession({
        tournamentId: "t1",
        tournamentName: "BOD #1",
        userId: "u1",
        playerId: "p1",
        playerEmail: "test@test.com",
        reservationId: "r1",
        amount: 2500,
        successUrl: "https://success",
        cancelUrl: "https://cancel",
      });

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.payment_intent_data).toBeUndefined();
    });
  });
});
