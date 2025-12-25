import mongoose, { Schema, Document } from "mongoose";

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
  activeProvider: "mailjet" | "mailgun";
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
      enum: ["mailjet", "mailgun"],
      default: "mailjet"
    },
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
