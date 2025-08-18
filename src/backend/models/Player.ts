import { Schema, model } from 'mongoose';
import { IPlayer } from '../types/player';
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

// Player-specific calculations
const calculatePlayerStats = (player: IPlayer): void => {
  // Calculate winning percentage if games played > 0
  if (player.gamesPlayed > 0) {
    player.winningPercentage = player.gamesWon / player.gamesPlayed;
  }

  // Calculate total championships
  player.totalChampionships = 
    (player.individualChampionships || 0) + 
    (player.divisionChampionships || 0);

  // Ensure best result is not better than average finish
  if (player.bestResult && player.avgFinish && player.bestResult > player.avgFinish) {
    player.avgFinish = player.bestResult;
  }
};

const playerSchema = new Schema<IPlayer>(
  {
    name: {
      type: String,
      required: [true, ErrorMessages.REQUIRED],
      trim: true,
      validate: createStringValidator(2, 100),
    },
    bodsPlayed: {
      type: Number,
      default: 0,
      min: [0, 'BODs played cannot be negative'],
      validate: createNumericValidator(0),
    },
    bestResult: {
      type: Number,
      default: 0,
      min: [0, 'Best result cannot be negative'],
      validate: createNumericValidator(0),
    },
    avgFinish: {
      type: Number,
      default: 0,
      min: [0, 'Average finish cannot be negative'],
      validate: createNumericValidator(0),
    },
    gamesPlayed: {
      type: Number,
      default: 0,
      min: [0, 'Games played cannot be negative'],
      validate: createNumericValidator(0),
    },
    gamesWon: {
      type: Number,
      default: 0,
      min: [0, 'Games won cannot be negative'],
      validate: createNumericValidator(0),
    },
    winningPercentage: {
      type: Number,
      default: 0,
      min: [0, 'Winning percentage cannot be negative'],
      max: [1, 'Winning percentage cannot exceed 1'],
      validate: createPercentageValidator(),
    },
    individualChampionships: {
      type: Number,
      default: 0,
      min: [0, 'Individual championships cannot be negative'],
      validate: createNumericValidator(0),
    },
    divisionChampionships: {
      type: Number,
      default: 0,
      min: [0, 'Division championships cannot be negative'],
      validate: createNumericValidator(0),
    },
    totalChampionships: {
      type: Number,
      default: 0,
      min: [0, 'Total championships cannot be negative'],
      validate: createNumericValidator(0),
    },
    drawingSequence: {
      type: Number,
      sparse: true,
      min: [1, 'Drawing sequence must be positive'],
      validate: createNumericValidator(1),
    },
    pairing: {
      type: String,
      trim: true,
      validate: createStringValidator(1, 100),
    },
  },
  baseSchemaOptions
);

// Custom validation for games won vs games played
playerSchema.path('gamesWon').validate(function (gamesWon: number) {
  return gamesWon <= this.gamesPlayed;
}, 'Games won cannot exceed games played');

// Custom validation for best result vs average finish
// Note: In tournament scoring, lower numbers are better (1st place is better than 2nd place)
playerSchema.path('bestResult').validate(function (bestResult: number) {
  if (!this.avgFinish || this.avgFinish === 0) return true;
  return bestResult >= this.avgFinish;
}, 'Best result cannot be better than average finish');

// Virtual for games lost
playerSchema.virtual('gamesLost').get(function (this: IPlayer) {
  return this.gamesPlayed - this.gamesWon;
});

// Virtual for championship ratio
playerSchema.virtual('championshipRatio').get(function (this: IPlayer) {
  return this.bodsPlayed > 0 ? this.totalChampionships / this.bodsPlayed : 0;
});

// Add methods and statics
playerSchema.methods = { ...baseMethods };
playerSchema.statics = { ...baseStatics };

// Pre-save middleware
playerSchema.pre('save', createPreSaveMiddleware(calculatePlayerStats));
playerSchema.pre('findOneAndUpdate', function () {
  this.setOptions({ runValidators: true });
});

// Create indexes
createIndexes(playerSchema, [
  { fields: { name: 1 }, options: { unique: true } },
  { fields: { winningPercentage: -1 } },
  { fields: { totalChampionships: -1 } },
  { fields: { bodsPlayed: -1 } },
  { fields: { createdAt: -1 } },
]);

// Text index for search
playerSchema.index({ name: 'text' });

export interface IPlayerModel extends BaseModelStatics<IPlayer> {}

export const Player = model<IPlayer, IPlayerModel>('Player', playerSchema);
export default Player;