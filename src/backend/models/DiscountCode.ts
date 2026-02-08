import mongoose, { Schema, Document } from "mongoose";

export interface IDiscountCode extends Document {
  code: string;
  stripeCouponId: string;
  type: 'percent' | 'amount';
  percentOff?: number;
  amountOff?: number;
  maxRedemptions?: number;
  redemptionCount: number;
  expiresAt?: Date;
  tournamentIds?: mongoose.Types.ObjectId[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Virtuals
  isUsable: boolean;
  
  // Methods
  appliesToTournament(tournamentId: string): boolean;
  redeem(): Promise<void>;
}

const DiscountCodeSchema: Schema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [3, "Code must be at least 3 characters"],
      maxlength: [20, "Code cannot exceed 20 characters"],
      match: [/^[A-Z0-9]+$/, "Code can only contain letters and numbers"],
    },
    stripeCouponId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['percent', 'amount'],
    },
    percentOff: {
      type: Number,
      min: [1, "Percent off must be at least 1"],
      max: [100, "Percent off cannot exceed 100"],
      validate: {
        validator: function(this: IDiscountCode, value: number) {
          // Required if type is 'percent'
          if (this.type === 'percent' && !value) return false;
          return true;
        },
        message: "Percent off is required for percent type discounts",
      },
    },
    amountOff: {
      type: Number,
      min: [1, "Amount off must be at least 1 cent"],
      validate: {
        validator: function(this: IDiscountCode, value: number) {
          // Required if type is 'amount'
          if (this.type === 'amount' && !value) return false;
          return true;
        },
        message: "Amount off is required for amount type discounts",
      },
    },
    maxRedemptions: {
      type: Number,
      min: [1, "Max redemptions must be at least 1"],
    },
    redemptionCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    expiresAt: {
      type: Date,
      validate: {
        validator: function(value: Date) {
          if (!value) return true;
          return value > new Date();
        },
        message: "Expiration date must be in the future",
      },
    },
    tournamentIds: [{
      type: Schema.Types.ObjectId,
      ref: "Tournament",
    }],
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Indexes
DiscountCodeSchema.index({ code: 1 }, { unique: true });
DiscountCodeSchema.index({ active: 1 });
DiscountCodeSchema.index({ expiresAt: 1 });
DiscountCodeSchema.index({ stripeCouponId: 1 });

// Virtual to check if code is usable
DiscountCodeSchema.virtual("isUsable").get(function(this: IDiscountCode) {
  if (!this.active) return false;
  if (this.expiresAt && this.expiresAt < new Date()) return false;
  if (this.maxRedemptions && this.redemptionCount >= this.maxRedemptions) return false;
  return true;
});

// Method to check if code applies to a tournament
DiscountCodeSchema.methods.appliesToTournament = function(tournamentId: string): boolean {
  if (!this.tournamentIds || this.tournamentIds.length === 0) return true;
  return this.tournamentIds.some((id: mongoose.Types.ObjectId) => id.toString() === tournamentId);
};

// Method to increment redemption count
DiscountCodeSchema.methods.redeem = async function(): Promise<void> {
  this.redemptionCount += 1;
  await this.save();
};

// Ensure virtuals are included in JSON
DiscountCodeSchema.set('toJSON', { virtuals: true });
DiscountCodeSchema.set('toObject', { virtuals: true });

export default mongoose.model<IDiscountCode>("DiscountCode", DiscountCodeSchema);
