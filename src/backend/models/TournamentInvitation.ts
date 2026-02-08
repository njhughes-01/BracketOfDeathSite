import mongoose, { Schema, Document } from "mongoose";

export type InvitationStatus = 'pending' | 'paid' | 'declined' | 'expired';

export interface ITournamentInvitation extends Document {
  tournamentId: mongoose.Types.ObjectId;
  playerId: mongoose.Types.ObjectId;
  email: string;
  
  status: InvitationStatus;
  
  invitedAt: Date;
  invitedBy: mongoose.Types.ObjectId;
  paidAt?: Date;
  declinedAt?: Date;
  expiresAt?: Date;
  
  remindersSent: number;
  lastReminderAt?: Date;
  
  // Custom message from admin
  customMessage?: string;
  
  createdAt: Date;
  updatedAt: Date;
  
  // Virtuals
  isValid: boolean;
  canSendReminder: boolean;
  
  // Methods
  markPaid(): Promise<void>;
  decline(): Promise<void>;
  recordReminderSent(): Promise<void>;
}

// Default invitation expiry in hours
export const DEFAULT_INVITATION_EXPIRY_HOURS = 72;

const TournamentInvitationSchema: Schema = new Schema(
  {
    tournamentId: {
      type: Schema.Types.ObjectId,
      ref: "Tournament",
      required: true,
      index: true,
    },
    playerId: {
      type: Schema.Types.ObjectId,
      ref: "Player",
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    
    status: {
      type: String,
      enum: ['pending', 'paid', 'declined', 'expired'],
      default: 'pending',
      index: true,
    },
    
    invitedAt: {
      type: Date,
      default: Date.now,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    paidAt: {
      type: Date,
    },
    declinedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    
    remindersSent: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastReminderAt: {
      type: Date,
    },
    
    customMessage: {
      type: String,
      maxlength: [500, "Custom message cannot exceed 500 characters"],
    },
  },
  { timestamps: true }
);

// Compound indexes
TournamentInvitationSchema.index({ tournamentId: 1, playerId: 1 }, { unique: true });
TournamentInvitationSchema.index({ tournamentId: 1, status: 1 });
TournamentInvitationSchema.index({ status: 1, expiresAt: 1 }); // For expiry job
TournamentInvitationSchema.index({ email: 1, tournamentId: 1 });

// Virtual to check if invitation is still valid
TournamentInvitationSchema.virtual("isValid").get(function(this: ITournamentInvitation) {
  if (this.status !== 'pending') return false;
  if (this.expiresAt && this.expiresAt < new Date()) return false;
  return true;
});

// Virtual to check if can send reminder
TournamentInvitationSchema.virtual("canSendReminder").get(function(this: ITournamentInvitation) {
  if (this.status !== 'pending') return false;
  if (this.expiresAt && this.expiresAt < new Date()) return false;
  // Don't send more than 3 reminders
  if (this.remindersSent >= 3) return false;
  // Don't send reminders more than once per day
  if (this.lastReminderAt) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (this.lastReminderAt > oneDayAgo) return false;
  }
  return true;
});

// Instance method to mark as paid
TournamentInvitationSchema.methods.markPaid = async function(): Promise<void> {
  this.status = 'paid';
  this.paidAt = new Date();
  await this.save();
};

// Instance method to mark as declined
TournamentInvitationSchema.methods.decline = async function(): Promise<void> {
  this.status = 'declined';
  this.declinedAt = new Date();
  await this.save();
};

// Instance method to record reminder sent
TournamentInvitationSchema.methods.recordReminderSent = async function(): Promise<void> {
  this.remindersSent += 1;
  this.lastReminderAt = new Date();
  await this.save();
};

// Static method to create invitation
TournamentInvitationSchema.statics.createInvitation = async function(
  tournamentId: mongoose.Types.ObjectId,
  playerId: mongoose.Types.ObjectId,
  email: string,
  invitedBy: mongoose.Types.ObjectId,
  expiryHours: number = DEFAULT_INVITATION_EXPIRY_HOURS,
  customMessage?: string
): Promise<ITournamentInvitation> {
  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
  
  const invitation = new this({
    tournamentId,
    playerId,
    email,
    invitedBy,
    expiresAt,
    customMessage,
    invitedAt: new Date(),
    status: 'pending',
  });
  
  return invitation.save();
};

// Static method to expire stale invitations
TournamentInvitationSchema.statics.expireStaleInvitations = async function(): Promise<number> {
  const result = await this.updateMany(
    { status: 'pending', expiresAt: { $lt: new Date() } },
    { status: 'expired' }
  );
  return result.modifiedCount;
};

// Static method to get pending invitations for a tournament
TournamentInvitationSchema.statics.getPendingForTournament = async function(
  tournamentId: mongoose.Types.ObjectId
): Promise<ITournamentInvitation[]> {
  return this.find({ tournamentId, status: 'pending' })
    .populate('playerId', 'firstName lastName')
    .sort({ invitedAt: -1 });
};

// Static method to get all invitations for a tournament
TournamentInvitationSchema.statics.getForTournament = async function(
  tournamentId: mongoose.Types.ObjectId
): Promise<ITournamentInvitation[]> {
  return this.find({ tournamentId })
    .populate('playerId', 'firstName lastName')
    .sort({ invitedAt: -1 });
};

// Static method to get invitations needing reminders
TournamentInvitationSchema.statics.getInvitationsNeedingReminders = async function(
  hoursBeforeExpiry: number = 24
): Promise<ITournamentInvitation[]> {
  const reminderThreshold = new Date(Date.now() + hoursBeforeExpiry * 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  return this.find({
    status: 'pending',
    expiresAt: { $lt: reminderThreshold, $gt: new Date() },
    remindersSent: { $lt: 3 },
    $or: [
      { lastReminderAt: { $exists: false } },
      { lastReminderAt: { $lt: oneDayAgo } },
    ],
  }).populate('playerId', 'firstName lastName')
    .populate('tournamentId', 'bodNumber date location format');
};

// Static method to check if player is invited to tournament
TournamentInvitationSchema.statics.isPlayerInvited = async function(
  tournamentId: mongoose.Types.ObjectId,
  playerId: mongoose.Types.ObjectId
): Promise<boolean> {
  const invitation = await this.findOne({
    tournamentId,
    playerId,
    status: { $in: ['pending', 'paid'] },
  });
  return !!invitation;
};

// Ensure virtuals are included in JSON
TournamentInvitationSchema.set('toJSON', { virtuals: true });
TournamentInvitationSchema.set('toObject', { virtuals: true });

export interface ITournamentInvitationModel extends mongoose.Model<ITournamentInvitation> {
  createInvitation(
    tournamentId: mongoose.Types.ObjectId,
    playerId: mongoose.Types.ObjectId,
    email: string,
    invitedBy: mongoose.Types.ObjectId,
    expiryHours?: number,
    customMessage?: string
  ): Promise<ITournamentInvitation>;
  expireStaleInvitations(): Promise<number>;
  getPendingForTournament(tournamentId: mongoose.Types.ObjectId): Promise<ITournamentInvitation[]>;
  getForTournament(tournamentId: mongoose.Types.ObjectId): Promise<ITournamentInvitation[]>;
  getInvitationsNeedingReminders(hoursBeforeExpiry?: number): Promise<ITournamentInvitation[]>;
  isPlayerInvited(tournamentId: mongoose.Types.ObjectId, playerId: mongoose.Types.ObjectId): Promise<boolean>;
}

export default mongoose.model<ITournamentInvitation, ITournamentInvitationModel>(
  "TournamentInvitation",
  TournamentInvitationSchema
);
