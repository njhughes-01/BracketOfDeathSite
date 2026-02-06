import mongoose, { Schema, Document } from "mongoose";

export interface IStripeEvent extends Document {
  stripeEventId: string;
  type: string;
  livemode: boolean;
  
  // Extracted references for querying
  tournamentId?: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  playerId?: mongoose.Types.ObjectId;
  ticketId?: mongoose.Types.ObjectId;
  
  amount?: number; // In cents
  currency?: string;
  
  // Raw Stripe event data
  rawData: object;
  
  // Processing status
  processedAt: Date;
  processingError?: string;
  
  createdAt: Date;
}

const StripeEventSchema: Schema = new Schema(
  {
    stripeEventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      index: true,
    },
    livemode: {
      type: Boolean,
      required: true,
      default: false,
    },
    
    // Extracted references
    tournamentId: {
      type: Schema.Types.ObjectId,
      ref: "Tournament",
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    playerId: {
      type: Schema.Types.ObjectId,
      ref: "Player",
      index: true,
    },
    ticketId: {
      type: Schema.Types.ObjectId,
      ref: "TournamentTicket",
      index: true,
    },
    
    amount: {
      type: Number,
      min: 0,
    },
    currency: {
      type: String,
      uppercase: true,
      maxlength: 3,
    },
    
    rawData: {
      type: Schema.Types.Mixed,
      required: true,
    },
    
    processedAt: {
      type: Date,
      default: Date.now,
    },
    processingError: {
      type: String,
    },
  },
  { 
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound indexes for common queries
StripeEventSchema.index({ type: 1, createdAt: -1 });
StripeEventSchema.index({ tournamentId: 1, createdAt: -1 });
StripeEventSchema.index({ userId: 1, createdAt: -1 });
StripeEventSchema.index({ createdAt: -1 });
StripeEventSchema.index({ livemode: 1, type: 1 });

// Virtual to check if processing failed
StripeEventSchema.virtual("hasFailed").get(function(this: IStripeEvent) {
  return !!this.processingError;
});

// Static method to log a Stripe event
StripeEventSchema.statics.logEvent = async function(
  stripeEvent: any,
  extractedData?: {
    tournamentId?: mongoose.Types.ObjectId;
    userId?: mongoose.Types.ObjectId;
    playerId?: mongoose.Types.ObjectId;
    ticketId?: mongoose.Types.ObjectId;
    amount?: number;
    currency?: string;
  },
  error?: string
): Promise<IStripeEvent> {
  // Check for duplicate (idempotency)
  const existing = await this.findOne({ stripeEventId: stripeEvent.id });
  if (existing) {
    return existing;
  }
  
  const event = new this({
    stripeEventId: stripeEvent.id,
    type: stripeEvent.type,
    livemode: stripeEvent.livemode,
    rawData: stripeEvent,
    processedAt: new Date(),
    processingError: error,
    ...extractedData,
  });
  
  return event.save();
};

// Static method to get events with pagination
StripeEventSchema.statics.getEvents = async function(options: {
  type?: string;
  tournamentId?: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}): Promise<{ events: IStripeEvent[]; total: number; page: number; totalPages: number }> {
  const {
    type,
    tournamentId,
    userId,
    startDate,
    endDate,
    page = 1,
    limit = 50,
  } = options;
  
  const query: any = {};
  
  if (type) query.type = type;
  if (tournamentId) query.tournamentId = tournamentId;
  if (userId) query.userId = userId;
  
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = startDate;
    if (endDate) query.createdAt.$lte = endDate;
  }
  
  const total = await this.countDocuments(query);
  const totalPages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;
  
  const events = await this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('tournamentId', 'bodNumber date')
    .populate('playerId', 'firstName lastName')
    .populate('ticketId', 'ticketCode status');
  
  return { events, total, page, totalPages };
};

// Static method to get revenue summary
StripeEventSchema.statics.getRevenueSummary = async function(options: {
  tournamentId?: mongoose.Types.ObjectId;
  startDate?: Date;
  endDate?: Date;
}): Promise<{
  totalRevenue: number;
  totalRefunds: number;
  netRevenue: number;
  transactionCount: number;
  refundCount: number;
}> {
  const { tournamentId, startDate, endDate } = options;
  
  const matchStage: any = {
    type: { $in: ['checkout.session.completed', 'charge.refunded'] },
  };
  
  if (tournamentId) matchStage.tournamentId = tournamentId;
  
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = startDate;
    if (endDate) matchStage.createdAt.$lte = endDate;
  }
  
  const result = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalRevenue: {
          $sum: {
            $cond: [
              { $eq: ['$type', 'checkout.session.completed'] },
              { $ifNull: ['$amount', 0] },
              0
            ]
          }
        },
        totalRefunds: {
          $sum: {
            $cond: [
              { $eq: ['$type', 'charge.refunded'] },
              { $ifNull: ['$amount', 0] },
              0
            ]
          }
        },
        transactionCount: {
          $sum: {
            $cond: [{ $eq: ['$type', 'checkout.session.completed'] }, 1, 0]
          }
        },
        refundCount: {
          $sum: {
            $cond: [{ $eq: ['$type', 'charge.refunded'] }, 1, 0]
          }
        },
      }
    }
  ]);
  
  if (result.length === 0) {
    return {
      totalRevenue: 0,
      totalRefunds: 0,
      netRevenue: 0,
      transactionCount: 0,
      refundCount: 0,
    };
  }
  
  const { totalRevenue, totalRefunds, transactionCount, refundCount } = result[0];
  
  return {
    totalRevenue,
    totalRefunds,
    netRevenue: totalRevenue - totalRefunds,
    transactionCount,
    refundCount,
  };
};

// Ensure virtuals are included in JSON
StripeEventSchema.set('toJSON', { virtuals: true });
StripeEventSchema.set('toObject', { virtuals: true });

export interface IStripeEventModel extends mongoose.Model<IStripeEvent> {
  logEvent(
    stripeEvent: any,
    extractedData?: {
      tournamentId?: mongoose.Types.ObjectId;
      userId?: mongoose.Types.ObjectId;
      playerId?: mongoose.Types.ObjectId;
      ticketId?: mongoose.Types.ObjectId;
      amount?: number;
      currency?: string;
    },
    error?: string
  ): Promise<IStripeEvent>;
  getEvents(options: {
    type?: string;
    tournamentId?: mongoose.Types.ObjectId;
    userId?: mongoose.Types.ObjectId;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ events: IStripeEvent[]; total: number; page: number; totalPages: number }>;
  getRevenueSummary(options: {
    tournamentId?: mongoose.Types.ObjectId;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    totalRevenue: number;
    totalRefunds: number;
    netRevenue: number;
    transactionCount: number;
    refundCount: number;
  }>;
}

export default mongoose.model<IStripeEvent, IStripeEventModel>(
  "StripeEvent",
  StripeEventSchema
);
