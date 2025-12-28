import { Request, Response } from "express";
import { BaseController } from "./base";
import SystemSettings from "../models/SystemSettings";
import emailService from "../services/EmailService";
import { SUPPORTED_EMAIL_PROVIDERS } from "../services/email/IEmailProvider";

class SettingsController extends BaseController {
  constructor() {
    super();
  }
  // Get current settings (masked)
  getSettings = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const settings = await SystemSettings.findOne().select(
        "+mailjetApiKey +mailjetApiSecret +mailgunApiKey",
      );

      const data = {
        // Email Provider config
        activeProvider: settings?.activeProvider || "mailjet",
        senderEmail: settings?.senderEmail || "",

        // Mailjet config
        mailjetConfigured: !!(
          settings?.mailjetApiKey && settings?.mailjetApiSecret
        ),
        mailjetSenderEmail: settings?.mailjetSenderEmail || "",
        hasApiKey: !!settings?.mailjetApiKey,
        hasApiSecret: !!settings?.mailjetApiSecret,

        // Mailgun config
        mailgunConfigured: !!(
          settings?.mailgunApiKey && settings?.mailgunDomain
        ),
        mailgunDomain: settings?.mailgunDomain || "",
        hasMailgunApiKey: !!settings?.mailgunApiKey,

        // Branding config
        siteLogo: settings?.siteLogo || "",
        siteLogoUrl: settings?.siteLogoUrl || "",
        favicon: settings?.favicon || "",
        brandName: settings?.brandName || "Bracket of Death",
        brandPrimaryColor: settings?.brandPrimaryColor || "#4CAF50",
        brandSecondaryColor: settings?.brandSecondaryColor || "#008CBA",
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
      if (mailjetApiKey) settings.mailjetApiKey = mailjetApiKey;
      if (mailjetApiSecret) settings.mailjetApiSecret = mailjetApiSecret;
      if (mailjetSenderEmail !== undefined)
        settings.mailjetSenderEmail = mailjetSenderEmail;

      // Mailgun settings
      if (mailgunApiKey) settings.mailgunApiKey = mailgunApiKey;
      if (mailgunDomain) settings.mailgunDomain = mailgunDomain;

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
      const settings = await SystemSettings.findOne();
      const provider = settings?.activeProvider || "mailjet";
      const isMailgunConfigured =
        provider === "mailgun" && !!(settings?.mailgunApiKey && settings?.mailgunDomain);
      const isMailjetConfigured =
        provider === "mailjet" &&
        !!(settings?.mailjetApiKey && settings?.mailjetApiSecret);
      const configured = isMailgunConfigured || isMailjetConfigured;
      this.sendSuccess(res, { configured });
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
}

export default new SettingsController();
