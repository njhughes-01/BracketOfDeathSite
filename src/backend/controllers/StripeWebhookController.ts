import { Request, Response } from "express";
import { BaseController } from "./base";
import StripeEvent from "../models/StripeEvent";
import TournamentTicket from "../models/TournamentTicket";
import SlotReservation from "../models/SlotReservation";
import DiscountCode from "../models/DiscountCode";
import { Tournament } from "../models/Tournament";
import { Player } from "../models/Player";
import { Types } from "mongoose";
import logger from "../utils/logger";
import StripeService from "../services/StripeService";
import QRCodeService from "../services/QRCodeService";
import emailService from "../services/EmailService";
import { generateTicketConfirmationEmail } from "../services/email/templates/ticketConfirmation";
import { generateRefundConfirmationEmail } from "../services/email/templates/refundConfirmation";
import Stripe from 'stripe';

export class StripeWebhookController extends BaseController {
  constructor() {
    super();
  }

  // Handle Stripe webhook (POST /api/webhooks/stripe)
  handleWebhook = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const sig = req.headers['stripe-signature'] as string;
      
      let event: Stripe.Event;
      
      // Verify webhook signature if secret is configured
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (webhookSecret && sig) {
        try {
          event = StripeService.verifyWebhookSignature(req.body, sig, webhookSecret);
        } catch (err: any) {
          logger.error('Webhook signature verification failed:', err.message);
          return this.sendError(res, `Webhook signature verification failed: ${err.message}`, 400);
        }
      } else {
        // Development mode - parse body directly (INSECURE)
        logger.warn('Stripe webhook received without signature verification (dev mode)');
        event = req.body;
      }
      
      if (!event || !event.type) {
        return this.sendError(res, "Invalid webhook payload", 400);
      }
      
      logger.info(`Stripe webhook received: ${event.type}`);
      
      try {
        // Process based on event type
        switch (event.type) {
          case 'checkout.session.completed':
            await this.handleCheckoutCompleted(event);
            break;
            
          case 'checkout.session.expired':
            await this.handleCheckoutExpired(event);
            break;
            
          case 'charge.refunded':
            await this.handleRefund(event);
            break;
            
          default:
            logger.info(`Unhandled Stripe event type: ${event.type}`);
        }
        
        // Log the event
        await StripeEvent.logEvent(event);
        
        // Acknowledge receipt
        res.status(200).json({ received: true });
        
      } catch (error: any) {
        logger.error(`Error processing webhook: ${error.message}`);
        
        // Log with error
        await StripeEvent.logEvent(event, undefined, error.message);
        
        // Still return 200 to prevent Stripe retries for processing errors
        res.status(200).json({ received: true, error: error.message });
      }
    }
  );

  // Handle successful checkout
  private async handleCheckoutCompleted(event: any): Promise<void> {
    const session = event.data.object;
    
    // Extract metadata
    const { tournamentId, userId, playerId, reservationId, discountCode } = session.metadata || {};
    
    if (!tournamentId || !userId || !playerId) {
      logger.error('Missing required metadata in checkout session');
      return;
    }
    
    // Complete the reservation
    if (reservationId) {
      const reservation = await SlotReservation.findById(reservationId);
      if (reservation) {
        await reservation.complete(session.id);
      }
    }
    
    // Create the ticket
    const ticket = new TournamentTicket({
      tournamentId: new Types.ObjectId(tournamentId),
      userId: new Types.ObjectId(userId),
      playerId: new Types.ObjectId(playerId),
      status: 'valid',
      paymentStatus: 'paid',
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent,
      amountPaid: session.amount_total || 0,
      discountCodeUsed: discountCode,
    });
    
    // Generate QR code for ticket
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const qrCodeData = await QRCodeService.generateTicketQRCode(ticket.ticketCode, appUrl);
    ticket.qrCodeData = qrCodeData;
    
    await ticket.save();
    
    // Add player to tournament
    await Tournament.findByIdAndUpdate(tournamentId, {
      $push: {
        registeredPlayers: {
          playerId: new Types.ObjectId(playerId),
          registeredAt: new Date(),
        },
      },
      $inc: { spotsReserved: -1 },
    });
    
    // Increment discount code usage if applicable
    if (discountCode) {
      const code = await DiscountCode.findOne({ code: discountCode.toUpperCase() });
      if (code) {
        await code.redeem();
      }
    }
    
    // Log with extracted data
    await StripeEvent.logEvent(event, {
      tournamentId: new Types.ObjectId(tournamentId),
      userId: new Types.ObjectId(userId),
      playerId: new Types.ObjectId(playerId),
      ticketId: ticket._id as Types.ObjectId,
      amount: session.amount_total,
      currency: session.currency,
    });
    
    // Send confirmation email with ticket
    try {
      const tournament = await Tournament.findById(tournamentId);
      const player = await Player.findById(playerId);
      
      if (tournament && player && player.email) {
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
        logger.info(`Confirmation email sent to ${player.email} for ticket ${ticket.ticketCode}`);
      }
    } catch (emailError) {
      logger.error('Failed to send confirmation email:', emailError);
      // Don't throw - payment succeeded, email failure is non-critical
    }
    
    logger.info(`Checkout completed: ticket ${ticket.ticketCode} for tournament ${tournamentId}`);
  }

  // Handle expired checkout session
  private async handleCheckoutExpired(event: any): Promise<void> {
    const session = event.data.object;
    const { reservationId, tournamentId } = session.metadata || {};
    
    if (reservationId) {
      // Mark reservation as expired
      const reservation = await SlotReservation.findById(reservationId);
      if (reservation && reservation.status === 'active') {
        reservation.status = 'expired';
        await reservation.save();
        
        // Decrement reserved spots
        if (tournamentId) {
          await Tournament.findByIdAndUpdate(tournamentId, {
            $inc: { spotsReserved: -1 },
          });
        }
      }
    }
    
    logger.info(`Checkout session expired: ${session.id}`);
  }

  // Handle refund
  private async handleRefund(event: any): Promise<void> {
    const charge = event.data.object;
    const paymentIntentId = charge.payment_intent;
    
    if (!paymentIntentId) {
      logger.warn('Refund event missing payment_intent');
      return;
    }
    
    // Find the ticket by payment intent
    const ticket = await TournamentTicket.findOne({ stripePaymentIntentId: paymentIntentId });
    
    if (!ticket) {
      logger.warn(`No ticket found for payment intent: ${paymentIntentId}`);
      return;
    }
    
    // Mark ticket as refunded
    await ticket.refund();
    
    // Remove player from tournament
    await Tournament.findByIdAndUpdate(ticket.tournamentId, {
      $pull: {
        registeredPlayers: { playerId: ticket.playerId },
      },
    });
    
    // Log with extracted data
    await StripeEvent.logEvent(event, {
      tournamentId: ticket.tournamentId,
      userId: ticket.userId,
      playerId: ticket.playerId,
      ticketId: ticket._id as Types.ObjectId,
      amount: charge.amount_refunded,
      currency: charge.currency,
    });
    
    // Send refund confirmation email
    try {
      const tournament = await Tournament.findById(ticket.tournamentId);
      const player = await Player.findById(ticket.playerId);
      
      if (tournament && player && player.email) {
        const branding = await emailService.getBrandingConfig();
        
        const emailContent = generateRefundConfirmationEmail({
          playerName: player.name,
          ticketCode: ticket.ticketCode,
          tournament: {
            name: `BOD #${tournament.bodNumber}`,
            bodNumber: tournament.bodNumber,
            date: tournament.date,
            location: tournament.location || 'TBA',
          },
          refundAmount: charge.amount_refunded,
          originalAmount: ticket.amountPaid,
          branding,
        });
        
        const html = await emailService.wrapInBrandedTemplate(emailContent.html);
        
        await emailService.sendEmail({
          to: player.email,
          subject: emailContent.subject,
          text: emailContent.text,
          html,
        });
        
        logger.info(`Refund confirmation email sent to ${player.email} for ticket ${ticket.ticketCode}`);
      }
    } catch (emailError) {
      logger.error('Failed to send refund confirmation email:', emailError);
      // Don't throw - refund succeeded, email failure is non-critical
    }
    
    logger.info(`Refund processed: ticket ${ticket.ticketCode} refunded`);
  }
}

export const stripeWebhookController = new StripeWebhookController();
export default stripeWebhookController;
