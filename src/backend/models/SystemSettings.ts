import mongoose, { Schema, Document } from "mongoose";
import { EmailProviderType, SUPPORTED_EMAIL_PROVIDERS } from "../services/email/IEmailProvider";

export interface ISystemSettings extends Document {
  // Mailjet settings
  mailjetApiKey?: string;
  mailjetApiSecret?: string;
  mailjetSenderEmail?: string;

  // Mailgun settings
  mailgunApiKey?: string;
  mailgunDomain?: string;

  // Shared settings
  senderEmail?: string;

  // Provider config
  activeProvider: EmailProviderType;
  
  // Stripe settings
  stripePublishableKey?: string;
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  
  // Global pricing (skeleton for memberships)
  annualMembershipFee?: number;   // In cents, future use
  monthlyMembershipFee?: number;  // In cents, future use
  defaultEntryFee?: number;       // Default tournament fee in cents
  
  // Branding settings
  siteLogo?: string; // Base64 or URL
  siteLogoUrl?: string; // External URL fallback
  favicon?: string; // Base64 or URL
  brandName?: string;
  brandPrimaryColor?: string; // Hex color
  brandSecondaryColor?: string; // Hex color
  // Metadata
  updatedAt: Date;
  updatedBy: string;
}

const SystemSettingsSchema: Schema = new Schema(
  {
    // Mailjet settings
    mailjetApiKey: { type: String, select: false }, // Hide by default
    mailjetApiSecret: { type: String, select: false }, // Hide by default
    mailjetSenderEmail: { type: String },

    // Mailgun settings
    mailgunApiKey: { type: String, select: false },
    mailgunDomain: { type: String },

    // Shared settings
    senderEmail: { type: String },

    // Provider config
    activeProvider: {
      type: String,
      enum: SUPPORTED_EMAIL_PROVIDERS,
      default: "mailjet"
    },
    
    // Stripe settings
    stripePublishableKey: { type: String },
    stripeSecretKey: { type: String, select: false }, // Hide by default
    stripeWebhookSecret: { type: String, select: false }, // Hide by default
    
    // Global pricing (skeleton for memberships)
    annualMembershipFee: { type: Number, min: 0 },   // In cents
    monthlyMembershipFee: { type: Number, min: 0 },  // In cents
    defaultEntryFee: { type: Number, min: 0, default: 0 }, // In cents
    
    // Branding settings
    siteLogo: { type: String }, // Base64 encoded image
    siteLogoUrl: { type: String }, // External URL fallback
    favicon: { type: String }, // Base64 encoded image
    brandName: { type: String, default: "Bracket of Death" },
    brandPrimaryColor: { type: String, default: "#4CAF50" },
    brandSecondaryColor: { type: String, default: "#008CBA" },
    // Metadata
    updatedBy: { type: String, required: true },
  },
  { timestamps: true },
);

// Ensure only one settings document exists
SystemSettingsSchema.statics.getInstance = async function () {
  const settings = await this.findOne();
  return settings || new this({ updatedBy: "system" });
};

export default mongoose.model<ISystemSettings>(
  "SystemSettings",
  SystemSettingsSchema,
);
