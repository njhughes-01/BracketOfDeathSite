import { Request, Response } from "express";
import { BaseController } from "./base";
import SlotReservation, { RESERVATION_TIMEOUT_MINUTES } from "../models/SlotReservation";
import TournamentTicket from "../models/TournamentTicket";
import DiscountCode from "../models/DiscountCode";
import { Tournament } from "../models/Tournament";
import { Player } from "../models/Player";
import { Types } from "mongoose";
import logger from "../utils/logger";
import StripeService from "../services/StripeService";
import SystemSettings from "../models/SystemSettings";
import QRCodeService from "../services/QRCodeService";
import emailService from "../services/EmailService";
import { generateTicketConfirmationEmail } from "../services/email/templates/ticketConfirmation";

export class CheckoutController extends BaseController {
  constructor() {
    super();
  }

  // Reserve a slot for checkout (POST /api/tournaments/:id/reserve)
  reserveSlot = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id: tournamentId } = req.params;
      const userId = (req as any).user?.sub || (req as any).user?.id;
      
      if (!userId) {
        return this.sendError(res, "Authentication required", 401);
      }
      
      if (!Types.ObjectId.isValid(tournamentId)) {
        return this.sendError(res, "Invalid tournament ID", 400);
      }
      
      // Get tournament
      const tournament = await Tournament.findById(tournamentId);
      if (!tournament) {
        return this.sendNotFound(res, "Tournament");
      }
      
      // Check tournament status
      if (tournament.status !== 'open') {
        return this.sendError(res, "Tournament is not open for registration", 400);
      }
      
      // Check capacity (including reserved slots)
      const registeredCount = tournament.registeredPlayers?.length || 0;
      const reservedCount = await SlotReservation.countActiveReservations(
        new Types.ObjectId(tournamentId)
      );
      const totalOccupied = registeredCount + reservedCount;
      
      if (tournament.maxPlayers && totalOccupied >= tournament.maxPlayers) {
        return this.sendError(res, "Tournament is full", 400);
      }
      
      // Get player for this user
      const player = await Player.findOne({ keycloakUserId: userId });
      if (!player) {
        return this.sendError(res, "Player profile not found", 400);
      }
      
      // Check if already registered
      const alreadyRegistered = tournament.registeredPlayers?.some(
        (rp: any) => rp.playerId.toString() === player._id.toString()
      );
      if (alreadyRegistered) {
        return this.sendError(res, "Already registered for this tournament", 400);
      }
      
      // Check for existing ticket
      const existingTicket = await TournamentTicket.findOne({
        tournamentId: new Types.ObjectId(tournamentId),
        userId,
        status: { $in: ['valid', 'checked_in'] },
      });
      if (existingTicket) {
        return this.sendError(res, "Already have a valid ticket for this tournament", 400);
      }
      
      // Create reservation
      const reservation = await SlotReservation.createReservation(
        new Types.ObjectId(tournamentId),
        userId,
        player._id as Types.ObjectId,
        RESERVATION_TIMEOUT_MINUTES
      );
      
      // Update tournament spotsReserved
      await Tournament.findByIdAndUpdate(tournamentId, { $inc: { spotsReserved: 1 } });
      
      const spotsRemaining = tournament.maxPlayers 
        ? tournament.maxPlayers - totalOccupied - 1 
        : undefined;
      
      logger.info(`Slot reserved for tournament ${tournamentId} by user ${userId}`);
      
      this.sendSuccess(res, {
        reservationId: reservation._id,
        expiresAt: reservation.expiresAt.toISOString(),
        remainingSeconds: reservation.remainingSeconds,
        tournamentId,
        spotsRemaining,
      }, "Slot reserved successfully", undefined, 201);
    }
  );

  // Cancel reservation (DELETE /api/tournaments/:id/reserve)
  cancelReservation = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id: tournamentId } = req.params;
      const userId = (req as any).user?.sub || (req as any).user?.id;
      
      if (!userId) {
        return this.sendError(res, "Authentication required", 401);
      }
      
      const reservation = await SlotReservation.getActiveReservation(
        new Types.ObjectId(tournamentId),
        userId
      );
      
      if (!reservation) {
        return this.sendError(res, "No active reservation found", 404);
      }
      
      await reservation.cancel();
      
      // Decrement spotsReserved
      await Tournament.findByIdAndUpdate(tournamentId, { $inc: { spotsReserved: -1 } });
      
      logger.info(`Reservation cancelled for tournament ${tournamentId} by user ${userId}`);
      
      this.sendSuccess(res, {}, "Reservation cancelled successfully");
    }
  );

  // Get reservation status (GET /api/tournaments/:id/reservation)
  getReservation = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id: tournamentId } = req.params;
      const userId = (req as any).user?.sub || (req as any).user?.id;
      
      if (!userId) {
        return this.sendError(res, "Authentication required", 401);
      }
      
      const reservation = await SlotReservation.getActiveReservation(
        new Types.ObjectId(tournamentId),
        userId
      );
      
      if (!reservation) {
        return this.sendSuccess(res, { hasReservation: false }, "No active reservation");
      }
      
      this.sendSuccess(res, {
        hasReservation: true,
        reservationId: reservation._id,
        expiresAt: reservation.expiresAt.toISOString(),
        remainingSeconds: reservation.remainingSeconds,
      }, "Reservation status retrieved");
    }
  );

  // Create Stripe Checkout session (POST /api/checkout/create-session)
  createCheckoutSession = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { tournamentId, reservationId, discountCode } = req.body;
      const userId = (req as any).user?.sub || (req as any).user?.id;
      
      if (!userId) {
        return this.sendError(res, "Authentication required", 401);
      }
      
      if (!tournamentId || !reservationId) {
        return this.sendError(res, "Tournament ID and reservation ID are required", 400);
      }
      
      // Verify reservation
      const reservation = await SlotReservation.findById(reservationId);
      if (!reservation || !reservation.isValid) {
        return this.sendError(res, "Invalid or expired reservation", 400);
      }
      
      if (reservation.userId.toString() !== userId) {
        return this.sendError(res, "Reservation does not belong to this user", 403);
      }
      
      // Get tournament for pricing
      const tournament = await Tournament.findById(tournamentId);
      if (!tournament) {
        return this.sendNotFound(res, "Tournament");
      }
      
      // Calculate price
      let price = tournament.entryFee || 0;
      
      // Check for early bird pricing
      if (tournament.earlyBirdFee && tournament.earlyBirdDeadline) {
        if (new Date() < tournament.earlyBirdDeadline) {
          price = tournament.earlyBirdFee;
        }
      }
      
      // Apply discount code if provided
      let appliedDiscount: any = null;
      if (discountCode) {
        const discount = await DiscountCode.findOne({
          code: discountCode.toUpperCase(),
          active: true,
        });
        
        if (discount && discount.isUsable && discount.appliesToTournament(tournamentId)) {
          appliedDiscount = discount;
          
          if (discount.type === 'percent') {
            price = Math.round(price * (1 - (discount.percentOff! / 100)));
          } else if (discount.type === 'amount') {
            price = Math.max(0, price - discount.amountOff!);
          }
        }
      }
      
      // If free, redirect to free registration
      if (price === 0) {
        return this.sendSuccess(res, {
          isFree: true,
          redirectTo: `/api/checkout/free`,
        }, "Tournament is free, use free registration endpoint");
      }
      
      // Check if Stripe is configured
      const stripeConfigured = await StripeService.isStripeConfigured();
      if (!stripeConfigured) {
        return this.sendError(res, "Stripe is not configured. Contact administrator.", 503);
      }
      
      // Get player info for checkout
      const player = await Player.findById(reservation.playerId);
      if (!player) {
        return this.sendError(res, "Player not found", 400);
      }
      
      // Build success/cancel URLs
      const appUrl = process.env.APP_URL || 'http://localhost:5173';
      const successUrl = `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${appUrl}/checkout/cancel?tournament_id=${tournamentId}`;
      
      // Look up Connect account for destination charges
      const settings = await SystemSettings.findOne();
      const connectedAccountId = settings?.stripeConnectedAccountId && settings?.connectOnboardingComplete
        ? settings.stripeConnectedAccountId
        : undefined;
      const platformFeePercent = settings?.platformFeePercent || 0;
      const applicationFeeAmount = connectedAccountId
        ? Math.round(price * platformFeePercent / 100)
        : undefined;

      // Create Stripe Checkout Session
      const session = await StripeService.createCheckoutSession({
        tournamentId,
        tournamentName: `BOD #${tournament.bodNumber}`,
        userId,
        playerId: reservation.playerId.toString(),
        playerEmail: player.email || (req as any).user?.email || '',
        reservationId: reservationId,
        amount: price,
        discountCode: appliedDiscount?.code,
        successUrl,
        cancelUrl,
        connectedAccountId,
        applicationFeeAmount,
      });
      
      // Update reservation with Stripe session ID
      reservation.stripeSessionId = session.id;
      await reservation.save();
      
      logger.info(`Stripe checkout session created: ${session.id} for tournament ${tournamentId}, price: ${price}`);
      
      this.sendSuccess(res, {
        sessionId: session.id,
        url: session.url,
        price,
        currency: 'usd',
        discountApplied: appliedDiscount ? {
          code: appliedDiscount.code,
          type: appliedDiscount.type,
          value: appliedDiscount.type === 'percent' 
            ? appliedDiscount.percentOff 
            : appliedDiscount.amountOff,
        } : null,
        expiresAt: reservation.expiresAt.toISOString(),
      }, "Checkout session created");
    }
  );

  // Complete free registration (POST /api/checkout/free)
  completeFreeRegistration = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { tournamentId, reservationId } = req.body;
      const userId = (req as any).user?.sub || (req as any).user?.id;
      
      if (!userId) {
        return this.sendError(res, "Authentication required", 401);
      }
      
      if (!tournamentId || !reservationId) {
        return this.sendError(res, "Tournament ID and reservation ID are required", 400);
      }
      
      // Verify reservation
      const reservation = await SlotReservation.findById(reservationId);
      if (!reservation || !reservation.isValid) {
        return this.sendError(res, "Invalid or expired reservation", 400);
      }
      
      if (reservation.userId.toString() !== userId) {
        return this.sendError(res, "Reservation does not belong to this user", 403);
      }
      
      // Get tournament
      const tournament = await Tournament.findById(tournamentId);
      if (!tournament) {
        return this.sendNotFound(res, "Tournament");
      }
      
      // Verify it's actually free
      const price = tournament.entryFee || 0;
      if (price > 0) {
        return this.sendError(res, "Tournament requires payment", 400);
      }
      
      // Create ticket
      const ticket = new TournamentTicket({
        tournamentId: new Types.ObjectId(tournamentId),
        userId: userId,
        playerId: reservation.playerId,
        status: 'valid',
        paymentStatus: 'free',
        amountPaid: 0,
      });
      
      // Generate QR code for ticket
      const appUrl = process.env.APP_URL || 'http://localhost:5173';
      const qrCodeData = await QRCodeService.generateTicketQRCode(ticket.ticketCode, appUrl);
      ticket.qrCodeData = qrCodeData;
      
      await ticket.save();
      
      // Add player to tournament registeredPlayers
      await Tournament.findByIdAndUpdate(tournamentId, {
        $push: {
          registeredPlayers: {
            playerId: reservation.playerId,
            registeredAt: new Date(),
          },
        },
        $inc: { spotsReserved: -1 }, // Release the reserved spot
      });
      
      // Complete reservation
      await reservation.complete();
      
      // Send ticket email with QR code
      try {
        const player = await Player.findById(reservation.playerId);
        
        if (player && player.email) {
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
            amountPaid: 0,
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
          logger.info(`Ticket email sent to ${player.email} for ticket ${ticket.ticketCode}`);
        }
      } catch (emailError) {
        logger.error('Failed to send ticket email:', emailError);
        // Don't throw - registration succeeded, email failure is non-critical
      }
      
      logger.info(`Free registration completed for tournament ${tournamentId}, ticket: ${ticket.ticketCode}`);
      
      this.sendSuccess(res, {
        ticketId: ticket._id,
        ticketCode: ticket.ticketCode,
        message: "Registration completed successfully",
      }, "Free registration completed", undefined, 201);
    }
  );

  // Get checkout session status (GET /api/checkout/session/:sessionId)
  getSessionStatus = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { sessionId } = req.params;
      
      try {
        const session = await StripeService.retrieveCheckoutSession(sessionId);
        
        // Get ticket if payment was successful
        let ticket = null;
        if (session.payment_status === 'paid' && session.metadata?.reservationId) {
          ticket = await TournamentTicket.findOne({ 
            reservationId: session.metadata.reservationId 
          });
        }
        
        // Fetch tournament info for the success page
        let tournament = null;
        if (session.metadata?.tournamentId) {
          const t = await Tournament.findById(session.metadata.tournamentId);
          if (t) {
            tournament = { id: t._id.toString(), name: `BOD Tournament #${t.bodNumber}`, date: t.date, location: t.location };
          }
        }

        this.sendSuccess(res, {
          ticketId: ticket?.id || null,
          ticketCode: ticket?.ticketCode || null,
          tournament,
          amountPaid: session.amount_total || 0,
          status: session.payment_status,
          sessionId,
          paymentStatus: session.payment_status,
          amountTotal: session.amount_total,
          currency: session.currency,
          customerEmail: session.customer_email,
          metadata: session.metadata,
          ticket: ticket ? {
            id: ticket.id,
            ticketCode: ticket.ticketCode,
            status: ticket.status,
          } : null,
        }, "Session status retrieved");
      } catch (error: any) {
        logger.error("Failed to retrieve checkout session:", error);
        this.sendError(res, "Failed to retrieve session status", 400);
      }
    }
  );
}

export const checkoutController = new CheckoutController();
export default checkoutController;
