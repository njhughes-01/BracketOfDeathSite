import { Request, Response, NextFunction } from "express";
import { StripeWebhookController } from "../../controllers/StripeWebhookController";
import StripeEvent from "../../models/StripeEvent";
import TournamentTicket from "../../models/TournamentTicket";
import SlotReservation from "../../models/SlotReservation";
import DiscountCode from "../../models/DiscountCode";
import { Tournament } from "../../models/Tournament";
import { Player } from "../../models/Player";
import StripeService from "../../services/StripeService";
import QRCodeService from "../../services/QRCodeService";
import emailService from "../../services/EmailService";
import { generateTicketConfirmationEmail } from "../../services/email/templates/ticketConfirmation";
import { generateRefundConfirmationEmail } from "../../services/email/templates/refundConfirmation";
import { Types } from "mongoose";

jest.mock("../../models/StripeEvent");
jest.mock("../../models/TournamentTicket");
jest.mock("../../models/SlotReservation");
jest.mock("../../models/DiscountCode");
jest.mock("../../models/Tournament");
jest.mock("../../models/Player");
jest.mock("../../services/StripeService");
jest.mock("../../services/QRCodeService");
jest.mock("../../services/EmailService");
jest.mock("../../services/email/templates/ticketConfirmation");
jest.mock("../../services/email/templates/refundConfirmation");
jest.mock("../../utils/logger");

describe("StripeWebhookController", () => {
  let controller: StripeWebhookController;
  let mockRes: Partial<Response>;
  let nextMock: jest.Mock;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    controller = new StripeWebhookController();
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    nextMock = jest.fn();
    mockRes = { status: statusMock, json: jsonMock };
    jest.clearAllMocks();
    (StripeEvent.logEvent as jest.Mock).mockResolvedValue({});
  });

  describe("handleWebhook", () => {
    it("should return 400 for invalid signature", async () => {
      process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
      const mockReq = {
        headers: { "stripe-signature": "invalid_sig" },
        body: "raw_body",
      } as Partial<Request>;

      (StripeService.verifyWebhookSignature as jest.Mock).mockImplementation(() => {
        throw new Error("Invalid signature");
      });

      await controller.handleWebhook(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(400);
      delete process.env.STRIPE_WEBHOOK_SECRET;
    });

    it("should return 400 for invalid payload", async () => {
      const mockReq = {
        headers: {},
        body: {},
      } as Partial<Request>;

      await controller.handleWebhook(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it("should process checkout.session.completed", async () => {
      const tournamentId = new Types.ObjectId().toString();
      const playerId = new Types.ObjectId().toString();
      const reservationId = new Types.ObjectId().toString();

      const mockReq = {
        headers: {},
        body: {
          type: "checkout.session.completed",
          id: "evt_123",
          data: {
            object: {
              id: "sess_123",
              payment_intent: "pi_123",
              amount_total: 2000,
              currency: "usd",
              metadata: {
                tournamentId,
                userId: "user-123",
                playerId,
                reservationId,
              },
            },
          },
        },
      } as Partial<Request>;

      const saveMock = jest.fn().mockResolvedValue(undefined);
      const recordEmailMock = jest.fn().mockResolvedValue(undefined);
      (TournamentTicket as any).mockImplementation(() => ({
        ticketCode: "TKT-123",
        _id: new Types.ObjectId(),
        save: saveMock,
        recordEmailSent: recordEmailMock,
        qrCodeData: null,
        amountPaid: 2000,
      }));

      (SlotReservation.findById as jest.Mock).mockResolvedValue({
        complete: jest.fn().mockResolvedValue(undefined),
      });
      (Tournament.findByIdAndUpdate as jest.Mock).mockResolvedValue({});
      (Tournament.findById as jest.Mock).mockResolvedValue({
        bodNumber: "123456", date: new Date(), location: "Venue", format: "singles",
      });
      (Player.findById as jest.Mock).mockResolvedValue({ name: "Test", email: "test@test.com" });
      (QRCodeService.generateTicketQRCode as jest.Mock).mockResolvedValue("data:image/png;base64,abc");
      (emailService.getBrandingConfig as jest.Mock).mockResolvedValue({});
      (emailService.wrapInBrandedTemplate as jest.Mock).mockResolvedValue("<html></html>");
      (emailService.sendEmail as jest.Mock).mockResolvedValue(undefined);
      (generateTicketConfirmationEmail as jest.Mock).mockReturnValue({
        subject: "Ticket", text: "text", html: "<p>html</p>",
      });

      await controller.handleWebhook(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(saveMock).toHaveBeenCalled();
    });

    it("should process checkout.session.expired", async () => {
      const reservationId = new Types.ObjectId().toString();
      const tournamentId = new Types.ObjectId().toString();

      const mockReq = {
        headers: {},
        body: {
          type: "checkout.session.expired",
          id: "evt_456",
          data: {
            object: {
              id: "sess_456",
              metadata: { reservationId, tournamentId },
            },
          },
        },
      } as Partial<Request>;

      const saveMock = jest.fn().mockResolvedValue(undefined);
      (SlotReservation.findById as jest.Mock).mockResolvedValue({
        status: "active",
        save: saveMock,
      });
      (Tournament.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

      await controller.handleWebhook(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(saveMock).toHaveBeenCalled();
    });

    it("should process charge.refunded", async () => {
      const ticketId = new Types.ObjectId();
      const tournamentId = new Types.ObjectId();
      const playerId = new Types.ObjectId();

      const mockReq = {
        headers: {},
        body: {
          type: "charge.refunded",
          id: "evt_789",
          data: {
            object: {
              payment_intent: "pi_123",
              amount_refunded: 2000,
              currency: "usd",
            },
          },
        },
      } as Partial<Request>;

      const refundMock = jest.fn().mockResolvedValue(undefined);
      (TournamentTicket.findOne as jest.Mock).mockResolvedValue({
        _id: ticketId,
        tournamentId,
        playerId,
        userId: "user-123",
        ticketCode: "TKT-123",
        amountPaid: 2000,
        refund: refundMock,
      });
      (Tournament.findByIdAndUpdate as jest.Mock).mockResolvedValue({});
      (Tournament.findById as jest.Mock).mockResolvedValue({
        bodNumber: "123456", date: new Date(), location: "Venue",
      });
      (Player.findById as jest.Mock).mockResolvedValue({ name: "Test", email: "test@test.com" });
      (emailService.getBrandingConfig as jest.Mock).mockResolvedValue({});
      (emailService.wrapInBrandedTemplate as jest.Mock).mockResolvedValue("<html></html>");
      (emailService.sendEmail as jest.Mock).mockResolvedValue(undefined);
      (generateRefundConfirmationEmail as jest.Mock).mockReturnValue({
        subject: "Refund", text: "text", html: "<p>html</p>",
      });

      await controller.handleWebhook(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(refundMock).toHaveBeenCalled();
    });

    it("should handle unrecognized event types gracefully", async () => {
      const mockReq = {
        headers: {},
        body: {
          type: "some.unknown.event",
          id: "evt_unknown",
          data: { object: {} },
        },
      } as Partial<Request>;

      await controller.handleWebhook(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ received: true }));
    });

    it("should return 200 even on processing error to prevent retries", async () => {
      const mockReq = {
        headers: {},
        body: {
          type: "checkout.session.completed",
          id: "evt_err",
          data: {
            object: {
              id: "sess_err",
              metadata: {
                tournamentId: new Types.ObjectId().toString(),
                userId: "user-123",
                playerId: new Types.ObjectId().toString(),
              },
            },
          },
        },
      } as Partial<Request>;

      (SlotReservation.findById as jest.Mock).mockRejectedValue(new Error("DB error"));
      // TournamentTicket constructor will throw because save fails
      (TournamentTicket as any).mockImplementation(() => {
        throw new Error("DB error");
      });

      await controller.handleWebhook(mockReq as Request, mockRes as Response, nextMock);
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it("should increment discount code usage on checkout completed", async () => {
      const tournamentId = new Types.ObjectId().toString();
      const playerId = new Types.ObjectId().toString();

      const mockReq = {
        headers: {},
        body: {
          type: "checkout.session.completed",
          id: "evt_disc",
          data: {
            object: {
              id: "sess_disc",
              payment_intent: "pi_disc",
              amount_total: 1000,
              currency: "usd",
              metadata: {
                tournamentId,
                userId: "user-123",
                playerId,
                discountCode: "SAVE50",
              },
            },
          },
        },
      } as Partial<Request>;

      const saveMock = jest.fn().mockResolvedValue(undefined);
      (TournamentTicket as any).mockImplementation(() => ({
        ticketCode: "TKT-DISC",
        _id: new Types.ObjectId(),
        save: saveMock,
        recordEmailSent: jest.fn(),
        qrCodeData: null,
        amountPaid: 1000,
      }));

      (SlotReservation.findById as jest.Mock).mockResolvedValue(null);
      (Tournament.findByIdAndUpdate as jest.Mock).mockResolvedValue({});
      (QRCodeService.generateTicketQRCode as jest.Mock).mockResolvedValue("data:image/png;base64,abc");
      
      const redeemMock = jest.fn().mockResolvedValue(undefined);
      (DiscountCode.findOne as jest.Mock).mockResolvedValue({ redeem: redeemMock });
      
      // No player email to skip email sending
      (Tournament.findById as jest.Mock).mockResolvedValue(null);
      (Player.findById as jest.Mock).mockResolvedValue(null);

      await controller.handleWebhook(mockReq as Request, mockRes as Response, nextMock);
      expect(redeemMock).toHaveBeenCalled();
    });
  });
});
