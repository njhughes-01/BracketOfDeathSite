import { Request, Response } from "express";
import { BaseController } from "./base";
import DiscountCode, { IDiscountCode } from "../models/DiscountCode";
import { Types } from "mongoose";
import logger from "../utils/logger";
import StripeService from "../services/StripeService";

export class DiscountCodeController extends BaseController {
  constructor() {
    super();
  }

  // List all discount codes (admin)
  list = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { active, includeExpired } = req.query;
      
      const query: any = {};
      if (active === 'true') query.active = true;
      if (active === 'false') query.active = false;
      if (includeExpired !== 'true') {
        query.$or = [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } },
        ];
      }
      
      const codes = await DiscountCode.find(query).sort({ createdAt: -1 });
      
      this.sendSuccess(res, { codes }, "Discount codes retrieved successfully");
    }
  );

  // Get single discount code (admin)
  get = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      
      if (!Types.ObjectId.isValid(id)) {
        return this.sendError(res, "Invalid discount code ID", 400);
      }
      
      const code = await DiscountCode.findById(id);
      
      if (!code) {
        return this.sendNotFound(res, "Discount code");
      }
      
      this.sendSuccess(res, { code }, "Discount code retrieved successfully");
    }
  );

  // Create discount code (admin)
  create = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const {
        code,
        type,
        percentOff,
        amountOff,
        maxRedemptions,
        expiresAt,
        tournamentIds,
      } = req.body;
      
      // Validate required fields
      if (!code || !type) {
        return this.sendError(res, "Code and type are required", 400);
      }
      
      if (type === 'percent' && !percentOff) {
        return this.sendError(res, "Percent off is required for percent type", 400);
      }
      
      if (type === 'amount' && !amountOff) {
        return this.sendError(res, "Amount off is required for amount type", 400);
      }
      
      // Check for existing code
      const existing = await DiscountCode.findOne({ code: code.toUpperCase() });
      if (existing) {
        return this.sendError(res, "Discount code already exists", 409);
      }
      
      // Create Stripe Coupon
      let stripeCouponId = `coupon_${code.toUpperCase()}_${Date.now()}`;
      
      const stripeConfigured = await StripeService.isStripeConfigured();
      if (stripeConfigured) {
        try {
          const stripeCoupon = await StripeService.createCoupon({
            code: code.toUpperCase(),
            type,
            percentOff: type === 'percent' ? percentOff : undefined,
            amountOff: type === 'amount' ? amountOff : undefined,
            maxRedemptions,
            expiresAt: expiresAt ? new Date(expiresAt) : undefined,
          });
          stripeCouponId = stripeCoupon.id;
        } catch (stripeError: any) {
          logger.warn(`Failed to create Stripe coupon: ${stripeError.message}`);
          // Continue with local-only coupon
        }
      }
      
      const discountCode = new DiscountCode({
        code: code.toUpperCase(),
        stripeCouponId,
        type,
        percentOff: type === 'percent' ? percentOff : undefined,
        amountOff: type === 'amount' ? amountOff : undefined,
        maxRedemptions,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        tournamentIds: tournamentIds?.map((id: string) => new Types.ObjectId(id)),
        active: true,
      });
      
      await discountCode.save();
      
      logger.info(`Discount code created: ${code}`);
      this.sendSuccess(res, { code: discountCode }, "Discount code created successfully", undefined, 201);
    }
  );

  // Update discount code (admin)
  update = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const {
        maxRedemptions,
        expiresAt,
        tournamentIds,
        active,
      } = req.body;
      
      if (!Types.ObjectId.isValid(id)) {
        return this.sendError(res, "Invalid discount code ID", 400);
      }
      
      const code = await DiscountCode.findById(id);
      
      if (!code) {
        return this.sendNotFound(res, "Discount code");
      }
      
      // Update allowed fields
      if (maxRedemptions !== undefined) code.maxRedemptions = maxRedemptions;
      if (expiresAt !== undefined) code.expiresAt = expiresAt ? new Date(expiresAt) : undefined;
      if (tournamentIds !== undefined) {
        code.tournamentIds = tournamentIds?.map((tid: string) => new Types.ObjectId(tid));
      }
      if (active !== undefined) code.active = active;
      
      await code.save();
      
      // Sync with Stripe coupon
      // Note: Stripe coupons are mostly immutable (can't change percent_off, amount_off, max_redemptions, redeem_by)
      // If deactivated, we delete from Stripe. For other changes, user must delete & recreate.
      if (active === false) {
        try {
          await StripeService.deleteCoupon(code.code);
          logger.info(`Stripe coupon deleted for deactivated code: ${code.code}`);
        } catch (stripeError: any) {
          // Ignore if coupon doesn't exist in Stripe
          if (stripeError.code !== 'resource_missing') {
            logger.warn(`Failed to delete Stripe coupon ${code.code}:`, stripeError);
          }
        }
      }
      
      logger.info(`Discount code updated: ${code.code}`);
      this.sendSuccess(res, { code }, "Discount code updated successfully");
    }
  );

  // Deactivate discount code (admin)
  deactivate = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      
      if (!Types.ObjectId.isValid(id)) {
        return this.sendError(res, "Invalid discount code ID", 400);
      }
      
      const code = await DiscountCode.findById(id);
      
      if (!code) {
        return this.sendNotFound(res, "Discount code");
      }
      
      code.active = false;
      await code.save();
      
      // Delete Stripe Coupon
      const stripeConfigured = await StripeService.isStripeConfigured();
      if (stripeConfigured && code.stripeCouponId) {
        try {
          await StripeService.deleteCoupon(code.stripeCouponId);
        } catch (stripeError: any) {
          logger.warn(`Failed to delete Stripe coupon: ${stripeError.message}`);
          // Continue - local deactivation is sufficient
        }
      }
      
      logger.info(`Discount code deactivated: ${code.code}`);
      this.sendSuccess(res, { code }, "Discount code deactivated successfully");
    }
  );

  // Validate discount code (user - for checkout)
  validate = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { code, tournamentId } = req.body;
      
      if (!code) {
        return this.sendError(res, "Code is required", 400);
      }
      
      const discountCode = await DiscountCode.findOne({ 
        code: code.toUpperCase(),
        active: true,
      });
      
      if (!discountCode) {
        return this.sendSuccess(res, {
          valid: false,
          error: 'not_found',
        }, "Discount code not found");
      }
      
      // Check expiry
      if (discountCode.expiresAt && discountCode.expiresAt < new Date()) {
        return this.sendSuccess(res, {
          valid: false,
          error: 'expired',
        }, "Discount code expired");
      }
      
      // Check redemption limit
      if (discountCode.maxRedemptions && 
          discountCode.redemptionCount >= discountCode.maxRedemptions) {
        return this.sendSuccess(res, {
          valid: false,
          error: 'limit_reached',
        }, "Discount code limit reached");
      }
      
      // Check tournament restriction
      if (tournamentId && !discountCode.appliesToTournament(tournamentId)) {
        return this.sendSuccess(res, {
          valid: false,
          error: 'not_applicable',
        }, "Discount code not applicable to this tournament");
      }
      
      this.sendSuccess(res, {
        valid: true,
        discountType: discountCode.type,
        discountValue: discountCode.type === 'percent' 
          ? discountCode.percentOff 
          : discountCode.amountOff,
        code: discountCode.code,
      }, "Discount code valid");
    }
  );
}

export const discountCodeController = new DiscountCodeController();
export default discountCodeController;
