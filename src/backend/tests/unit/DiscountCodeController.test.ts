import { Request, Response, NextFunction } from "express";
import { DiscountCodeController } from "../../controllers/DiscountCodeController";
import DiscountCode from "../../models/DiscountCode";
import StripeService from "../../services/StripeService";
import { Types } from "mongoose";

jest.mock("../../models/DiscountCode");
jest.mock("../../services/StripeService");
jest.mock("../../utils/logger");

describe("DiscountCodeController", () => {
  let controller: DiscountCodeController;
  let mockRes: Partial<Response>;
  let nextMock: jest.Mock;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    controller = new DiscountCodeController();
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    nextMock = jest.fn();
    mockRes = { status: statusMock, json: jsonMock };
    jest.clearAllMocks();
  });

  describe("list", () => {
    it("should return all active non-expired codes by default", async () => {
      const mockCodes = [{ code: "SAVE10" }];
      const sortMock = jest.fn().mockResolvedValue(mockCodes);
      (DiscountCode.find as jest.Mock).mockReturnValue({ sort: sortMock });

      const mockReq = { query: {} } as Partial<Request>;
      await controller.list(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it("should filter by active status", async () => {
      const sortMock = jest.fn().mockResolvedValue([]);
      (DiscountCode.find as jest.Mock).mockReturnValue({ sort: sortMock });

      const mockReq = { query: { active: "true" } } as Partial<Request>;
      await controller.list(mockReq as Request, mockRes as Response, nextMock);
      expect(DiscountCode.find).toHaveBeenCalledWith(expect.objectContaining({ active: true }));
    });

    it("should include expired codes when requested", async () => {
      const sortMock = jest.fn().mockResolvedValue([]);
      (DiscountCode.find as jest.Mock).mockReturnValue({ sort: sortMock });

      const mockReq = { query: { includeExpired: "true" } } as Partial<Request>;
      await controller.list(mockReq as Request, mockRes as Response, nextMock);
      // Should NOT have the $or expiry filter
      expect(DiscountCode.find).toHaveBeenCalledWith(expect.not.objectContaining({ $or: expect.anything() }));
    });
  });

  describe("get", () => {
    it("should return 400 for invalid ID", async () => {
      const mockReq = { params: { id: "invalid" } } as Partial<Request>;
      await controller.get(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it("should return 404 if not found", async () => {
      const mockReq = { params: { id: new Types.ObjectId().toString() } } as Partial<Request>;
      (DiscountCode.findById as jest.Mock).mockResolvedValue(null);
      await controller.get(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it("should return discount code", async () => {
      const mockCode = { _id: new Types.ObjectId(), code: "SAVE10" };
      const mockReq = { params: { id: mockCode._id.toString() } } as Partial<Request>;
      (DiscountCode.findById as jest.Mock).mockResolvedValue(mockCode);
      await controller.get(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });

  describe("create", () => {
    it("should return 400 if code or type missing", async () => {
      const mockReq = { body: {} } as Partial<Request>;
      await controller.create(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it("should return 400 if percent type missing percentOff", async () => {
      const mockReq = { body: { code: "SAVE", type: "percent" } } as Partial<Request>;
      await controller.create(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it("should return 400 if amount type missing amountOff", async () => {
      const mockReq = { body: { code: "FLAT", type: "amount" } } as Partial<Request>;
      await controller.create(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it("should return 409 if code already exists", async () => {
      const mockReq = { body: { code: "SAVE10", type: "percent", percentOff: 10 } } as Partial<Request>;
      (DiscountCode.findOne as jest.Mock).mockResolvedValue({ code: "SAVE10" });
      await controller.create(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(409);
    });

    it("should create percent discount code successfully", async () => {
      const mockReq = { body: { code: "SAVE10", type: "percent", percentOff: 10 } } as Partial<Request>;
      (DiscountCode.findOne as jest.Mock).mockResolvedValue(null);
      (StripeService.isStripeConfigured as jest.Mock).mockResolvedValue(false);
      const saveMock = jest.fn().mockResolvedValue(undefined);
      (DiscountCode as any).mockImplementation(() => ({ save: saveMock, code: "SAVE10" }));

      await controller.create(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(saveMock).toHaveBeenCalled();
    });

    it("should create Stripe coupon when configured", async () => {
      const mockReq = { body: { code: "SAVE10", type: "percent", percentOff: 10 } } as Partial<Request>;
      (DiscountCode.findOne as jest.Mock).mockResolvedValue(null);
      (StripeService.isStripeConfigured as jest.Mock).mockResolvedValue(true);
      (StripeService.createCoupon as jest.Mock).mockResolvedValue({ id: "coupon_123" });
      const saveMock = jest.fn().mockResolvedValue(undefined);
      (DiscountCode as any).mockImplementation(() => ({ save: saveMock, code: "SAVE10" }));

      await controller.create(mockReq as Request, mockRes as Response, nextMock);
      expect(StripeService.createCoupon).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(201);
    });
  });

  describe("update", () => {
    it("should return 400 for invalid ID", async () => {
      const mockReq = { params: { id: "invalid" }, body: {} } as Partial<Request>;
      await controller.update(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it("should return 404 if not found", async () => {
      const mockReq = { params: { id: new Types.ObjectId().toString() }, body: {} } as Partial<Request>;
      (DiscountCode.findById as jest.Mock).mockResolvedValue(null);
      await controller.update(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it("should update allowed fields", async () => {
      const saveMock = jest.fn().mockResolvedValue(undefined);
      const mockCode = {
        _id: new Types.ObjectId(),
        code: "SAVE10",
        maxRedemptions: 5,
        active: true,
        save: saveMock,
      };
      const mockReq = {
        params: { id: mockCode._id.toString() },
        body: { maxRedemptions: 10, active: false },
      } as Partial<Request>;
      (DiscountCode.findById as jest.Mock).mockResolvedValue(mockCode);
      (StripeService.deleteCoupon as jest.Mock).mockResolvedValue(undefined);

      await controller.update(mockReq as Request, mockRes as Response, nextMock);
      expect(mockCode.maxRedemptions).toBe(10);
      expect(mockCode.active).toBe(false);
      expect(saveMock).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });

  describe("deactivate", () => {
    it("should deactivate code and delete Stripe coupon", async () => {
      const saveMock = jest.fn().mockResolvedValue(undefined);
      const mockCode = {
        _id: new Types.ObjectId(),
        code: "SAVE10",
        active: true,
        stripeCouponId: "coupon_123",
        save: saveMock,
      };
      const mockReq = { params: { id: mockCode._id.toString() } } as Partial<Request>;
      (DiscountCode.findById as jest.Mock).mockResolvedValue(mockCode);
      (StripeService.isStripeConfigured as jest.Mock).mockResolvedValue(true);
      (StripeService.deleteCoupon as jest.Mock).mockResolvedValue(undefined);

      await controller.deactivate(mockReq as Request, mockRes as Response, nextMock);
      expect(mockCode.active).toBe(false);
      expect(StripeService.deleteCoupon).toHaveBeenCalledWith("coupon_123");
    });
  });

  describe("validate", () => {
    it("should return 400 if code missing", async () => {
      const mockReq = { body: {} } as Partial<Request>;
      await controller.validate(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it("should return not_found for unknown code", async () => {
      const mockReq = { body: { code: "INVALID" } } as Partial<Request>;
      (DiscountCode.findOne as jest.Mock).mockResolvedValue(null);
      await controller.validate(mockReq as Request, mockRes as Response, nextMock);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ valid: false, error: "not_found" }),
      }));
    });

    it("should return expired for expired code", async () => {
      const mockReq = { body: { code: "EXPIRED" } } as Partial<Request>;
      (DiscountCode.findOne as jest.Mock).mockResolvedValue({
        expiresAt: new Date("2020-01-01"),
      });
      await controller.validate(mockReq as Request, mockRes as Response, nextMock);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ valid: false, error: "expired" }),
      }));
    });

    it("should return limit_reached when maxed out", async () => {
      const mockReq = { body: { code: "MAXED" } } as Partial<Request>;
      (DiscountCode.findOne as jest.Mock).mockResolvedValue({
        maxRedemptions: 5,
        redemptionCount: 5,
      });
      await controller.validate(mockReq as Request, mockRes as Response, nextMock);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ valid: false, error: "limit_reached" }),
      }));
    });

    it("should return not_applicable for wrong tournament", async () => {
      const mockReq = { body: { code: "SPECIFIC", tournamentId: "tid123" } } as Partial<Request>;
      (DiscountCode.findOne as jest.Mock).mockResolvedValue({
        appliesToTournament: jest.fn().mockReturnValue(false),
      });
      await controller.validate(mockReq as Request, mockRes as Response, nextMock);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ valid: false, error: "not_applicable" }),
      }));
    });

    it("should return valid for good code", async () => {
      const mockReq = { body: { code: "SAVE10", tournamentId: "tid123" } } as Partial<Request>;
      (DiscountCode.findOne as jest.Mock).mockResolvedValue({
        type: "percent",
        percentOff: 10,
        code: "SAVE10",
        appliesToTournament: jest.fn().mockReturnValue(true),
      });
      await controller.validate(mockReq as Request, mockRes as Response, nextMock);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ valid: true, discountType: "percent", discountValue: 10 }),
      }));
    });
  });
});
