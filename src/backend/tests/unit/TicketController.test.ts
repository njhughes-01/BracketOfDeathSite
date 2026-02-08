import { Request, Response } from "express";
import { TicketController } from "../../controllers/TicketController";
import TournamentTicket from "../../models/TournamentTicket";
import { Tournament } from "../../models/Tournament";
import StripeService from "../../services/StripeService";

// Mock models and services
jest.mock("../../models/TournamentTicket");
jest.mock("../../models/Tournament");
jest.mock("../../services/StripeService");
jest.mock("../../utils/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

describe("TicketController", () => {
  let controller: TicketController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    controller = new TicketController();
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
    jest.clearAllMocks();
  });

  describe("refundTicket", () => {
    const makeTicket = (overrides: any = {}) => ({
      _id: "ticket123",
      ticketCode: "BOD-ABC123",
      status: "valid",
      paymentStatus: "paid",
      stripePaymentIntentId: "pi_test123",
      amountPaid: 2500,
      playerId: { _id: "player1", firstName: "John", lastName: "Doe" },
      tournamentId: { _id: "tourney1" },
      save: jest.fn().mockResolvedValue(true),
      ...overrides,
    });

    it("should refund a paid ticket (full refund)", async () => {
      const ticket = makeTicket();
      (TournamentTicket.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(ticket),
        }),
      });
      (StripeService.createRefund as jest.Mock).mockResolvedValue({ id: "re_123" });
      (Tournament.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

      mockReq = {
        params: { id: "507f1f77bcf86cd799439011" },
        body: {},
        user: { sub: "admin1" },
      } as any;

      await controller.refundTicket(mockReq as Request, mockRes as Response, jest.fn());

      expect(StripeService.createRefund).toHaveBeenCalledWith("pi_test123", undefined, "requested_by_customer");
      expect(ticket.save).toHaveBeenCalled();
      expect(ticket.status).toBe("refunded");
      expect(ticket.paymentStatus).toBe("refunded");
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, message: "Ticket refunded successfully" })
      );
    });

    it("should support partial refund", async () => {
      const ticket = makeTicket();
      (TournamentTicket.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(ticket),
        }),
      });
      (StripeService.createRefund as jest.Mock).mockResolvedValue({ id: "re_123" });
      (Tournament.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

      mockReq = {
        params: { id: "507f1f77bcf86cd799439011" },
        body: { amount: 1000 },
        user: { sub: "admin1" },
      } as any;

      await controller.refundTicket(mockReq as Request, mockRes as Response, jest.fn());

      expect(StripeService.createRefund).toHaveBeenCalledWith("pi_test123", 1000, "requested_by_customer");
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it("should reject if ticket already refunded", async () => {
      const ticket = makeTicket({ status: "refunded" });
      (TournamentTicket.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(ticket),
        }),
      });

      mockReq = {
        params: { id: "507f1f77bcf86cd799439011" },
        body: {},
        user: { sub: "admin1" },
      } as any;

      await controller.refundTicket(mockReq as Request, mockRes as Response, jest.fn());

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Ticket is already refunded" })
      );
    });

    it("should reject if ticket is free (not paid)", async () => {
      const ticket = makeTicket({ paymentStatus: "free" });
      (TournamentTicket.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(ticket),
        }),
      });

      mockReq = {
        params: { id: "507f1f77bcf86cd799439011" },
        body: {},
        user: { sub: "admin1" },
      } as any;

      await controller.refundTicket(mockReq as Request, mockRes as Response, jest.fn());

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Ticket has no paid payment to refund" })
      );
    });

    it("should reject if refund amount exceeds amount paid", async () => {
      const ticket = makeTicket();
      (TournamentTicket.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(ticket),
        }),
      });

      mockReq = {
        params: { id: "507f1f77bcf86cd799439011" },
        body: { amount: 5000 },
        user: { sub: "admin1" },
      } as any;

      await controller.refundTicket(mockReq as Request, mockRes as Response, jest.fn());

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Refund amount cannot exceed amount paid" })
      );
    });

    it("should reject invalid ticket ID", async () => {
      mockReq = {
        params: { id: "invalid" },
        body: {},
        user: { sub: "admin1" },
      } as any;

      await controller.refundTicket(mockReq as Request, mockRes as Response, jest.fn());

      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it("should handle Stripe refund failure", async () => {
      const ticket = makeTicket();
      (TournamentTicket.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(ticket),
        }),
      });
      (StripeService.createRefund as jest.Mock).mockRejectedValue(new Error("Stripe error"));

      mockReq = {
        params: { id: "507f1f77bcf86cd799439011" },
        body: {},
        user: { sub: "admin1" },
      } as any;

      await controller.refundTicket(mockReq as Request, mockRes as Response, jest.fn());

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(ticket.status).toBe("valid"); // Not changed
    });

    it("should return 404 if ticket not found", async () => {
      (TournamentTicket.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(null),
        }),
      });

      mockReq = {
        params: { id: "507f1f77bcf86cd799439011" },
        body: {},
        user: { sub: "admin1" },
      } as any;

      await controller.refundTicket(mockReq as Request, mockRes as Response, jest.fn());

      expect(statusMock).toHaveBeenCalledWith(404);
    });
  });

  describe("removeFromTournament", () => {
    const makeTicket = (overrides: any = {}) => ({
      _id: "ticket123",
      ticketCode: "BOD-ABC123",
      status: "valid",
      paymentStatus: "paid",
      playerId: { _id: "player1", firstName: "John", lastName: "Doe" },
      tournamentId: { _id: "tourney1" },
      save: jest.fn().mockResolvedValue(true),
      ...overrides,
    });

    it("should void a ticket without refund", async () => {
      const ticket = makeTicket();
      (TournamentTicket.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(ticket),
        }),
      });
      (Tournament.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

      mockReq = {
        params: { id: "507f1f77bcf86cd799439011" },
        body: {},
        user: { sub: "admin1" },
      } as any;

      await controller.removeFromTournament(mockReq as Request, mockRes as Response, jest.fn());

      expect(ticket.status).toBe("void");
      expect(ticket.save).toHaveBeenCalled();
      expect(StripeService.createRefund).not.toHaveBeenCalled();
      expect(Tournament.findByIdAndUpdate).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it("should reject if ticket already void", async () => {
      const ticket = makeTicket({ status: "void" });
      (TournamentTicket.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(ticket),
        }),
      });

      mockReq = {
        params: { id: "507f1f77bcf86cd799439011" },
        body: {},
        user: { sub: "admin1" },
      } as any;

      await controller.removeFromTournament(mockReq as Request, mockRes as Response, jest.fn());

      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it("should reject if ticket already refunded", async () => {
      const ticket = makeTicket({ status: "refunded" });
      (TournamentTicket.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(ticket),
        }),
      });

      mockReq = {
        params: { id: "507f1f77bcf86cd799439011" },
        body: {},
        user: { sub: "admin1" },
      } as any;

      await controller.removeFromTournament(mockReq as Request, mockRes as Response, jest.fn());

      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });

  describe("getTournamentTransactions", () => {
    it("should return all transactions for a tournament", async () => {
      const mockTickets = [
        {
          _id: "t1",
          ticketCode: "BOD-111",
          playerId: { _id: "p1", firstName: "John", lastName: "Doe" },
          teamId: null,
          status: "valid",
          paymentStatus: "paid",
          amountPaid: 2500,
          discountCodeUsed: null,
          stripePaymentIntentId: "pi_1",
          createdAt: new Date("2026-01-01"),
          updatedAt: new Date("2026-01-01"),
        },
        {
          _id: "t2",
          ticketCode: "BOD-222",
          playerId: { _id: "p2", firstName: "Jane", lastName: "Smith" },
          teamId: null,
          status: "refunded",
          paymentStatus: "refunded",
          amountPaid: 2500,
          discountCodeUsed: "SAVE10",
          stripePaymentIntentId: "pi_2",
          createdAt: new Date("2026-01-02"),
          updatedAt: new Date("2026-01-03"),
        },
      ];

      (TournamentTicket.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue(mockTickets),
          }),
        }),
      });

      mockReq = {
        params: { id: "507f1f77bcf86cd799439011" },
        query: {},
      } as any;

      await controller.getTournamentTransactions(mockReq as Request, mockRes as Response, jest.fn());

      expect(statusMock).toHaveBeenCalledWith(200);
      const responseData = jsonMock.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data.transactions).toHaveLength(2);
      expect(responseData.data.summary.totalTickets).toBe(2);
      expect(responseData.data.summary.paidCount).toBe(1);
      expect(responseData.data.summary.refundedCount).toBe(1);
    });

    it("should filter by status", async () => {
      (TournamentTicket.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      mockReq = {
        params: { id: "507f1f77bcf86cd799439011" },
        query: { status: "paid" },
      } as any;

      await controller.getTournamentTransactions(mockReq as Request, mockRes as Response, jest.fn());

      expect(TournamentTicket.find).toHaveBeenCalledWith(
        expect.objectContaining({ paymentStatus: "paid" })
      );
    });

    it("should reject invalid tournament ID", async () => {
      mockReq = {
        params: { id: "invalid" },
        query: {},
      } as any;

      await controller.getTournamentTransactions(mockReq as Request, mockRes as Response, jest.fn());

      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });

  describe("getTransactionHistory", () => {
    it("should return user's transaction history", async () => {
      const mockTickets = [
        {
          _id: "t1",
          ticketCode: "BOD-111",
          tournamentId: { _id: "tour1", bodNumber: 5, date: new Date(), location: "NYC", format: "singles", status: "completed" },
          teamId: null,
          status: "valid",
          paymentStatus: "paid",
          amountPaid: 2500,
          discountCodeUsed: null,
          createdAt: new Date("2026-01-01"),
        },
      ];

      (TournamentTicket.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue(mockTickets),
          }),
        }),
      });

      mockReq = {
        user: { sub: "user123" },
      } as any;

      await controller.getTransactionHistory(mockReq as Request, mockRes as Response, jest.fn());

      expect(TournamentTicket.find).toHaveBeenCalledWith({ userId: "user123" });
      expect(statusMock).toHaveBeenCalledWith(200);
      const responseData = jsonMock.mock.calls[0][0];
      expect(responseData.data.history).toHaveLength(1);
      expect(responseData.data.history[0].ticketCode).toBe("BOD-111");
    });

    it("should require authentication", async () => {
      mockReq = {
        user: {},
      } as any;

      await controller.getTransactionHistory(mockReq as Request, mockRes as Response, jest.fn());

      expect(statusMock).toHaveBeenCalledWith(401);
    });
  });
});
