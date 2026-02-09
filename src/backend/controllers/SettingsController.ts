import { Request, Response } from "express";
import { BaseController } from "./base";
import SystemSettings from "../models/SystemSettings";
import emailService from "../services/EmailService";
import { SUPPORTED_EMAIL_PROVIDERS } from "../services/email/IEmailProvider";
import StripeService from "../services/StripeService";

export class SettingsController extends BaseController {
  constructor() {
    super();
  }
  static readonly PUBLIC_BRANDING_DEFAULTS = {
    brandName: "Bracket of Death",
    brandPrimaryColor: "#4CAF50",
    brandSecondaryColor: "#008CBA",
    siteLogo: "",
    siteLogoUrl: "",
    favicon: "",
  };

  // Get public branding settings (no auth required)
  getPublicSettings = this.asyncHandler(
    async (_req: Request, res: Response): Promise<void> => {
      const settings = await SystemSettings.findOne().select("brandName brandPrimaryColor brandSecondaryColor siteLogo siteLogoUrl favicon");
      const defaults = SettingsController.PUBLIC_BRANDING_DEFAULTS;

      const data = {
        brandName: settings?.brandName ?? defaults.brandName,
        brandPrimaryColor: settings?.brandPrimaryColor ?? defaults.brandPrimaryColor,
        brandSecondaryColor: settings?.brandSecondaryColor ?? defaults.brandSecondaryColor,
        siteLogo: settings?.siteLogo ?? defaults.siteLogo,
        siteLogoUrl: settings?.siteLogoUrl ?? defaults.siteLogoUrl,
        favicon: settings?.favicon ?? defaults.favicon,
      };

      this.sendSuccess(res, data, "Public settings retrieved successfully");
    },
  );

  // Get current settings (masked)
  getSettings = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const settings = await SystemSettings.findOne().select(
        "+mailjetApiKey +mailjetApiSecret +mailgunApiKey",
      );

      // Check for environment variables first
      const envMailgunKey = process.env.MAILGUN_API_KEY;
      const envMailgunDomain = process.env.MAILGUN_DOMAIN;
      const envMailjetKey = process.env.MAILJET_API_KEY;
      const envMailjetSecret = process.env.MAILJET_API_SECRET;

      const mailgunFromEnv = !!(envMailgunKey && envMailgunDomain);
      const mailjetFromEnv = !!(envMailjetKey && envMailjetSecret);
      const emailConfigSource = mailgunFromEnv || mailjetFromEnv ? "environment" : 
        (settings?.mailgunApiKey || settings?.mailjetApiKey ? "database" : null);

      // Determine active provider
      let activeProvider = settings?.activeProvider || "mailjet";
      if (mailgunFromEnv) activeProvider = "mailgun";
      else if (mailjetFromEnv) activeProvider = "mailjet";

      const data = {
        // Email Provider config
        activeProvider,
        senderEmail: settings?.senderEmail || "",
        emailConfigSource,

        // Mailjet config - check env vars first, then database
        mailjetConfigured: mailjetFromEnv || !!(
          settings?.mailjetApiKey && settings?.mailjetApiSecret
        ),
        mailjetSenderEmail: settings?.mailjetSenderEmail || "",
        hasApiKey: mailjetFromEnv || !!settings?.mailjetApiKey,
        hasApiSecret: mailjetFromEnv || !!settings?.mailjetApiSecret,

        // Mailgun config - check env vars first, then database
        mailgunConfigured: mailgunFromEnv || !!(
          settings?.mailgunApiKey && settings?.mailgunDomain
        ),
        mailgunDomain: mailgunFromEnv ? envMailgunDomain : (settings?.mailgunDomain || ""),
        hasMailgunApiKey: mailgunFromEnv || !!settings?.mailgunApiKey,

        // Branding config
        siteLogo: settings?.siteLogo || "",
        siteLogoUrl: settings?.siteLogoUrl || "",
        favicon: settings?.favicon || "",
        brandName: settings?.brandName || "Bracket of Death",
        brandPrimaryColor: settings?.brandPrimaryColor || "#4CAF50",
        brandSecondaryColor: settings?.brandSecondaryColor || "#008CBA",
        
        // Stripe config (public info only)
        stripeConfigured: await StripeService.isStripeConfigured(),
        stripePublishableKey: await StripeService.getPublishableKey(),
        
        // Global pricing (skeleton for memberships)
        defaultEntryFee: settings?.defaultEntryFee || 0,
        annualMembershipFee: settings?.annualMembershipFee,
        monthlyMembershipFee: settings?.monthlyMembershipFee,
      };

      this.sendSuccess(res, data, "Settings retrieved successfully");
    },
  );

  // Update settings
  updateSettings = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const {
        activeProvider,
        senderEmail,
        mailjetApiKey,
        mailjetApiSecret,
        mailjetSenderEmail, // Legacy support
        mailgunApiKey,
        mailgunDomain,
        siteLogo,
        siteLogoUrl,
        favicon,
        brandName,
        brandPrimaryColor,
        brandSecondaryColor,
      } = req.body;

      // requireAdmin middleware should handle this, but adding check for safety
      if (!(req as any).user?.isAdmin) {
        return this.sendForbidden(res, "Administrative privileges required");
      }

      // Input validation
      const errors: string[] = [];

      // Validate hex colors (must be valid CSS hex color)
      const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      if (
        brandPrimaryColor !== undefined &&
        !hexColorRegex.test(brandPrimaryColor)
      ) {
        errors.push(
          "Invalid primary color format. Use hex format like #4CAF50",
        );
      }
      if (
        brandSecondaryColor !== undefined &&
        !hexColorRegex.test(brandSecondaryColor)
      ) {
        errors.push(
          "Invalid secondary color format. Use hex format like #008CBA",
        );
      }

      // Validate base64 image sizes (max 500KB each)
      const maxBase64Size = 500 * 1024; // 500KB in bytes (base64 is ~33% larger than binary)
      if (siteLogo && siteLogo.length > maxBase64Size) {
        errors.push("Site logo exceeds 500KB limit");
      }
      if (favicon && favicon.length > maxBase64Size) {
        errors.push("Favicon exceeds 500KB limit");
      }

      // Validate base64 format for images
      const base64ImageRegex =
        /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,/;
      if (siteLogo && siteLogo.length > 0 && !base64ImageRegex.test(siteLogo)) {
        errors.push(
          "Invalid logo format. Only PNG, JPEG, GIF, WebP, or SVG allowed",
        );
      }
      if (favicon && favicon.length > 0 && !base64ImageRegex.test(favicon)) {
        errors.push(
          "Invalid favicon format. Only PNG, JPEG, GIF, WebP, or SVG allowed",
        );
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (
        mailjetSenderEmail !== undefined &&
        mailjetSenderEmail.length > 0 &&
        !emailRegex.test(mailjetSenderEmail)
      ) {
        errors.push("Invalid sender email format");
      }

      // Validate brand name length and sanitize
      if (brandName !== undefined) {
        if (brandName.length > 100) {
          errors.push("Brand name cannot exceed 100 characters");
        }
        if (typeof brandName !== "string") {
          errors.push("Brand name must be a string");
        }
      }

      // Validate URL format for logoUrl
      if (siteLogoUrl !== undefined && siteLogoUrl.length > 0) {
        try {
          new URL(siteLogoUrl);
        } catch {
          errors.push("Invalid logo URL format");
        }
      }

      if (errors.length > 0) {
        return this.sendValidationError(res, errors);
      }

      let settings = await SystemSettings.findOne();
      if (!settings) {
        settings = new SystemSettings({ updatedBy: (req as any).user.username });
      }

      // Sanitize text inputs by removing HTML tags (XSS prevention)
      const sanitizeText = (input: string): string => {
        if (!input) return input;
        return input.replace(/<[^>]*>/g, "").trim();
      };
      const normalizeOptional = (value?: string): string | undefined => {
        if (value === "") {
          return undefined;
        }
        return value;
      };

      // General Email Settings
      if (senderEmail !== undefined) settings.senderEmail = senderEmail;

      // Active Provider
      if (activeProvider !== undefined) {
        if (SUPPORTED_EMAIL_PROVIDERS.includes(activeProvider as any)) {
          settings.activeProvider = activeProvider;
        } else {
          return this.sendValidationError(res, [
            `Invalid email provider specified: ${activeProvider}`,
          ]);
        }
      }

      // Mailjet settings
      if (mailjetApiKey !== undefined) {
        settings.mailjetApiKey = normalizeOptional(mailjetApiKey);
      }
      if (mailjetApiSecret !== undefined) {
        settings.mailjetApiSecret = normalizeOptional(mailjetApiSecret);
      }
      if (mailjetSenderEmail !== undefined)
        settings.mailjetSenderEmail = mailjetSenderEmail;

      // Mailgun settings
      if (mailgunApiKey !== undefined) {
        settings.mailgunApiKey = normalizeOptional(mailgunApiKey);
      }
      if (mailgunDomain !== undefined) {
        settings.mailgunDomain = normalizeOptional(mailgunDomain);
      }

      // Branding settings (sanitized)
      if (siteLogo !== undefined) settings.siteLogo = siteLogo;
      if (siteLogoUrl !== undefined) settings.siteLogoUrl = siteLogoUrl;
      if (favicon !== undefined) settings.favicon = favicon;
      if (brandName !== undefined) settings.brandName = sanitizeText(brandName);
      if (brandPrimaryColor !== undefined)
        settings.brandPrimaryColor = brandPrimaryColor;
      if (brandSecondaryColor !== undefined)
        settings.brandSecondaryColor = brandSecondaryColor;

      settings.updatedBy = (req as any).user.username;
      await settings.save();

      this.sendSuccess(res, undefined, "Settings updated successfully");
    },
  );

  // Test email configuration
  testEmail = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const {
        testEmail,
        activeProvider,
        mailgunApiKey,
        mailgunDomain,
        mailjetApiKey,
        mailjetApiSecret,
        senderEmail,
      } = req.body;

      if (!testEmail) {
        return this.sendValidationError(res, ["Test email address is required"]);
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(testEmail)) {
        return this.sendValidationError(res, ["Invalid email address format"]);
      }

      // Use provided config for test, or fall back to database settings
      const config = {
        activeProvider,
        mailgunApiKey,
        mailgunDomain,
        mailjetApiKey,
        mailjetApiSecret,
        senderEmail,
      };

      const success = await emailService.sendTestEmail(testEmail, config);

      if (success) {
        this.sendSuccess(res, undefined, "Test email sent successfully");
      } else {
        this.sendError(
          res,
          "Failed to send test email. Check your provider configuration.",
          500,
        );
      }
    },
  );

  // Check if email is configured (public endpoint for banner)
  isEmailConfigured = this.asyncHandler(
    async (_req: Request, res: Response): Promise<void> => {
      // Check environment variables first
      const envMailgunKey = process.env.MAILGUN_API_KEY;
      const envMailgunDomain = process.env.MAILGUN_DOMAIN;
      const envMailjetKey = process.env.MAILJET_API_KEY;
      const envMailjetSecret = process.env.MAILJET_API_SECRET;

      // If env vars are set, they take priority
      const isEnvMailgunConfigured = !!(envMailgunKey && envMailgunDomain);
      const isEnvMailjetConfigured = !!(envMailjetKey && envMailjetSecret);

      if (isEnvMailgunConfigured || isEnvMailjetConfigured) {
        this.sendSuccess(res, {
          configured: true,
          source: "environment",
          provider: isEnvMailgunConfigured ? "mailgun" : "mailjet",
          message: "Email is configured via environment variables. To change settings, update your .env file."
        });
        return;
      }

      // Fall back to database settings
      const settings = await SystemSettings.findOne().select('+mailgunApiKey +mailjetApiKey +mailjetApiSecret');
      const provider = settings?.activeProvider || "mailjet";
      const isMailgunConfigured =
        provider === "mailgun" && !!(settings?.mailgunApiKey && settings?.mailgunDomain);
      const isMailjetConfigured =
        provider === "mailjet" &&
        !!(settings?.mailjetApiKey && settings?.mailjetApiSecret);
      const configured = isMailgunConfigured || isMailjetConfigured;

      this.sendSuccess(res, {
        configured,
        source: configured ? "database" : null,
        provider: configured ? provider : null
      });
    },
  );

  // Verify provider credentials
  verifyCredentials = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { provider, ...config } = req.body;

      if (!provider || !SUPPORTED_EMAIL_PROVIDERS.includes(provider)) {
        return this.sendValidationError(res, ["Invalid provider"]);
      }

      const verified = await emailService.verifyProvider(provider, config);

      if (verified) {
        this.sendSuccess(res, undefined, "Credentials verified successfully");
      } else {
        this.sendError(
          res,
          "Verification failed. Please check your credentials.",
          400,
        );
      }
    },
  );

  // Get available email providers
  getEmailProviders = this.asyncHandler(
    async (_req: Request, res: Response): Promise<void> => {
      const providers = SUPPORTED_EMAIL_PROVIDERS.map((provider) => ({
        id: provider,
        name: provider.charAt(0).toUpperCase() + provider.slice(1),
        configured: false, // Will be checked below
      }));

      // Check which providers are configured
      const settings = await SystemSettings.findOne().select(
        "+mailjetApiKey +mailjetApiSecret +mailgunApiKey",
      );

      if (settings) {
        providers.forEach((p) => {
          if (p.id === "mailjet") {
            p.configured = !!(settings.mailjetApiKey && settings.mailjetApiSecret);
          } else if (p.id === "mailgun") {
            p.configured = !!(settings.mailgunApiKey && settings.mailgunDomain);
          }
        });
      }

      this.sendSuccess(res, providers, "Email providers retrieved");
    },
  );

  // Update email settings specifically
  updateEmailSettings = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const {
        activeProvider,
        senderEmail,
        mailjetApiKey,
        mailjetApiSecret,
        mailgunApiKey,
        mailgunDomain,
      } = req.body;

      // Validate provider
      if (activeProvider && !SUPPORTED_EMAIL_PROVIDERS.includes(activeProvider)) {
        return this.sendValidationError(res, [
          `Invalid email provider: ${activeProvider}. Supported: ${SUPPORTED_EMAIL_PROVIDERS.join(", ")}`,
        ]);
      }

      let settings = await SystemSettings.findOne();
      if (!settings) {
        settings = new SystemSettings({ updatedBy: (req as any).user?.username || "system" });
      }

      // Update email-specific fields
      if (activeProvider !== undefined) settings.activeProvider = activeProvider;
      if (senderEmail !== undefined) settings.senderEmail = senderEmail;
      if (mailjetApiKey) settings.mailjetApiKey = mailjetApiKey;
      if (mailjetApiSecret) settings.mailjetApiSecret = mailjetApiSecret;
      if (mailgunApiKey) settings.mailgunApiKey = mailgunApiKey;
      if (mailgunDomain) settings.mailgunDomain = mailgunDomain;

      settings.updatedBy = (req as any).user?.username || "system";
      await settings.save();

      // Return updated email settings (masked)
      const data = {
        activeProvider: settings.activeProvider,
        senderEmail: settings.senderEmail,
        mailjetConfigured: !!(settings.mailjetApiKey && settings.mailjetApiSecret),
        mailgunConfigured: !!(settings.mailgunApiKey && settings.mailgunDomain),
      };

      this.sendSuccess(res, data, "Email settings updated successfully");
    },
  );

  // Get Stripe settings
  getStripeSettings = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const settings = await SystemSettings.findOne().select(
        "+stripeSecretKey +stripeWebhookSecret"
      );

      // Check for environment variables first
      const envSecretKey = process.env.STRIPE_SECRET_KEY;
      const envPublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
      const envWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      const stripeFromEnv = !!(envSecretKey && envPublishableKey);
      const stripeConfigSource = stripeFromEnv 
        ? "environment" 
        : (settings?.stripeSecretKey ? "database" : null);

      const data = {
        stripeConfigured: stripeFromEnv || !!(settings?.stripeSecretKey),
        stripeConfigSource,
        stripePublishableKey: stripeFromEnv 
          ? envPublishableKey 
          : (settings?.stripePublishableKey || ""),
        hasSecretKey: stripeFromEnv || !!settings?.stripeSecretKey,
        hasWebhookSecret: !!envWebhookSecret || !!settings?.stripeWebhookSecret,
        defaultEntryFee: settings?.defaultEntryFee || 0,
        annualMembershipFee: settings?.annualMembershipFee || null,
        monthlyMembershipFee: settings?.monthlyMembershipFee || null,
      };

      this.sendSuccess(res, data, "Stripe settings retrieved successfully");
    },
  );

  // Update Stripe settings
  updateStripeSettings = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const {
        stripePublishableKey,
        stripeSecretKey,
        stripeWebhookSecret,
        defaultEntryFee,
      } = req.body;

      // requireAdmin middleware should handle this, but adding check for safety
      if (!(req as any).user?.isAdmin) {
        return this.sendForbidden(res, "Administrative privileges required");
      }

      // Input validation
      const errors: string[] = [];

      // Validate publishable key format
      if (stripePublishableKey && !stripePublishableKey.startsWith("pk_")) {
        errors.push("Invalid publishable key format. Must start with pk_");
      }

      // Validate secret key format
      if (stripeSecretKey && !stripeSecretKey.startsWith("sk_")) {
        errors.push("Invalid secret key format. Must start with sk_");
      }

      // Validate webhook secret format
      if (stripeWebhookSecret && !stripeWebhookSecret.startsWith("whsec_")) {
        errors.push("Invalid webhook secret format. Must start with whsec_");
      }

      // Validate entry fee
      if (defaultEntryFee !== undefined) {
        if (typeof defaultEntryFee !== "number" || defaultEntryFee < 0) {
          errors.push("Default entry fee must be a non-negative number (in cents)");
        }
      }

      if (errors.length > 0) {
        return this.sendValidationError(res, errors);
      }

      let settings = await SystemSettings.findOne();
      if (!settings) {
        settings = new SystemSettings({ updatedBy: (req as any).user.username });
      }

      // Update Stripe fields (only if provided)
      if (stripePublishableKey !== undefined) {
        settings.stripePublishableKey = stripePublishableKey || undefined;
      }
      if (stripeSecretKey) {
        settings.stripeSecretKey = stripeSecretKey;
      }
      if (stripeWebhookSecret) {
        settings.stripeWebhookSecret = stripeWebhookSecret;
      }
      if (defaultEntryFee !== undefined) {
        settings.defaultEntryFee = defaultEntryFee;
      }

      settings.updatedBy = (req as any).user.username;
      await settings.save();

      // Clear Stripe instance if keys changed (to reload)
      if (stripeSecretKey) {
        // Force re-initialization of Stripe on next use
        StripeService.resetClient();
      }

      this.sendSuccess(res, undefined, "Stripe settings updated successfully");
    },
  );
}

export default new SettingsController();
