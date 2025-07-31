import { Schema, model } from 'mongoose';
import { ITournament } from '../types/tournament';
import { TournamentFormats, TournamentStatuses } from '../types/tournament';
import { ErrorMessages } from '../types/common';
import {
  BaseModelStatics,
  baseSchemaOptions,
  baseMethods,
  baseStatics,
  createNumericValidator,
  createStringValidator,
  createPreSaveMiddleware,
  createIndexes,
} from './base';

// Tournament-specific calculations
const calculateTournamentStats = (tournament: ITournament): void => {
  // Ensure date is properly formatted
  if (tournament.date && typeof tournament.date === 'string') {
    tournament.date = new Date(tournament.date);
  }

  // BOD number should be provided and sequential (1, 2, 3, etc.)
  // No auto-generation needed

  // Normalize format
  if (tournament.format) {
    tournament.format = tournament.format.trim();
  }

  // Normalize location
  if (tournament.location) {
    tournament.location = tournament.location.trim();
  }
};

const tournamentSchema = new Schema<ITournament>(
  {
    date: {
      type: Date,
      required: [true, ErrorMessages.REQUIRED],
      validate: {
        validator: (date: Date) => {
          const minDate = new Date('2009-01-01');
          const maxDate = new Date();
          maxDate.setFullYear(maxDate.getFullYear() + 10);
          return date >= minDate && date <= maxDate;
        },
        message: 'Date must be between 2009 and 10 years in the future',
      },
    },
    bodNumber: {
      type: Number,
      required: [true, ErrorMessages.REQUIRED],
      min: [1, 'BOD number must be a positive integer starting from 1'],
      validate: createNumericValidator(1),
    },
    format: {
      type: String,
      required: [true, ErrorMessages.REQUIRED],
      enum: {
        values: TournamentFormats,
        message: `Format must be one of: ${TournamentFormats.join(', ')}`,
      },
    },
    location: {
      type: String,
      required: [true, ErrorMessages.REQUIRED],
      trim: true,
      validate: createStringValidator(2, 100),
    },
    advancementCriteria: {
      type: String,
      required: [true, ErrorMessages.REQUIRED],
      trim: true,
      validate: createStringValidator(5, 500),
    },
    notes: {
      type: String,
      trim: true,
      validate: createStringValidator(1, 1000),
    },
    photoAlbums: {
      type: String,
      trim: true,
      validate: {
        validator: (value: string) => {
          if (!value) return true;
          // Basic URL validation
          const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
          return urlRegex.test(value);
        },
        message: 'Photo albums must be a valid URL',
      },
    },
    status: {
      type: String,
      enum: {
        values: TournamentStatuses,
        message: `Status must be one of: ${TournamentStatuses.join(', ')}`,
      },
      default: 'scheduled',
    },
    players: [{
      type: Schema.Types.ObjectId,
      ref: 'Player',
    }],
    maxPlayers: {
      type: Number,
      min: [2, 'Tournament must allow at least 2 players'],
      max: [64, 'Tournament cannot exceed 64 players'],
      validate: {
        validator: function(value: number) {
          if (!value) return true;
          // Must be a power of 2 for bracket tournaments
          return Number.isInteger(Math.log2(value));
        },
        message: 'Maximum players must be a power of 2 (2, 4, 8, 16, 32, 64)',
      },
    },
    champion: {
      playerId: {
        type: Schema.Types.ObjectId,
        ref: 'Player',
      },
      playerName: String,
      tournamentResult: {
        type: Schema.Types.ObjectId,
        ref: 'TournamentResult',
      },
    },
  },
  baseSchemaOptions
);

// Custom validation for BOD number format - supports both sequential (1, 2, 3...) and legacy YYYYMM format
tournamentSchema.path('bodNumber').validate(function (bodNumber: number) {
  // Sequential format: positive integers starting from 1
  if (bodNumber >= 1 && bodNumber <= 999999) {
    return Number.isInteger(bodNumber);
  }
  
  // Legacy YYYYMM format validation (for backwards compatibility)
  const bodStr = bodNumber.toString();
  if (bodStr.length === 6) {
    const year = parseInt(bodStr.substring(0, 4));
    const month = parseInt(bodStr.substring(4, 6));
    return year >= 2009 && month >= 1 && month <= 12;
  }
  
  return false;
}, 'BOD number must be a positive integer or legacy YYYYMM format');

// Validation for players array
tournamentSchema.path('players').validate(function(this: any, players: any[]) {
  if (!players || !this.maxPlayers) return true;
  return players.length <= this.maxPlayers;
}, 'Tournament exceeds maximum player limit');

// Validation for status transitions
tournamentSchema.path('status').validate(function(this: any, newStatus: string) {
  if (this.isNew) return true; // Allow any status for new tournaments
  
  const currentStatus = (this as any)._original?.status;
  if (!currentStatus) return true;
  
  // Define valid status transitions
  const validTransitions: Record<string, string[]> = {
    'scheduled': ['open', 'cancelled'],
    'open': ['active', 'cancelled', 'scheduled'],
    'active': ['completed', 'cancelled'],
    'completed': [], // Completed tournaments cannot change status
    'cancelled': ['scheduled', 'open'], // Can be rescheduled
  };
  
  return validTransitions[currentStatus]?.includes(newStatus) ?? false;
}, 'Invalid status transition');

// Remove strict date/BOD number consistency validation since we now support sequential numbering
// tournamentSchema.path('date').validate(function (date: Date) {
//   if (!this.bodNumber) return true;
//   
//   const bodStr = this.bodNumber.toString();
//   const bodYear = parseInt(bodStr.substring(0, 4));
//   const bodMonth = parseInt(bodStr.substring(4, 6));
//   
//   return date.getFullYear() === bodYear && (date.getMonth() + 1) === bodMonth;
// }, 'Date must match BOD number year and month');

// Virtual for formatted date
tournamentSchema.virtual('formattedDate').get(function (this: ITournament) {
  return this.date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
});

// Virtual for year
tournamentSchema.virtual('year').get(function (this: ITournament) {
  return this.date.getFullYear();
});

// Virtual for month
tournamentSchema.virtual('month').get(function (this: ITournament) {
  return this.date.getMonth() + 1;
});

// Virtual for season (approximation)
tournamentSchema.virtual('season').get(function (this: ITournament) {
  const month = this.date.getMonth() + 1;
  if (month >= 3 && month <= 5) return 'Spring';
  if (month >= 6 && month <= 8) return 'Summer';
  if (month >= 9 && month <= 11) return 'Fall';
  return 'Winter';
});

// Virtual for current player count
tournamentSchema.virtual('currentPlayerCount').get(function (this: ITournament) {
  return this.players?.length || 0;
});

// Virtual for checking if tournament is full
tournamentSchema.virtual('isFull').get(function (this: ITournament) {
  if (!this.maxPlayers) return false;
  return (this.players?.length || 0) >= this.maxPlayers;
});

// Virtual for checking if tournament can start
tournamentSchema.virtual('canStart').get(function (this: ITournament) {
  const playerCount = this.players?.length || 0;
  return this.status === 'open' && playerCount >= 2 && playerCount <= (this.maxPlayers || 64);
});

// Add methods and statics
tournamentSchema.methods = { ...baseMethods };
tournamentSchema.statics = { ...baseStatics };

// Pre-save middleware
tournamentSchema.pre('save', createPreSaveMiddleware(calculateTournamentStats));

// Middleware to track original status for validation
tournamentSchema.pre('save', function(this: any) {
  if (!this.isNew && this.isModified('status')) {
    (this as any)._original = (this as any)._original || {};
    (this as any)._original.status = this.get('status', null, { getters: false });
  }
});

tournamentSchema.pre('findOneAndUpdate', function () {
  this.setOptions({ runValidators: true });
});

// Create indexes
createIndexes(tournamentSchema, [
  { fields: { bodNumber: 1 }, options: { unique: true } },
  { fields: { date: -1 } },
  { fields: { format: 1 } },
  { fields: { location: 1 } },
  { fields: { status: 1 } },
  { fields: { date: -1, format: 1 } },
  { fields: { status: 1, date: -1 } },
  { fields: { createdAt: -1 } },
  { fields: { 'champion.playerId': 1 } },
]);

// Text index for search
tournamentSchema.index({ 
  location: 'text', 
  notes: 'text', 
  advancementCriteria: 'text' 
});

export interface ITournamentModel extends BaseModelStatics<ITournament> {}

export const Tournament = model<ITournament, ITournamentModel>('Tournament', tournamentSchema);
export default Tournament;