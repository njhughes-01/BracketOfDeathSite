import { Request, Response } from "express";
import { BaseController } from "./base";
import TournamentTicket from "../models/TournamentTicket";
import { Tournament } from "../models/Tournament";
import { Player } from "../models/Player";
import { Types } from "mongoose";
import logger from "../utils/logger";
import emailService from "../services/EmailService";
import { generateTicketConfirmationEmail } from "../services/email/templates/ticketConfirmation";

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
      
      const tickets = await TournamentTicket.getForUser(new Types.ObjectId(userId));
      
      this.sendSuccess(res, { tickets }, "Tickets retrieved successfully");
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
      
      const success = await ticket.checkIn(new Types.ObjectId(adminUserId));
      
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
}

export const ticketController = new TicketController();
export default ticketController;
