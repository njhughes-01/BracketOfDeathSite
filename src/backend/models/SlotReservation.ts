import mongoose, { Schema, Document } from "mongoose";

export type ReservationStatus = 'active' | 'completed' | 'expired' | 'cancelled';

export interface ISlotReservation extends Document {
  tournamentId: mongoose.Types.ObjectId;
  userId: string;
  playerId: mongoose.Types.ObjectId;
  expiresAt: Date;
  status: ReservationStatus;
  stripeSessionId?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Virtuals
  isValid: boolean;
  remainingSeconds: number;
  
  // Methods
  complete(stripeSessionId?: string): Promise<void>;
  cancel(): Promise<void>;
}

// Default reservation timeout in minutes
export const RESERVATION_TIMEOUT_MINUTES = 35;

const SlotReservationSchema: Schema = new Schema(
  {
    tournamentId: {
      type: Schema.Types.ObjectId,
      ref: "Tournament",
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    playerId: {
      type: Schema.Types.ObjectId,
      ref: "Player",
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'expired', 'cancelled'],
      default: 'active',
      index: true,
    },
    stripeSessionId: {
      type: String,
      sparse: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Compound indexes for common queries
SlotReservationSchema.index({ tournamentId: 1, userId: 1 });
SlotReservationSchema.index({ status: 1, expiresAt: 1 }); // For cleanup job
SlotReservationSchema.index({ tournamentId: 1, status: 1 });

// Virtual to check if reservation is still valid
SlotReservationSchema.virtual("isValid").get(function(this: ISlotReservation) {
  return this.status === 'active' && this.expiresAt > new Date();
});

// Virtual to get remaining seconds
SlotReservationSchema.virtual("remainingSeconds").get(function(this: ISlotReservation) {
  if (this.status !== 'active') return 0;
  const remaining = Math.floor((this.expiresAt.getTime() - Date.now()) / 1000);
  return Math.max(0, remaining);
});

// Static method to create a new reservation
SlotReservationSchema.statics.createReservation = async function(
  tournamentId: mongoose.Types.ObjectId,
  userId: string,
  playerId: mongoose.Types.ObjectId,
  timeoutMinutes: number = RESERVATION_TIMEOUT_MINUTES
): Promise<ISlotReservation> {
  // Cancel any existing active reservations for this user/tournament
  await this.updateMany(
    { tournamentId, userId, status: 'active' },
    { status: 'cancelled' }
  );

  const expiresAt = new Date(Date.now() + timeoutMinutes * 60 * 1000);
  
  const reservation = new this({
    tournamentId,
    userId,
    playerId,
    expiresAt,
    status: 'active',
  });

  return reservation.save();
};

// Static method to find and expire stale reservations
SlotReservationSchema.statics.expireStaleReservations = async function(): Promise<number> {
  const result = await this.updateMany(
    { status: 'active', expiresAt: { $lt: new Date() } },
    { status: 'expired' }
  );
  return result.modifiedCount;
};

// Static method to get active reservation for user/tournament
SlotReservationSchema.statics.getActiveReservation = async function(
  tournamentId: mongoose.Types.ObjectId,
  userId: string
): Promise<ISlotReservation | null> {
  return this.findOne({
    tournamentId,
    userId,
    status: 'active',
    expiresAt: { $gt: new Date() },
  });
};

// Static method to count active reservations for a tournament
SlotReservationSchema.statics.countActiveReservations = async function(
  tournamentId: mongoose.Types.ObjectId
): Promise<number> {
  return this.countDocuments({
    tournamentId,
    status: 'active',
    expiresAt: { $gt: new Date() },
  });
};

// Instance method to complete reservation
SlotReservationSchema.methods.complete = async function(stripeSessionId?: string): Promise<void> {
  this.status = 'completed';
  if (stripeSessionId) {
    this.stripeSessionId = stripeSessionId;
  }
  await this.save();
};

// Instance method to cancel reservation
SlotReservationSchema.methods.cancel = async function(): Promise<void> {
  this.status = 'cancelled';
  await this.save();
};

// Ensure virtuals are included in JSON
SlotReservationSchema.set('toJSON', { virtuals: true });
SlotReservationSchema.set('toObject', { virtuals: true });

export interface ISlotReservationModel extends mongoose.Model<ISlotReservation> {
  createReservation(
    tournamentId: mongoose.Types.ObjectId,
    userId: string,
    playerId: mongoose.Types.ObjectId,
    timeoutMinutes?: number
  ): Promise<ISlotReservation>;
  expireStaleReservations(): Promise<number>;
  getActiveReservation(
    tournamentId: mongoose.Types.ObjectId,
    userId: string
  ): Promise<ISlotReservation | null>;
  countActiveReservations(tournamentId: mongoose.Types.ObjectId): Promise<number>;
}

export default mongoose.model<ISlotReservation, ISlotReservationModel>(
  "SlotReservation",
  SlotReservationSchema
);
