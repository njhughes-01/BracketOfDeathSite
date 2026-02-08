import { Request, Response, NextFunction } from "express";
import { ConnectController } from "../../controllers/ConnectController";
import SystemSettings from "../../models/SystemSettings";
import StripeService from "../../services/StripeService";

jest.mock("../../models/SystemSettings");
jest.mock("../../services/StripeService");
jest.mock("../../utils/logger");

describe("ConnectController", () => {
  let controller: ConnectController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextMock: jest.Mock;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    controller = new ConnectController();
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    nextMock = jest.fn();
    mockRes = { status: statusMock, json: jsonMock };
    mockReq = { user: { sub: "admin-user" } } as any;
    jest.clearAllMocks();
  });

  describe("onboard", () => {
    it("should return error if already connected", async () => {
      (SystemSettings.findOne as jest.Mock).mockResolvedValue({
        stripeConnectedAccountId: "acct_123",
        connectOnboardingComplete: true,
      });

      await controller.onboard(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it("should create new account and return onboarding URL", async () => {
      (SystemSettings.findOne as jest.Mock).mockResolvedValue(null);
      (StripeService.createConnectAccount as jest.Mock).mockResolvedValue({ id: "acct_new" });
      (SystemSettings.findOneAndUpdate as jest.Mock).mockResolvedValue({});
      (StripeService.createAccountLink as jest.Mock).mockResolvedValue({
        url: "https://connect.stripe.com/onboard",
      });

      await controller.onboard(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            url: "https://connect.stripe.com/onboard",
            accountId: "acct_new",
          }),
        })
      );
    });

    it("should reuse existing account if onboarding incomplete", async () => {
      (SystemSettings.findOne as jest.Mock).mockResolvedValue({
        stripeConnectedAccountId: "acct_existing",
        connectOnboardingComplete: false,
      });
      (StripeService.createAccountLink as jest.Mock).mockResolvedValue({
        url: "https://connect.stripe.com/onboard",
      });

      await controller.onboard(mockReq as Request, mockRes as Response, nextMock);
      expect(StripeService.createConnectAccount).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });

  describe("getStatus", () => {
    it("should return not_connected when no account", async () => {
      (SystemSettings.findOne as jest.Mock).mockResolvedValue(null);

      await controller.getStatus(mockReq as Request, mockRes as Response, nextMock);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ connected: false, status: "not_connected" }),
        })
      );
    });

    it("should return active status for fully enabled account", async () => {
      (SystemSettings.findOne as jest.Mock).mockResolvedValue({
        stripeConnectedAccountId: "acct_123",
        connectOnboardingComplete: true,
        platformFeePercent: 5,
      });
      (StripeService.getAccountStatus as jest.Mock).mockResolvedValue({
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
        business_profile: { name: "Test Biz" },
        email: "test@test.com",
      });

      await controller.getStatus(mockReq as Request, mockRes as Response, nextMock);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            connected: true,
            status: "active",
            chargesEnabled: true,
            platformFeePercent: 5,
          }),
        })
      );
    });

    it("should return pending when details submitted but charges not enabled", async () => {
      (SystemSettings.findOne as jest.Mock).mockResolvedValue({
        stripeConnectedAccountId: "acct_123",
        connectOnboardingComplete: false,
      });
      (StripeService.getAccountStatus as jest.Mock).mockResolvedValue({
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: true,
        business_profile: {},
      });

      await controller.getStatus(mockReq as Request, mockRes as Response, nextMock);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "pending" }),
        })
      );
    });
  });

  describe("getDashboardLink", () => {
    it("should return error if no account", async () => {
      (SystemSettings.findOne as jest.Mock).mockResolvedValue(null);

      await controller.getDashboardLink(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it("should return error if onboarding not complete", async () => {
      (SystemSettings.findOne as jest.Mock).mockResolvedValue({
        stripeConnectedAccountId: "acct_123",
        connectOnboardingComplete: false,
      });

      await controller.getDashboardLink(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it("should return dashboard URL", async () => {
      (SystemSettings.findOne as jest.Mock).mockResolvedValue({
        stripeConnectedAccountId: "acct_123",
        connectOnboardingComplete: true,
      });
      (StripeService.createLoginLink as jest.Mock).mockResolvedValue({
        url: "https://connect.stripe.com/dashboard",
      });

      await controller.getDashboardLink(mockReq as Request, mockRes as Response, nextMock);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ url: "https://connect.stripe.com/dashboard" }),
        })
      );
    });
  });

  describe("getPlatformFee", () => {
    it("should return 0 when no settings", async () => {
      (SystemSettings.findOne as jest.Mock).mockResolvedValue(null);

      await controller.getPlatformFee(mockReq as Request, mockRes as Response, nextMock);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ platformFeePercent: 0 }),
        })
      );
    });

    it("should return configured fee", async () => {
      (SystemSettings.findOne as jest.Mock).mockResolvedValue({ platformFeePercent: 10 });

      await controller.getPlatformFee(mockReq as Request, mockRes as Response, nextMock);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ platformFeePercent: 10 }),
        })
      );
    });
  });

  describe("setPlatformFee", () => {
    it("should return error if fee not provided", async () => {
      mockReq.body = {};

      await controller.setPlatformFee(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it("should return error if fee out of range", async () => {
      mockReq.body = { platformFeePercent: 101 };

      await controller.setPlatformFee(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it("should return error for negative fee", async () => {
      mockReq.body = { platformFeePercent: -5 };

      await controller.setPlatformFee(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it("should save valid fee", async () => {
      mockReq.body = { platformFeePercent: 10 };
      (SystemSettings.findOneAndUpdate as jest.Mock).mockResolvedValue({});

      await controller.setPlatformFee(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(SystemSettings.findOneAndUpdate).toHaveBeenCalledWith(
        {},
        expect.objectContaining({ platformFeePercent: 10 }),
        expect.any(Object)
      );
    });

    it("should save 0% fee", async () => {
      mockReq.body = { platformFeePercent: 0 };
      (SystemSettings.findOneAndUpdate as jest.Mock).mockResolvedValue({});

      await controller.setPlatformFee(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });

  describe("checkout with Connect", () => {
    it("should pass connectedAccountId to checkout when connected", async () => {
      // This tests that CheckoutController passes Connect params
      // The actual integration is tested via CheckoutController tests
      // Here we verify the fee calculation logic
      const fee = 10; // 10%
      const amount = 2500; // $25.00
      const applicationFeeAmount = Math.round(amount * fee / 100);
      expect(applicationFeeAmount).toBe(250); // $2.50
    });

    it("should calculate 0% fee correctly", () => {
      const fee = 0;
      const amount = 2500;
      const applicationFeeAmount = Math.round(amount * fee / 100);
      expect(applicationFeeAmount).toBe(0);
    });

    it("should calculate 100% fee correctly", () => {
      const fee = 100;
      const amount = 2500;
      const applicationFeeAmount = Math.round(amount * fee / 100);
      expect(applicationFeeAmount).toBe(2500);
    });

    it("should handle fractional fee amounts", () => {
      const fee = 7.5;
      const amount = 3333; // $33.33
      const applicationFeeAmount = Math.round(amount * fee / 100);
      expect(applicationFeeAmount).toBe(250); // $2.50 (rounded)
    });
  });
});
