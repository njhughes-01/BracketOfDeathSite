import { Request, Response } from "express";
import { BaseController } from "./base";
import TournamentTicket from "../models/TournamentTicket";
import { Tournament } from "../models/Tournament";
import { Player } from "../models/Player";
import { Types } from "mongoose";
import logger from "../utils/logger";
import emailService from "../services/EmailService";
import { generateTicketConfirmationEmail } from "../services/email/templates/ticketConfirmation";
import StripeService from "../services/StripeService";

export class TicketController extends BaseController {
  constructor() {
    super();
  }

  // Get user's tickets (GET /api/tickets)
  getMyTickets = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = (req as any).user?.sub || (req as any).user?.id;
      
      if (!userId) {
        return this.sendError(res, "Authentication required", 401);
      }
      
      const rawTickets = await TournamentTicket.getForUser(userId);
      
      // Transform tickets to match frontend TicketData interface
      const tickets = rawTickets.map((t: any) => {
        const doc = t.toObject ? t.toObject() : t;
        const tournament = doc.tournamentId && typeof doc.tournamentId === 'object' ? {
          id: doc.tournamentId._id?.toString() || doc.tournamentId.toString(),
          name: `BOD Tournament #${doc.tournamentId.bodNumber || '?'}`,
          date: doc.tournamentId.date,
          location: doc.tournamentId.location,
        } : null;
        return {
          id: doc._id?.toString(),
          ticketCode: doc.ticketCode,
          tournament,
          status: doc.status,
          paymentStatus: doc.paymentStatus,
          amountPaid: doc.amountPaid || 0,
          checkedInAt: doc.checkedInAt,
          createdAt: doc.createdAt,
        };
      });
      
      this.sendSuccess(res, { tickets }, "Tickets retrieved successfully");
    }
  );

  // Get user's ticket for a specific tournament (GET /api/tickets/tournament/:tournamentId/mine)
  getMyTicketForTournament = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = (req as any).user?.sub || (req as any).user?.id;
      const { tournamentId } = req.params;
      
      if (!userId) {
        return this.sendError(res, "Authentication required", 401);
      }
      
      if (!Types.ObjectId.isValid(tournamentId)) {
        return this.sendError(res, "Invalid tournament ID", 400);
      }
      
      const ticket = await TournamentTicket.findOne({ 
        tournamentId: new Types.ObjectId(tournamentId),
        userId: userId,
        status: { $nin: ['void'] }
      });
      
      if (!ticket) {
        return this.sendSuccess(res, { ticket: null }, "No ticket found");
      }
      
      this.sendSuccess(res, { ticket }, "Ticket found");
    }
  );

  // Get single ticket (GET /api/tickets/:id)
  getTicket = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const userId = (req as any).user?.sub || (req as any).user?.id;
      
      if (!userId) {
        return this.sendError(res, "Authentication required", 401);
      }
      
      if (!Types.ObjectId.isValid(id)) {
        return this.sendError(res, "Invalid ticket ID", 400);
      }
      
      const ticket = await TournamentTicket.findById(id)
        .populate('tournamentId', 'bodNumber date location format status')
        .populate('playerId', 'firstName lastName');
      
      if (!ticket) {
        return this.sendNotFound(res, "Ticket");
      }
      
      // Verify ownership (unless admin)
      const isAdmin = (req as any).user?.roles?.includes('admin') || 
                      (req as any).user?.roles?.includes('superadmin');
      if (!isAdmin && ticket.userId.toString() !== userId) {
        return this.sendError(res, "Access denied", 403);
      }
      
      this.sendSuccess(res, { ticket }, "Ticket retrieved successfully");
    }
  );

  // Resend ticket email (POST /api/tickets/:id/resend)
  resendTicket = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const userId = (req as any).user?.sub || (req as any).user?.id;
      
      if (!userId) {
        return this.sendError(res, "Authentication required", 401);
      }
      
      if (!Types.ObjectId.isValid(id)) {
        return this.sendError(res, "Invalid ticket ID", 400);
      }
      
      const ticket = await TournamentTicket.findById(id)
        .populate('tournamentId', 'bodNumber date location format')
        .populate('playerId', 'firstName lastName email');
      
      if (!ticket) {
        return this.sendNotFound(res, "Ticket");
      }
      
      // Verify ownership
      if (ticket.userId.toString() !== userId) {
        return this.sendError(res, "Access denied", 403);
      }
      
      // Check resend limit (max 5 resends)
      if (ticket.emailResendCount >= 5) {
        return this.sendError(res, "Maximum resend limit reached", 429);
      }
      
      // Get player with email
      const player = ticket.playerId as any;
      const tournament = ticket.tournamentId as any;
      
      if (!player?.email) {
        return this.sendError(res, "Player email not found", 400);
      }
      
      // Generate and send ticket email
      const branding = await emailService.getBrandingConfig();
      
      // Extract base64 from data URL for email
      const qrCodeBase64 = ticket.qrCodeData 
        ? ticket.qrCodeData.replace(/^data:image\/png;base64,/, '')
        : undefined;
      
      const emailContent = generateTicketConfirmationEmail({
        playerName: player.name,
        ticketCode: ticket.ticketCode,
        qrCodeBase64,
        tournament: {
          name: `BOD #${tournament.bodNumber}`,
          bodNumber: tournament.bodNumber,
          date: tournament.date,
          location: tournament.location || 'TBA',
          format: tournament.format,
        },
        amountPaid: ticket.amountPaid,
        branding,
      });
      
      const html = await emailService.wrapInBrandedTemplate(emailContent.html);
      
      await emailService.sendEmail({
        to: player.email,
        subject: emailContent.subject,
        text: emailContent.text,
        html,
      });
      
      await ticket.recordEmailSent();
      
      logger.info(`Ticket email resent: ${ticket.ticketCode}`);
      
      this.sendSuccess(res, {
        ticketCode: ticket.ticketCode,
        emailResendCount: ticket.emailResendCount,
      }, "Ticket email sent successfully");
    }
  );

  // Lookup ticket by QR code (GET /api/tickets/lookup/:code) - Admin
  lookupTicket = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { code } = req.params;
      
      const ticket = await TournamentTicket.findByCode(code);
      
      if (!ticket) {
        return this.sendSuccess(res, {
          found: false,
          error: 'not_found',
        }, "Ticket not found");
      }
      
      const alreadyCheckedIn = ticket.status === 'checked_in';
      const canCheckIn = ticket.status === 'valid';
      
      this.sendSuccess(res, {
        found: true,
        ticket: {
          id: ticket._id,
          ticketCode: ticket.ticketCode,
          status: ticket.status,
          paymentStatus: ticket.paymentStatus,
          player: ticket.playerId,
          tournament: ticket.tournamentId,
          checkedInAt: ticket.checkedInAt,
        },
        alreadyCheckedIn,
        canCheckIn,
        error: alreadyCheckedIn ? 'already_checked_in' : undefined,
      }, alreadyCheckedIn ? "Ticket already checked in" : "Ticket found");
    }
  );

  // Check in ticket (POST /api/tickets/:id/check-in) - Admin
  checkInTicket = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const adminUserId = (req as any).user?.sub || (req as any).user?.id;
      
      if (!Types.ObjectId.isValid(id)) {
        return this.sendError(res, "Invalid ticket ID", 400);
      }
      
      const ticket = await TournamentTicket.findById(id)
        .populate('playerId', 'firstName lastName');
      
      if (!ticket) {
        return this.sendNotFound(res, "Ticket");
      }
      
      if (ticket.status === 'checked_in') {
        return this.sendError(res, "Ticket already checked in", 400);
      }
      
      if (ticket.status !== 'valid') {
        return this.sendError(res, `Cannot check in ticket with status: ${ticket.status}`, 400);
      }
      
      const success = await ticket.checkIn(adminUserId);
      
      if (!success) {
        return this.sendError(res, "Failed to check in ticket", 500);
      }
      
      logger.info(`Ticket checked in: ${ticket.ticketCode} by ${adminUserId}`);
      
      this.sendSuccess(res, {
        ticket: {
          id: ticket._id,
          ticketCode: ticket.ticketCode,
          status: ticket.status,
          player: ticket.playerId,
          checkedInAt: ticket.checkedInAt,
        },
      }, "Ticket checked in successfully");
    }
  );

  // Void ticket (POST /api/tickets/:id/void) - Admin
  voidTicket = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      
      if (!Types.ObjectId.isValid(id)) {
        return this.sendError(res, "Invalid ticket ID", 400);
      }
      
      const ticket = await TournamentTicket.findById(id);
      
      if (!ticket) {
        return this.sendNotFound(res, "Ticket");
      }
      
      if (ticket.status === 'void') {
        return this.sendError(res, "Ticket is already void", 400);
      }
      
      await ticket.voidTicket();
      
      logger.info(`Ticket voided: ${ticket.ticketCode}`);
      
      this.sendSuccess(res, { ticket }, "Ticket voided successfully");
    }
  );

  // Get tickets for tournament (GET /api/tournaments/:id/tickets) - Admin
  getTournamentTickets = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id: tournamentId } = req.params;
      const { status } = req.query;
      
      if (!Types.ObjectId.isValid(tournamentId)) {
        return this.sendError(res, "Invalid tournament ID", 400);
      }
      
      const tickets = await TournamentTicket.getForTournament(
        new Types.ObjectId(tournamentId),
        status as any
      );
      
      this.sendSuccess(res, { tickets }, "Tournament tickets retrieved");
    }
  );

  // Get tournament ticket stats (GET /api/tournaments/:id/tickets/stats) - Admin
  getTournamentTicketStats = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id: tournamentId } = req.params;
      
      if (!Types.ObjectId.isValid(tournamentId)) {
        return this.sendError(res, "Invalid tournament ID", 400);
      }
      
      const stats = await TournamentTicket.getStatsForTournament(
        new Types.ObjectId(tournamentId)
      );
      
      this.sendSuccess(res, { stats }, "Tournament ticket stats retrieved");
    }
  );
  // Admin: Refund ticket (POST /api/tickets/:id/refund)
  refundTicket = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const { amount } = req.body; // Optional: partial refund amount in cents
      const adminUserId = (req as any).user?.sub || (req as any).user?.id;

      if (!Types.ObjectId.isValid(id)) {
        return this.sendError(res, "Invalid ticket ID", 400);
      }

      const ticket = await TournamentTicket.findById(id)
        .populate('playerId', 'firstName lastName')
        .populate('tournamentId');

      if (!ticket) {
        return this.sendNotFound(res, "Ticket");
      }

      if (ticket.status === 'refunded') {
        return this.sendError(res, "Ticket is already refunded", 400);
      }

      if (ticket.paymentStatus !== 'paid') {
        return this.sendError(res, "Ticket has no paid payment to refund", 400);
      }

      if (!ticket.stripePaymentIntentId) {
        return this.sendError(res, "No Stripe payment intent associated with this ticket", 400);
      }

      // Validate partial refund amount
      if (amount !== undefined) {
        if (typeof amount !== 'number' || amount <= 0) {
          return this.sendError(res, "Refund amount must be a positive number", 400);
        }
        if (amount > ticket.amountPaid) {
          return this.sendError(res, "Refund amount cannot exceed amount paid", 400);
        }
      }

      // Issue refund via Stripe
      try {
        await StripeService.createRefund(
          ticket.stripePaymentIntentId,
          amount, // undefined = full refund
          'requested_by_customer'
        );
      } catch (error: any) {
        logger.error(`Stripe refund failed for ticket ${ticket.ticketCode}:`, error);
        return this.sendError(res, `Stripe refund failed: ${error.message}`, 500);
      }

      // Update ticket
      ticket.status = 'refunded';
      ticket.paymentStatus = 'refunded';
      await ticket.save();

      // Free up tournament slot
      const tournament = ticket.tournamentId as any;
      if (tournament && tournament._id) {
        await Tournament.findByIdAndUpdate(tournament._id, {
          $pull: {
            players: ticket.playerId._id || ticket.playerId,
            registeredPlayers: { playerId: ticket.playerId._id || ticket.playerId },
          },
        });
      }

      const refundAmount = amount || ticket.amountPaid;

      logger.info(`Ticket refunded: ${ticket.ticketCode} by admin ${adminUserId}, amount: ${refundAmount}`);

      this.sendSuccess(res, {
        ticket: {
          id: ticket._id,
          ticketCode: ticket.ticketCode,
          status: ticket.status,
          paymentStatus: ticket.paymentStatus,
          refundAmount,
          player: ticket.playerId,
        },
      }, "Ticket refunded successfully");
    }
  );

  // Admin: Remove from tournament without refund (POST /api/tickets/:id/remove)
  removeFromTournament = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const adminUserId = (req as any).user?.sub || (req as any).user?.id;

      if (!Types.ObjectId.isValid(id)) {
        return this.sendError(res, "Invalid ticket ID", 400);
      }

      const ticket = await TournamentTicket.findById(id)
        .populate('playerId', 'firstName lastName')
        .populate('tournamentId');

      if (!ticket) {
        return this.sendNotFound(res, "Ticket");
      }

      if (ticket.status === 'void') {
        return this.sendError(res, "Ticket is already void", 400);
      }

      if (ticket.status === 'refunded') {
        return this.sendError(res, "Ticket is already refunded", 400);
      }

      // Void the ticket without refunding
      ticket.status = 'void';
      await ticket.save();

      // Free up tournament slot
      const tournament = ticket.tournamentId as any;
      if (tournament && tournament._id) {
        await Tournament.findByIdAndUpdate(tournament._id, {
          $pull: {
            players: ticket.playerId._id || ticket.playerId,
            registeredPlayers: { playerId: ticket.playerId._id || ticket.playerId },
          },
        });
      }

      logger.info(`Ticket removed (no refund): ${ticket.ticketCode} by admin ${adminUserId}`);

      this.sendSuccess(res, {
        ticket: {
          id: ticket._id,
          ticketCode: ticket.ticketCode,
          status: ticket.status,
          paymentStatus: ticket.paymentStatus,
          player: ticket.playerId,
        },
      }, "Player removed from tournament (no refund)");
    }
  );

  // Admin: Per-tournament transaction log (GET /api/tournaments/:id/transactions)
  getTournamentTransactions = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id: tournamentId } = req.params;
      const { status } = req.query;

      if (!Types.ObjectId.isValid(tournamentId)) {
        return this.sendError(res, "Invalid tournament ID", 400);
      }

      const query: any = { tournamentId: new Types.ObjectId(tournamentId) };

      // Filter by payment status if provided
      if (status && ['paid', 'free', 'refunded'].includes(status as string)) {
        query.paymentStatus = status;
      }
      // Also support filtering by ticket status
      if (status === 'void') {
        query.status = 'void';
      }

      const tickets = await TournamentTicket.find(query)
        .populate('playerId', 'firstName lastName')
        .populate('teamId', 'name')
        .sort({ createdAt: -1 });

      const transactions = tickets.map((ticket: any) => ({
        ticketId: ticket._id,
        ticketCode: ticket.ticketCode,
        player: ticket.playerId ? {
          id: ticket.playerId._id,
          name: `${ticket.playerId.firstName || ''} ${ticket.playerId.lastName || ''}`.trim(),
        } : null,
        team: ticket.teamId ? {
          id: ticket.teamId._id,
          name: ticket.teamId.name,
        } : null,
        status: ticket.status,
        paymentStatus: ticket.paymentStatus,
        amountPaid: ticket.amountPaid,
        discountCodeUsed: ticket.discountCodeUsed,
        stripePaymentIntentId: ticket.stripePaymentIntentId,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      }));

      // Summary stats
      const summary = {
        totalTickets: tickets.length,
        totalRevenue: tickets.filter((t: any) => t.paymentStatus === 'paid').reduce((sum: number, t: any) => sum + t.amountPaid, 0),
        totalRefunded: tickets.filter((t: any) => t.paymentStatus === 'refunded').reduce((sum: number, t: any) => sum + t.amountPaid, 0),
        paidCount: tickets.filter((t: any) => t.paymentStatus === 'paid').length,
        freeCount: tickets.filter((t: any) => t.paymentStatus === 'free').length,
        refundedCount: tickets.filter((t: any) => t.paymentStatus === 'refunded').length,
        voidCount: tickets.filter((t: any) => t.status === 'void').length,
      };

      this.sendSuccess(res, { transactions, summary }, "Tournament transactions retrieved");
    }
  );

  // Player: Transaction history (GET /api/tickets/history)
  getTransactionHistory = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = (req as any).user?.sub || (req as any).user?.id;

      if (!userId) {
        return this.sendError(res, "Authentication required", 401);
      }

      const tickets = await TournamentTicket.find({ userId })
        .populate('tournamentId', 'bodNumber date location format status')
        .populate('teamId', 'name')
        .sort({ createdAt: -1 });

      const history = tickets.map((ticket: any) => ({
        ticketId: ticket._id,
        ticketCode: ticket.ticketCode,
        tournament: ticket.tournamentId ? {
          id: ticket.tournamentId._id,
          bodNumber: ticket.tournamentId.bodNumber,
          date: ticket.tournamentId.date,
          location: ticket.tournamentId.location,
          format: ticket.tournamentId.format,
          status: ticket.tournamentId.status,
        } : null,
        team: ticket.teamId ? {
          id: ticket.teamId._id,
          name: ticket.teamId.name,
        } : null,
        status: ticket.status,
        paymentStatus: ticket.paymentStatus,
        amountPaid: ticket.amountPaid,
        discountCodeUsed: ticket.discountCodeUsed,
        createdAt: ticket.createdAt,
      }));

      this.sendSuccess(res, { history }, "Transaction history retrieved");
    }
  );
}

export const ticketController = new TicketController();
export default ticketController;
