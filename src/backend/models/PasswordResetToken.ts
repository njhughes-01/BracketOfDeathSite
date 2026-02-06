import mongoose, { Schema, Document } from "mongoose";
import crypto from "crypto";

export interface IPasswordResetToken extends Document {
  userId: string;
  email: string;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

const PasswordResetTokenSchema: Schema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    email: { type: String, required: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: true },
    used: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Auto-delete expired tokens
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to generate a secure token
PasswordResetTokenSchema.statics.generateToken = function (): string {
  return crypto.randomBytes(32).toString("hex");
};

// Static method to create a new reset token
PasswordResetTokenSchema.statics.createForUser = async function (
  userId: string,
  email: string,
  expiresInMinutes: number = 60
): Promise<IPasswordResetToken> {
  // Invalidate any existing tokens for this user
  await this.updateMany({ userId, used: false }, { used: true });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  return this.create({
    userId,
    email,
    token,
    expiresAt,
    used: false,
  });
};

// Static method to validate and consume a token
PasswordResetTokenSchema.statics.validateAndConsume = async function (
  token: string
): Promise<IPasswordResetToken | null> {
  const resetToken = await this.findOne({
    token,
    used: false,
    expiresAt: { $gt: new Date() },
  });

  if (resetToken) {
    resetToken.used = true;
    await resetToken.save();
  }

  return resetToken;
};

export default mongoose.model<IPasswordResetToken>(
  "PasswordResetToken",
  PasswordResetTokenSchema
);
