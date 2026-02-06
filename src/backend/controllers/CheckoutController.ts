import { Request, Response } from "express";
import { BaseController } from "./base";
import SlotReservation, { RESERVATION_TIMEOUT_MINUTES } from "../models/SlotReservation";
import TournamentTicket from "../models/TournamentTicket";
import DiscountCode from "../models/DiscountCode";
import { Tournament } from "../models/Tournament";
import { Player } from "../models/Player";
import { Types } from "mongoose";
import logger from "../utils/logger";

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
        new Types.ObjectId(userId),
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
        new Types.ObjectId(userId)
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
        new Types.ObjectId(userId)
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
      
      // TODO: Create actual Stripe Checkout Session
      // For now, return placeholder
      const sessionId = `cs_placeholder_${Date.now()}`;
      const checkoutUrl = `https://checkout.stripe.com/placeholder/${sessionId}`;
      
      // Update reservation with Stripe session ID
      reservation.stripeSessionId = sessionId;
      await reservation.save();
      
      logger.info(`Checkout session created for tournament ${tournamentId}, price: ${price}`);
      
      this.sendSuccess(res, {
        sessionId,
        url: checkoutUrl,
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
        userId: new Types.ObjectId(userId),
        playerId: reservation.playerId,
        status: 'valid',
        paymentStatus: 'free',
        amountPaid: 0,
      });
      
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
      
      // TODO: Generate QR code and send email
      
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
      
      // TODO: Query Stripe for session status
      // For now, return placeholder
      
      this.sendSuccess(res, {
        sessionId,
        status: 'pending',
        message: "Stripe integration pending",
      }, "Session status retrieved");
    }
  );
}

export const checkoutController = new CheckoutController();
export default checkoutController;
