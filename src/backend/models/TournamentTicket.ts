import mongoose, { Schema, Document } from "mongoose";
import crypto from "crypto";

export type TicketStatus = 'valid' | 'checked_in' | 'refunded' | 'void';
export type PaymentStatus = 'paid' | 'free' | 'refunded';

export interface ITournamentTicket extends Document {
  ticketCode: string;
  qrCodeData?: string; // Base64 encoded QR image
  
  tournamentId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  playerId: mongoose.Types.ObjectId;
  teamId?: mongoose.Types.ObjectId;
  
  status: TicketStatus;
  paymentStatus: PaymentStatus;
  
  // Stripe references
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  amountPaid: number; // In cents
  discountCodeUsed?: string;
  
  // Check-in tracking
  checkedInAt?: Date;
  checkedInBy?: mongoose.Types.ObjectId;
  
  // Email tracking
  emailSentAt?: Date;
  emailResendCount: number;
  
  createdAt: Date;
  updatedAt: Date;
  
  // Virtuals
  canCheckIn: boolean;
  isCheckedIn: boolean;
  
  // Methods
  checkIn(adminUserId: mongoose.Types.ObjectId): Promise<boolean>;
  voidTicket(): Promise<void>;
  refund(): Promise<void>;
  recordEmailSent(): Promise<void>;
}

// Generate a unique ticket code (e.g., "BOD-A1B2C3D4")
function generateTicketCode(): string {
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `BOD-${randomPart}`;
}

const TournamentTicketSchema: Schema = new Schema(
  {
    ticketCode: {
      type: String,
      required: true,
      unique: true,
      default: generateTicketCode,
      uppercase: true,
      trim: true,
    },
    qrCodeData: {
      type: String, // Base64 encoded PNG
    },
    
    tournamentId: {
      type: Schema.Types.ObjectId,
      ref: "Tournament",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    playerId: {
      type: Schema.Types.ObjectId,
      ref: "Player",
      required: true,
      index: true,
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: "Team",
    },
    
    status: {
      type: String,
      enum: ['valid', 'checked_in', 'refunded', 'void'],
      default: 'valid',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['paid', 'free', 'refunded'],
      required: true,
      index: true,
    },
    
    // Stripe references
    stripeSessionId: {
      type: String,
      sparse: true,
      index: true,
    },
    stripePaymentIntentId: {
      type: String,
      sparse: true,
      index: true,
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountCodeUsed: {
      type: String,
      uppercase: true,
    },
    
    // Check-in tracking
    checkedInAt: {
      type: Date,
    },
    checkedInBy: {
      type: Schema.Types.ObjectId,
    },
    
    // Email tracking
    emailSentAt: {
      type: Date,
    },
    emailResendCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

// Compound indexes
TournamentTicketSchema.index({ ticketCode: 1 }, { unique: true });
TournamentTicketSchema.index({ tournamentId: 1, userId: 1 });
TournamentTicketSchema.index({ tournamentId: 1, status: 1 });
TournamentTicketSchema.index({ stripePaymentIntentId: 1 });

// Virtual to check if ticket can be checked in
TournamentTicketSchema.virtual("canCheckIn").get(function(this: ITournamentTicket) {
  return this.status === 'valid';
});

// Virtual to check if already checked in
TournamentTicketSchema.virtual("isCheckedIn").get(function(this: ITournamentTicket) {
  return this.status === 'checked_in';
});

// Instance method to check in
TournamentTicketSchema.methods.checkIn = async function(adminUserId: mongoose.Types.ObjectId): Promise<boolean> {
  if (this.status !== 'valid') {
    return false;
  }
  
  this.status = 'checked_in';
  this.checkedInAt = new Date();
  this.checkedInBy = adminUserId;
  await this.save();
  return true;
};

// Instance method to void ticket
TournamentTicketSchema.methods.voidTicket = async function(): Promise<void> {
  this.status = 'void';
  await this.save();
};

// Instance method to mark as refunded
TournamentTicketSchema.methods.refund = async function(): Promise<void> {
  this.status = 'refunded';
  this.paymentStatus = 'refunded';
  await this.save();
};

// Instance method to record email sent
TournamentTicketSchema.methods.recordEmailSent = async function(): Promise<void> {
  this.emailSentAt = new Date();
  this.emailResendCount += 1;
  await this.save();
};

// Static method to find by ticket code
TournamentTicketSchema.statics.findByCode = async function(code: string): Promise<ITournamentTicket | null> {
  return this.findOne({ ticketCode: code.toUpperCase() })
    .populate('playerId', 'firstName lastName')
    .populate('tournamentId', 'bodNumber date location format');
};

// Static method to get tickets for a user
TournamentTicketSchema.statics.getForUser = async function(userId: mongoose.Types.ObjectId): Promise<ITournamentTicket[]> {
  return this.find({ userId })
    .populate('tournamentId', 'bodNumber date location format status')
    .sort({ createdAt: -1 });
};

// Static method to get tickets for a tournament
TournamentTicketSchema.statics.getForTournament = async function(
  tournamentId: mongoose.Types.ObjectId,
  status?: TicketStatus
): Promise<ITournamentTicket[]> {
  const query: any = { tournamentId };
  if (status) query.status = status;
  
  return this.find(query)
    .populate('playerId', 'firstName lastName')
    .sort({ createdAt: -1 });
};

// Static method to get tournament ticket stats
TournamentTicketSchema.statics.getStatsForTournament = async function(
  tournamentId: mongoose.Types.ObjectId
): Promise<{
  total: number;
  valid: number;
  checkedIn: number;
  refunded: number;
  voided: number;
  revenue: number;
  freeRegistrations: number;
}> {
  const tickets = await this.find({ tournamentId });
  
  return {
    total: tickets.length,
    valid: tickets.filter((t: ITournamentTicket) => t.status === 'valid').length,
    checkedIn: tickets.filter((t: ITournamentTicket) => t.status === 'checked_in').length,
    refunded: tickets.filter((t: ITournamentTicket) => t.status === 'refunded').length,
    voided: tickets.filter((t: ITournamentTicket) => t.status === 'void').length,
    revenue: tickets
      .filter((t: ITournamentTicket) => t.paymentStatus === 'paid')
      .reduce((sum: number, t: ITournamentTicket) => sum + t.amountPaid, 0),
    freeRegistrations: tickets.filter((t: ITournamentTicket) => t.paymentStatus === 'free').length,
  };
};

// Ensure virtuals are included in JSON
TournamentTicketSchema.set('toJSON', { virtuals: true });
TournamentTicketSchema.set('toObject', { virtuals: true });

export interface ITournamentTicketModel extends mongoose.Model<ITournamentTicket> {
  findByCode(code: string): Promise<ITournamentTicket | null>;
  getForUser(userId: mongoose.Types.ObjectId): Promise<ITournamentTicket[]>;
  getForTournament(tournamentId: mongoose.Types.ObjectId, status?: TicketStatus): Promise<ITournamentTicket[]>;
  getStatsForTournament(tournamentId: mongoose.Types.ObjectId): Promise<{
    total: number;
    valid: number;
    checkedIn: number;
    refunded: number;
    voided: number;
    revenue: number;
    freeRegistrations: number;
  }>;
}

export default mongoose.model<ITournamentTicket, ITournamentTicketModel>(
  "TournamentTicket",
  TournamentTicketSchema
);
