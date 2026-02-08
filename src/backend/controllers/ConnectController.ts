import { Request, Response } from "express";
import { BaseController } from "./base";
import SystemSettings from "../models/SystemSettings";
import StripeService from "../services/StripeService";
import logger from "../utils/logger";

export class ConnectController extends BaseController {
  constructor() {
    super();
  }

  // POST /api/stripe/connect/onboard — create Connect account and return onboarding URL
  onboard = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const settings = await SystemSettings.findOne();
      
      // If already connected and onboarding complete, don't create a new account
      if (settings?.stripeConnectedAccountId && settings?.connectOnboardingComplete) {
        return this.sendError(res, "Stripe Connect account already connected", 400);
      }

      let accountId = settings?.stripeConnectedAccountId;

      // Create new account if none exists
      if (!accountId) {
        const account = await StripeService.createConnectAccount();
        accountId = account.id;

        // Store account ID in settings
        const updatedBy = (req as any).user?.sub || (req as any).user?.id || "system";
        await SystemSettings.findOneAndUpdate(
          {},
          {
            stripeConnectedAccountId: accountId,
            connectOnboardingComplete: false,
            updatedBy,
          },
          { upsert: true, new: true }
        );
      }

      // Create account link for onboarding
      const appUrl = process.env.APP_URL || "http://localhost:5173";
      const accountLink = await StripeService.createAccountLink(
        accountId,
        `${appUrl}/admin/stripe-connect?refresh=true`,
        `${appUrl}/admin/stripe-connect?onboarding=complete`
      );

      logger.info(`Connect onboarding URL created for account ${accountId}`);

      this.sendSuccess(res, {
        url: accountLink.url,
        accountId,
      }, "Onboarding URL created");
    }
  );

  // GET /api/stripe/connect/status — get current connect status
  getStatus = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const settings = await SystemSettings.findOne();

      if (!settings?.stripeConnectedAccountId) {
        return this.sendSuccess(res, {
          connected: false,
          status: "not_connected",
          platformFeePercent: settings?.platformFeePercent || 0,
        }, "No Connect account");
      }

      try {
        const account = await StripeService.getAccountStatus(settings.stripeConnectedAccountId);
        
        const chargesEnabled = account.charges_enabled || false;
        const payoutsEnabled = account.payouts_enabled || false;
        const detailsSubmitted = account.details_submitted || false;

        // Update onboarding status if needed
        if (chargesEnabled && !settings.connectOnboardingComplete) {
          const updatedBy = (req as any).user?.sub || (req as any).user?.id || "system";
          await SystemSettings.findOneAndUpdate(
            {},
            {
              connectOnboardingComplete: true,
              connectedAccountName: account.business_profile?.name || account.email || "",
              connectedAccountEmail: account.email || "",
              updatedBy,
            }
          );
        }

        let status = "not_connected";
        if (chargesEnabled && payoutsEnabled) {
          status = "active";
        } else if (detailsSubmitted) {
          status = "pending";
        } else {
          status = "onboarding_incomplete";
        }

        this.sendSuccess(res, {
          connected: true,
          status,
          accountId: settings.stripeConnectedAccountId,
          chargesEnabled,
          payoutsEnabled,
          detailsSubmitted,
          accountName: account.business_profile?.name || account.email || "",
          accountEmail: account.email || "",
          platformFeePercent: settings.platformFeePercent || 0,
        }, "Connect status retrieved");
      } catch (error: any) {
        logger.error("Failed to get Connect account status:", error);
        this.sendError(res, "Failed to retrieve account status", 500);
      }
    }
  );

  // GET /api/stripe/connect/dashboard — get Express dashboard login link
  getDashboardLink = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const settings = await SystemSettings.findOne();

      if (!settings?.stripeConnectedAccountId) {
        return this.sendError(res, "No Connect account configured", 400);
      }

      if (!settings.connectOnboardingComplete) {
        return this.sendError(res, "Connect onboarding not complete", 400);
      }

      try {
        const loginLink = await StripeService.createLoginLink(settings.stripeConnectedAccountId);

        this.sendSuccess(res, {
          url: loginLink.url,
        }, "Dashboard link created");
      } catch (error: any) {
        logger.error("Failed to create dashboard link:", error);
        this.sendError(res, "Failed to create dashboard link", 500);
      }
    }
  );

  // GET /api/settings/stripe/platform-fee
  getPlatformFee = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const settings = await SystemSettings.findOne();
      this.sendSuccess(res, {
        platformFeePercent: settings?.platformFeePercent || 0,
      }, "Platform fee retrieved");
    }
  );

  // PUT /api/settings/stripe/platform-fee
  setPlatformFee = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { platformFeePercent } = req.body;

      if (platformFeePercent === undefined || platformFeePercent === null) {
        return this.sendError(res, "platformFeePercent is required", 400);
      }

      const fee = Number(platformFeePercent);
      if (isNaN(fee) || fee < 0 || fee > 100) {
        return this.sendError(res, "platformFeePercent must be between 0 and 100", 400);
      }

      const updatedBy = (req as any).user?.sub || (req as any).user?.id || "system";
      await SystemSettings.findOneAndUpdate(
        {},
        { platformFeePercent: fee, updatedBy },
        { upsert: true, new: true }
      );

      logger.info(`Platform fee updated to ${fee}% by ${updatedBy}`);

      this.sendSuccess(res, {
        platformFeePercent: fee,
      }, "Platform fee updated");
    }
  );
}

export const connectController = new ConnectController();
export default connectController;
