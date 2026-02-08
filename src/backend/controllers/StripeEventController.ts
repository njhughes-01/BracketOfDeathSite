import { Request, Response } from "express";
import { BaseController } from "./base";
import StripeEvent from "../models/StripeEvent";
import { Types } from "mongoose";

export class StripeEventController extends BaseController {
  constructor() {
    super();
  }

  // Get Stripe events with pagination (GET /api/stripe/events) - Admin
  getEvents = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const {
        type,
        tournamentId,
        userId,
        startDate,
        endDate,
        page = '1',
        limit = '50',
      } = req.query;
      
      const options: any = {
        page: parseInt(page as string, 10),
        limit: Math.min(parseInt(limit as string, 10), 100), // Max 100 per page
      };
      
      if (type) options.type = type as string;
      if (tournamentId && Types.ObjectId.isValid(tournamentId as string)) {
        options.tournamentId = new Types.ObjectId(tournamentId as string);
      }
      if (userId && Types.ObjectId.isValid(userId as string)) {
        options.userId = new Types.ObjectId(userId as string);
      }
      if (startDate) options.startDate = new Date(startDate as string);
      if (endDate) options.endDate = new Date(endDate as string);
      
      const result = await StripeEvent.getEvents(options);
      
      this.sendSuccess(res, result, "Stripe events retrieved successfully");
    }
  );

  // Get single event details (GET /api/stripe/events/:id) - Admin
  getEvent = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      
      if (!Types.ObjectId.isValid(id)) {
        return this.sendError(res, "Invalid event ID", 400);
      }
      
      const event = await StripeEvent.findById(id)
        .populate('tournamentId', 'bodNumber date')
        .populate('playerId', 'firstName lastName')
        .populate('ticketId', 'ticketCode status');
      
      if (!event) {
        return this.sendNotFound(res, "Stripe event");
      }
      
      this.sendSuccess(res, { event }, "Stripe event retrieved successfully");
    }
  );

  // Get revenue summary (GET /api/reports/revenue) - Admin
  getRevenueSummary = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { tournamentId, startDate, endDate, groupBy } = req.query;
      
      const options: any = {};
      
      if (tournamentId && Types.ObjectId.isValid(tournamentId as string)) {
        options.tournamentId = new Types.ObjectId(tournamentId as string);
      }
      if (startDate) options.startDate = new Date(startDate as string);
      if (endDate) options.endDate = new Date(endDate as string);
      
      const summary = await StripeEvent.getRevenueSummary(options);
      
      // Format for display
      const formattedSummary = {
        ...summary,
        totalRevenueFormatted: `$${(summary.totalRevenue / 100).toFixed(2)}`,
        totalRefundsFormatted: `$${(summary.totalRefunds / 100).toFixed(2)}`,
        netRevenueFormatted: `$${(summary.netRevenue / 100).toFixed(2)}`,
      };
      
      this.sendSuccess(res, formattedSummary, "Revenue summary retrieved successfully");
    }
  );

  // Get revenue by tournament (GET /api/reports/revenue/:tournamentId) - Admin
  getTournamentRevenue = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { tournamentId } = req.params;
      
      if (!Types.ObjectId.isValid(tournamentId)) {
        return this.sendError(res, "Invalid tournament ID", 400);
      }
      
      const summary = await StripeEvent.getRevenueSummary({
        tournamentId: new Types.ObjectId(tournamentId),
      });
      
      const formattedSummary = {
        ...summary,
        totalRevenueFormatted: `$${(summary.totalRevenue / 100).toFixed(2)}`,
        totalRefundsFormatted: `$${(summary.totalRefunds / 100).toFixed(2)}`,
        netRevenueFormatted: `$${(summary.netRevenue / 100).toFixed(2)}`,
      };
      
      this.sendSuccess(res, formattedSummary, "Tournament revenue retrieved successfully");
    }
  );

  // Get event types summary (for filtering UI)
  getEventTypes = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const types = await StripeEvent.distinct('type');
      
      this.sendSuccess(res, { types }, "Event types retrieved successfully");
    }
  );
}

export const stripeEventController = new StripeEventController();
export default stripeEventController;
