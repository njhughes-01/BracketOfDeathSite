import { Request, Response, NextFunction } from "express";
import { CheckoutController } from "../../controllers/CheckoutController";
import { Tournament } from "../../models/Tournament";
import { Player } from "../../models/Player";
import SlotReservation from "../../models/SlotReservation";
import TournamentTicket from "../../models/TournamentTicket";
import DiscountCode from "../../models/DiscountCode";
import SystemSettings from "../../models/SystemSettings";
import StripeService from "../../services/StripeService";
import QRCodeService from "../../services/QRCodeService";
import emailService from "../../services/EmailService";
import { generateTicketConfirmationEmail } from "../../services/email/templates/ticketConfirmation";
import { Types } from "mongoose";

jest.mock("../../models/Tournament");
jest.mock("../../models/Player");
jest.mock("../../models/SlotReservation");
jest.mock("../../models/TournamentTicket");
jest.mock("../../models/DiscountCode");
jest.mock("../../models/SystemSettings");
jest.mock("../../services/StripeService");
jest.mock("../../services/QRCodeService");
jest.mock("../../services/EmailService");
jest.mock("../../services/email/templates/ticketConfirmation");
jest.mock("../../utils/logger");

describe("CheckoutController", () => {
  let controller: CheckoutController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextMock: jest.Mock;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  const validTournamentId = new Types.ObjectId().toString();
  const validPlayerId = new Types.ObjectId();
  const validUserId = "user-123";

  beforeEach(() => {
    controller = new CheckoutController();
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    nextMock = jest.fn();
    mockRes = { status: statusMock, json: jsonMock };
    jest.clearAllMocks();
  });

  describe("reserveSlot", () => {
    beforeEach(() => {
      mockReq = {
        params: { id: validTournamentId },
      };
    });

    it("should return 401 if not authenticated", async () => {
      (mockReq as any).user = undefined;
      await controller.reserveSlot(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it("should return 400 for invalid tournament ID", async () => {
      mockReq.params = { id: "invalid" };
      (mockReq as any).user = { sub: validUserId };
      await controller.reserveSlot(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it("should return 404 if tournament not found", async () => {
      (mockReq as any).user = { sub: validUserId };
      (Tournament.findById as jest.Mock).mockResolvedValue(null);
      await controller.reserveSlot(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it("should return 400 if tournament is not open", async () => {
      (mockReq as any).user = { sub: validUserId };
      (Tournament.findById as jest.Mock).mockResolvedValue({ status: "closed", registeredPlayers: [] });
      await controller.reserveSlot(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: "Tournament is not open for registration" }));
    });

    it("should return 400 if tournament is full", async () => {
      (mockReq as any).user = { sub: validUserId };
      (Tournament.findById as jest.Mock).mockResolvedValue({
        status: "open",
        registeredPlayers: [{ playerId: new Types.ObjectId() }],
        maxPlayers: 2,
      });
      (SlotReservation.countActiveReservations as jest.Mock).mockResolvedValue(1);
      await controller.reserveSlot(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: "Tournament is full" }));
    });

    it("should return 400 if player profile not found", async () => {
      (mockReq as any).user = { sub: validUserId };
      (Tournament.findById as jest.Mock).mockResolvedValue({
        status: "open", registeredPlayers: [], maxPlayers: 10,
      });
      (SlotReservation.countActiveReservations as jest.Mock).mockResolvedValue(0);
      (Player.findOne as jest.Mock).mockResolvedValue(null);
      await controller.reserveSlot(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: "Player profile not found" }));
    });

    it("should return 400 if already registered", async () => {
      (mockReq as any).user = { sub: validUserId };
      const pid = new Types.ObjectId();
      (Tournament.findById as jest.Mock).mockResolvedValue({
        status: "open",
        registeredPlayers: [{ playerId: pid }],
        maxPlayers: 10,
      });
      (SlotReservation.countActiveReservations as jest.Mock).mockResolvedValue(0);
      (Player.findOne as jest.Mock).mockResolvedValue({ _id: pid });
      await controller.reserveSlot(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: "Already registered for this tournament" }));
    });

    it("should return 400 if user already has a valid ticket", async () => {
      (mockReq as any).user = { sub: validUserId };
      const pid = new Types.ObjectId();
      (Tournament.findById as jest.Mock).mockResolvedValue({
        status: "open", registeredPlayers: [], maxPlayers: 10,
      });
      (SlotReservation.countActiveReservations as jest.Mock).mockResolvedValue(0);
      (Player.findOne as jest.Mock).mockResolvedValue({ _id: pid });
      (TournamentTicket.findOne as jest.Mock).mockResolvedValue({ _id: "ticket1" });
      await controller.reserveSlot(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it("should create reservation successfully", async () => {
      (mockReq as any).user = { sub: validUserId };
      const pid = new Types.ObjectId();
      (Tournament.findById as jest.Mock).mockResolvedValue({
        status: "open", registeredPlayers: [], maxPlayers: 10,
      });
      (SlotReservation.countActiveReservations as jest.Mock).mockResolvedValue(0);
      (Player.findOne as jest.Mock).mockResolvedValue({ _id: pid });
      (TournamentTicket.findOne as jest.Mock).mockResolvedValue(null);
      const mockReservation = {
        _id: new Types.ObjectId(),
        expiresAt: new Date(Date.now() + 35 * 60000),
        remainingSeconds: 2100,
      };
      (SlotReservation.createReservation as jest.Mock).mockResolvedValue(mockReservation);
      (Tournament.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

      await controller.reserveSlot(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ reservationId: mockReservation._id }),
      }));
    });
  });

  describe("cancelReservation", () => {
    it("should return 401 if not authenticated", async () => {
      mockReq = { params: { id: validTournamentId } };
      (mockReq as any).user = undefined;
      await controller.cancelReservation(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it("should return 404 if no active reservation", async () => {
      mockReq = { params: { id: validTournamentId } };
      (mockReq as any).user = { sub: validUserId };
      (SlotReservation.getActiveReservation as jest.Mock).mockResolvedValue(null);
      await controller.cancelReservation(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it("should cancel reservation and decrement spots", async () => {
      mockReq = { params: { id: validTournamentId } };
      (mockReq as any).user = { sub: validUserId };
      const mockReservation = { cancel: jest.fn().mockResolvedValue(undefined) };
      (SlotReservation.getActiveReservation as jest.Mock).mockResolvedValue(mockReservation);
      (Tournament.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

      await controller.cancelReservation(mockReq as Request, mockRes as Response, nextMock);
      expect(mockReservation.cancel).toHaveBeenCalled();
      expect(Tournament.findByIdAndUpdate).toHaveBeenCalledWith(
        validTournamentId,
        { $inc: { spotsReserved: -1 } }
      );
      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });

  describe("createCheckoutSession", () => {
    const reservationId = new Types.ObjectId().toString();

    beforeEach(() => {
      mockReq = {
        body: { tournamentId: validTournamentId, reservationId },
      };
      // Mock SystemSettings for Connect lookup (no connected account by default)
      (SystemSettings.findOne as jest.Mock).mockResolvedValue(null);
    });

    it("should return 401 if not authenticated", async () => {
      (mockReq as any).user = undefined;
      await controller.createCheckoutSession(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it("should return 400 if missing tournamentId or reservationId", async () => {
      mockReq.body = {};
      (mockReq as any).user = { sub: validUserId };
      await controller.createCheckoutSession(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it("should return 400 if reservation is invalid", async () => {
      (mockReq as any).user = { sub: validUserId };
      (SlotReservation.findById as jest.Mock).mockResolvedValue(null);
      await controller.createCheckoutSession(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it("should return 403 if reservation belongs to another user", async () => {
      (mockReq as any).user = { sub: validUserId };
      (SlotReservation.findById as jest.Mock).mockResolvedValue({
        isValid: true, userId: { toString: () => "other-user" },
      });
      await controller.createCheckoutSession(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it("should return free redirect if price is 0", async () => {
      (mockReq as any).user = { sub: validUserId };
      (SlotReservation.findById as jest.Mock).mockResolvedValue({
        isValid: true, userId: { toString: () => validUserId }, playerId: validPlayerId,
      });
      (Tournament.findById as jest.Mock).mockResolvedValue({ entryFee: 0 });
      await controller.createCheckoutSession(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ isFree: true }),
      }));
    });

    it("should apply percentage discount code", async () => {
      (mockReq as any).user = { sub: validUserId, email: "test@test.com" };
      mockReq.body.discountCode = "SAVE50";
      (SlotReservation.findById as jest.Mock).mockResolvedValue({
        isValid: true, userId: { toString: () => validUserId }, playerId: validPlayerId,
        expiresAt: new Date(Date.now() + 35 * 60000), save: jest.fn(),
      });
      (Tournament.findById as jest.Mock).mockResolvedValue({ entryFee: 2000, bodNumber: "123456" });
      (DiscountCode.findOne as jest.Mock).mockResolvedValue({
        isUsable: true,
        appliesToTournament: jest.fn().mockReturnValue(true),
        type: "percent",
        percentOff: 50,
        code: "SAVE50",
      });
      (StripeService.isStripeConfigured as jest.Mock).mockResolvedValue(true);
      (Player.findById as jest.Mock).mockResolvedValue({ email: "test@test.com" });
      (StripeService.createCheckoutSession as jest.Mock).mockResolvedValue({
        id: "sess_123", url: "https://stripe.com/checkout",
      });

      await controller.createCheckoutSession(mockReq as Request, mockRes as Response, nextMock);
      expect(StripeService.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 1000 })
      );
    });

    it("should apply amount discount code", async () => {
      (mockReq as any).user = { sub: validUserId, email: "test@test.com" };
      mockReq.body.discountCode = "FLAT5";
      (SlotReservation.findById as jest.Mock).mockResolvedValue({
        isValid: true, userId: { toString: () => validUserId }, playerId: validPlayerId,
        expiresAt: new Date(Date.now() + 35 * 60000), save: jest.fn(),
      });
      (Tournament.findById as jest.Mock).mockResolvedValue({ entryFee: 2000, bodNumber: "123456" });
      (DiscountCode.findOne as jest.Mock).mockResolvedValue({
        isUsable: true,
        appliesToTournament: jest.fn().mockReturnValue(true),
        type: "amount",
        amountOff: 500,
        code: "FLAT5",
      });
      (StripeService.isStripeConfigured as jest.Mock).mockResolvedValue(true);
      (Player.findById as jest.Mock).mockResolvedValue({ email: "test@test.com" });
      (StripeService.createCheckoutSession as jest.Mock).mockResolvedValue({
        id: "sess_123", url: "https://stripe.com/checkout",
      });

      await controller.createCheckoutSession(mockReq as Request, mockRes as Response, nextMock);
      expect(StripeService.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 1500 })
      );
    });

    it("should return 503 if Stripe is not configured", async () => {
      (mockReq as any).user = { sub: validUserId };
      (SlotReservation.findById as jest.Mock).mockResolvedValue({
        isValid: true, userId: { toString: () => validUserId }, playerId: validPlayerId,
      });
      (Tournament.findById as jest.Mock).mockResolvedValue({ entryFee: 2000 });
      (StripeService.isStripeConfigured as jest.Mock).mockResolvedValue(false);
      await controller.createCheckoutSession(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(503);
    });

    it("should create checkout session successfully", async () => {
      (mockReq as any).user = { sub: validUserId, email: "test@test.com" };
      (SlotReservation.findById as jest.Mock).mockResolvedValue({
        isValid: true, userId: { toString: () => validUserId }, playerId: validPlayerId,
        expiresAt: new Date(Date.now() + 35 * 60000), save: jest.fn(),
      });
      (Tournament.findById as jest.Mock).mockResolvedValue({ entryFee: 2000, bodNumber: "123456" });
      (StripeService.isStripeConfigured as jest.Mock).mockResolvedValue(true);
      (Player.findById as jest.Mock).mockResolvedValue({ email: "test@test.com" });
      (StripeService.createCheckoutSession as jest.Mock).mockResolvedValue({
        id: "sess_123", url: "https://stripe.com/checkout",
      });

      await controller.createCheckoutSession(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ sessionId: "sess_123" }),
      }));
    });
  });

  describe("completeFreeRegistration", () => {
    const reservationId = new Types.ObjectId().toString();

    beforeEach(() => {
      mockReq = {
        body: { tournamentId: validTournamentId, reservationId },
      };
    });

    it("should return 401 if not authenticated", async () => {
      (mockReq as any).user = undefined;
      await controller.completeFreeRegistration(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it("should return 400 if tournament requires payment", async () => {
      (mockReq as any).user = { sub: validUserId };
      (SlotReservation.findById as jest.Mock).mockResolvedValue({
        isValid: true, userId: { toString: () => validUserId }, playerId: validPlayerId,
      });
      (Tournament.findById as jest.Mock).mockResolvedValue({ entryFee: 2000 });
      await controller.completeFreeRegistration(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: "Tournament requires payment" }));
    });

    it("should create ticket with QR code for free tournament", async () => {
      (mockReq as any).user = { sub: validUserId };
      (SlotReservation.findById as jest.Mock).mockResolvedValue({
        isValid: true, userId: { toString: () => validUserId }, playerId: validPlayerId,
        complete: jest.fn(),
      });
      (Tournament.findById as jest.Mock).mockResolvedValue({
        entryFee: 0, bodNumber: "123456", date: new Date(), location: "Venue", format: "singles",
      });
      (Tournament.findByIdAndUpdate as jest.Mock).mockResolvedValue({});
      (QRCodeService.generateTicketQRCode as jest.Mock).mockResolvedValue("data:image/png;base64,abc");
      
      // Mock TournamentTicket constructor
      const saveMock = jest.fn().mockResolvedValue(undefined);
      const recordEmailMock = jest.fn().mockResolvedValue(undefined);
      (TournamentTicket as any).mockImplementation(() => ({
        ticketCode: "TKT-123",
        _id: new Types.ObjectId(),
        save: saveMock,
        recordEmailSent: recordEmailMock,
        qrCodeData: null,
      }));
      
      (Player.findById as jest.Mock).mockResolvedValue({ name: "Test Player", email: "test@test.com" });
      (emailService.getBrandingConfig as jest.Mock).mockResolvedValue({});
      (emailService.wrapInBrandedTemplate as jest.Mock).mockResolvedValue("<html></html>");
      (emailService.sendEmail as jest.Mock).mockResolvedValue(undefined);
      (generateTicketConfirmationEmail as jest.Mock).mockReturnValue({
        subject: "Your Ticket", text: "ticket", html: "<p>ticket</p>",
      });

      await controller.completeFreeRegistration(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(saveMock).toHaveBeenCalled();
    });
  });

  describe("getSessionStatus", () => {
    it("should return session data", async () => {
      mockReq = { params: { sessionId: "sess_123" } };
      (StripeService.retrieveCheckoutSession as jest.Mock).mockResolvedValue({
        payment_status: "paid",
        metadata: { reservationId: "res1", tournamentId: validTournamentId },
        amount_total: 2000,
        currency: "usd",
        customer_email: "test@test.com",
      });
      (TournamentTicket.findOne as jest.Mock).mockResolvedValue({
        id: "ticket1", ticketCode: "TKT-123", status: "valid",
      });
      (Tournament.findById as jest.Mock).mockResolvedValue({
        _id: validTournamentId, bodNumber: "123456", date: new Date(), location: "Venue",
      });

      await controller.getSessionStatus(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ sessionId: "sess_123" }),
      }));
    });

    it("should return 400 if session retrieval fails", async () => {
      mockReq = { params: { sessionId: "invalid" } };
      (StripeService.retrieveCheckoutSession as jest.Mock).mockRejectedValue(new Error("not found"));
      await controller.getSessionStatus(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });

  describe("getReservation", () => {
    it("should return 401 if not authenticated", async () => {
      mockReq = { params: { id: validTournamentId } };
      (mockReq as any).user = undefined;
      await controller.getReservation(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it("should return hasReservation false if none exists", async () => {
      mockReq = { params: { id: validTournamentId } };
      (mockReq as any).user = { sub: validUserId };
      (SlotReservation.getActiveReservation as jest.Mock).mockResolvedValue(null);
      await controller.getReservation(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ hasReservation: false }),
      }));
    });
  });
});
