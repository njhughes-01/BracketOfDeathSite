import { Schema, model, Types } from 'mongoose';
import { ITournamentResult, IRoundRobinScores, IBracketScores, ITotalStats } from '../types/tournamentResult';
import { ErrorMessages } from '../types/common';
import {
  BaseModelStatics,
  baseSchemaOptions,
  baseMethods,
  baseStatics,
  createNumericValidator,
  createPercentageValidator,
  createStringValidator,
  createPreSaveMiddleware,
  createIndexes,
} from './base';

// Sub-schema for Round Robin Scores
const roundRobinScoresSchema = new Schema<IRoundRobinScores>({
  round1: {
    type: Number,
    min: [0, 'Round 1 score cannot be negative'],
    validate: createNumericValidator(0),
  },
  round2: {
    type: Number,
    min: [0, 'Round 2 score cannot be negative'],
    validate: createNumericValidator(0),
  },
  round3: {
    type: Number,
    min: [0, 'Round 3 score cannot be negative'],
    validate: createNumericValidator(0),
  },
  rrWon: {
    type: Number,
    min: [0, 'Round robin games won cannot be negative'],
    validate: createNumericValidator(0),
  },
  rrLost: {
    type: Number,
    min: [0, 'Round robin games lost cannot be negative'],
    validate: createNumericValidator(0),
  },
  rrPlayed: {
    type: Number,
    min: [0, 'Round robin games played cannot be negative'],
    validate: createNumericValidator(0),
  },
  rrWinPercentage: {
    type: Number,
    min: [0, 'Round robin win percentage cannot be negative'],
    max: [1, 'Round robin win percentage cannot exceed 1'],
    validate: createPercentageValidator(),
  },
  rrRank: {
    type: Number,
    min: [0, 'Round robin rank cannot be negative'],
    validate: createNumericValidator(0),
  },
}, { _id: false });

// Sub-schema for Bracket Scores
const bracketScoresSchema = new Schema<IBracketScores>({
  r16Won: {
    type: Number,
    min: [0, 'Round of 16 games won cannot be negative'],
    validate: createNumericValidator(0),
  },
  r16Lost: {
    type: Number,
    min: [0, 'Round of 16 games lost cannot be negative'],
    validate: createNumericValidator(0),
  },
  qfWon: {
    type: Number,
    min: [0, 'Quarterfinal games won cannot be negative'],
    validate: createNumericValidator(0),
  },
  qfLost: {
    type: Number,
    min: [0, 'Quarterfinal games lost cannot be negative'],
    validate: createNumericValidator(0),
  },
  sfWon: {
    type: Number,
    min: [0, 'Semifinal games won cannot be negative'],
    validate: createNumericValidator(0),
  },
  sfLost: {
    type: Number,
    min: [0, 'Semifinal games lost cannot be negative'],
    validate: createNumericValidator(0),
  },
  finalsWon: {
    type: Number,
    min: [0, 'Finals games won cannot be negative'],
    validate: createNumericValidator(0),
  },
  finalsLost: {
    type: Number,
    min: [0, 'Finals games lost cannot be negative'],
    validate: createNumericValidator(0),
  },
  bracketWon: {
    type: Number,
    min: [0, 'Total bracket games won cannot be negative'],
    validate: createNumericValidator(0),
  },
  bracketLost: {
    type: Number,
    min: [0, 'Total bracket games lost cannot be negative'],
    validate: createNumericValidator(0),
  },
  bracketPlayed: {
    type: Number,
    min: [0, 'Total bracket games played cannot be negative'],
    validate: createNumericValidator(0),
  },
}, { _id: false });

// Sub-schema for Total Stats
const totalStatsSchema = new Schema<ITotalStats>({
  totalWon: {
    type: Number,
    required: [true, ErrorMessages.REQUIRED],
    min: [0, 'Total games won cannot be negative'],
    validate: [
      createNumericValidator(0),
      {
        validator: function (this: any, v: number) {
          return v <= this.totalPlayed;
        },
        message: 'Total games won cannot exceed total games played'
      }
    ]
  },
  totalLost: {
    type: Number,
    required: [true, ErrorMessages.REQUIRED],
    min: [0, 'Total games lost cannot be negative'],
    validate: [
      createNumericValidator(0),
      {
        validator: function (this: any, v: number) {
          return v <= this.totalPlayed;
        },
        message: 'Total games lost cannot exceed total games played'
      }
    ]
  },
  totalPlayed: {
    type: Number,
    required: [true, ErrorMessages.REQUIRED],
    min: [0, 'Total games played cannot be negative'],
    validate: [
      createNumericValidator(0),
      {
        validator: function (this: any, v: number) {
          return v === (this.totalWon + this.totalLost);
        },
        message: 'Total games played must equal total won plus total lost'
      }
    ]
  },
  winPercentage: {
    type: Number,
    required: [true, ErrorMessages.REQUIRED],
    min: [0, 'Win percentage cannot be negative'],
    max: [1, 'Win percentage cannot exceed 1'],
    validate: createPercentageValidator(),
  },
  finalRank: {
    type: Number,
    min: [1, 'Final rank must be positive'],
    validate: createNumericValidator(1),
  },
  bodFinish: {
    type: Number,
    min: [1, 'BOD finish must be positive'],
    validate: createNumericValidator(1),
  },
  home: {
    type: Boolean,
    default: false,
  },
}, { _id: false });

// Tournament Result calculations
const calculateTournamentResultStats = (result: ITournamentResult): void => {
  // Calculate total stats from round robin and bracket scores
  let totalWon = 0;
  let totalLost = 0;
  let totalPlayed = 0;

  // Add round robin stats
  if (result.roundRobinScores) {
    const rr = result.roundRobinScores;
    if (rr.rrWon) totalWon += rr.rrWon;
    if (rr.rrLost) totalLost += rr.rrLost;
    if (rr.rrPlayed) totalPlayed += rr.rrPlayed;

    // Calculate round robin win percentage
    if (rr.rrPlayed && rr.rrPlayed > 0) {
      rr.rrWinPercentage = (rr.rrWon || 0) / rr.rrPlayed;
    }

    // Ensure round robin totals are consistent
    if (rr.rrWon && rr.rrLost && !rr.rrPlayed) {
      rr.rrPlayed = rr.rrWon + rr.rrLost;
    }
  }

  // Add bracket stats
  if (result.bracketScores) {
    const br = result.bracketScores;
    if (br.bracketWon) totalWon += br.bracketWon;
    if (br.bracketLost) totalLost += br.bracketLost;
    if (br.bracketPlayed) totalPlayed += br.bracketPlayed;

    // Calculate bracket totals from individual rounds
    let calculatedWon = 0;
    let calculatedLost = 0;

    if (br.r16Won) calculatedWon += br.r16Won;
    if (br.r16Lost) calculatedLost += br.r16Lost;
    if (br.qfWon) calculatedWon += br.qfWon;
    if (br.qfLost) calculatedLost += br.qfLost;
    if (br.sfWon) calculatedWon += br.sfWon;
    if (br.sfLost) calculatedLost += br.sfLost;
    if (br.finalsWon) calculatedWon += br.finalsWon;
    if (br.finalsLost) calculatedLost += br.finalsLost;

    // Update bracket totals if not provided
    if (!br.bracketWon && calculatedWon > 0) br.bracketWon = calculatedWon;
    if (!br.bracketLost && calculatedLost > 0) br.bracketLost = calculatedLost;
    if (!br.bracketPlayed && (calculatedWon > 0 || calculatedLost > 0)) {
      br.bracketPlayed = calculatedWon + calculatedLost;
    }
  }

  // Update total stats
  if (!result.totalStats.totalWon || result.totalStats.totalWon !== totalWon) {
    result.totalStats.totalWon = totalWon;
  }
  if (!result.totalStats.totalLost || result.totalStats.totalLost !== totalLost) {
    result.totalStats.totalLost = totalLost;
  }
  if (!result.totalStats.totalPlayed || result.totalStats.totalPlayed !== totalPlayed) {
    result.totalStats.totalPlayed = totalPlayed;
  }

  // Calculate win percentage
  if (result.totalStats.totalPlayed > 0) {
    result.totalStats.winPercentage = result.totalStats.totalWon / result.totalStats.totalPlayed;
  }
};

const tournamentResultSchema = new Schema<ITournamentResult>(
  {
    tournamentId: {
      type: Schema.Types.ObjectId,
      ref: 'Tournament',
      required: [true, ErrorMessages.REQUIRED],
    },
    players: [{
      type: Schema.Types.ObjectId,
      ref: 'Player',
      required: [true, ErrorMessages.REQUIRED],
    }],
    division: {
      type: String,
      trim: true,
      validate: createStringValidator(1, 50),
    },
    seed: {
      type: Number,
      min: [1, 'Seed must be positive'],
      validate: createNumericValidator(1),
    },
    roundRobinScores: roundRobinScoresSchema,
    bracketScores: bracketScoresSchema,
    totalStats: {
      type: totalStatsSchema,
      required: [true, ErrorMessages.REQUIRED],
    },
  },
  baseSchemaOptions
);

// Custom validations
tournamentResultSchema.path('players').validate(function (players: Types.ObjectId[]) {
  return players && players.length >= 1 && players.length <= 2;
}, 'A team must have 1 or 2 players');



// Virtual for team name
tournamentResultSchema.virtual('teamName').get(function (this: ITournamentResult) {
  if (!this.populated('players')) return 'Team';
  const players = this.players as any[];
  return players.map((p: any) => p.name || p.toString()).join(' & ');
});

// Virtual for performance grade
tournamentResultSchema.virtual('performanceGrade').get(function (this: ITournamentResult) {
  const winPct = this.totalStats.winPercentage;
  if (winPct >= 0.8) return 'A';
  if (winPct >= 0.7) return 'B';
  if (winPct >= 0.6) return 'C';
  if (winPct >= 0.5) return 'D';
  return 'F';
});

// Add methods and statics
tournamentResultSchema.methods = { ...baseMethods };
tournamentResultSchema.statics = { ...baseStatics };

// Pre-save middleware
tournamentResultSchema.pre('save', createPreSaveMiddleware(calculateTournamentResultStats));
tournamentResultSchema.pre('findOneAndUpdate', function () {
  this.setOptions({ runValidators: true });
});

// Create indexes
createIndexes(tournamentResultSchema, [
  { fields: { tournamentId: 1, players: 1 }, options: { unique: true } },
  { fields: { tournamentId: 1 } },
  { fields: { players: 1 } },
  { fields: { 'totalStats.winPercentage': -1 } },
  { fields: { 'totalStats.finalRank': 1 } },
  { fields: { 'totalStats.bodFinish': 1 } },
  { fields: { division: 1 } },
  { fields: { seed: 1 } },
  { fields: { createdAt: -1 } },
]);

export interface ITournamentResultModel extends BaseModelStatics<ITournamentResult> { }

export const TournamentResult = model<ITournamentResult, ITournamentResultModel>('TournamentResult', tournamentResultSchema);
export default TournamentResult;