import { Schema, model } from "mongoose";
import { IMatch } from "../types/match";
import { MatchRounds, MatchStatuses } from "../types/match";
import { ErrorMessages } from "../types/common";
import {
  BaseModelStatics,
  baseSchemaOptions,
  baseMethods,
  baseStatics,
  createNumericValidator,
  createStringValidator,
  createPreSaveMiddleware,
  createIndexes,
} from "./base";
import { validateTennisScore } from "../utils/tennisValidation";

// Match-specific calculations
const calculateMatchStats = (match: IMatch): void => {
  // Ensure dates are properly formatted
  if (match.scheduledDate && typeof match.scheduledDate === "string") {
    match.scheduledDate = new Date(match.scheduledDate);
  }
  if (match.completedDate && typeof match.completedDate === "string") {
    match.completedDate = new Date(match.completedDate);
  }

  // Auto-determine winner based on scores
  if (match.team1.score !== undefined && match.team2.score !== undefined) {
    if (match.team1.score > match.team2.score) {
      match.winner = "team1";
    } else if (match.team2.score > match.team1.score) {
      match.winner = "team2";
    }
  }

  // Auto-set completion date and status
  if (match.winner && match.status === "in-progress") {
    match.status = "completed";
    match.completedDate = match.completedDate || new Date();
  }
};

const matchTeamSchema = new Schema(
  {
    players: [
      {
        type: Schema.Types.ObjectId,
        ref: "Player",
        required: true,
      },
    ],
    playerNames: [
      {
        type: String,
        required: true,
        trim: true,
      },
    ],
    score: {
      type: Number,
      min: [0, "Score cannot be negative"],
      max: [99, "Score cannot exceed 99"],
      default: 0,
    },
    seed: {
      type: Number,
      min: [1, "Seed must be positive"],
      max: [64, "Seed cannot exceed 64"],
    },
    // Individual player scores for detailed tracking
    playerScores: [
      {
        playerId: {
          type: Schema.Types.ObjectId,
          ref: "Player",
          required: false,
        },
        playerName: {
          type: String,
          required: false,
          trim: true,
        },
        score: {
          type: Number,
          min: [0, "Individual score cannot be negative"],
          max: [99, "Individual score cannot exceed 99"],
          default: 0,
        },
      },
    ],
  },
  { _id: false },
);

const matchSchema = new Schema<IMatch>(
  {
    tournamentId: {
      type: Schema.Types.ObjectId,
      ref: "Tournament",
      required: [true, ErrorMessages.REQUIRED],
    },
    matchNumber: {
      type: Number,
      required: [true, ErrorMessages.REQUIRED],
      min: [1, "Match number must be positive"],
      validate: createNumericValidator(1),
    },
    round: {
      type: String,
      required: [true, ErrorMessages.REQUIRED],
      enum: {
        values: MatchRounds,
        message: `Round must be one of: ${MatchRounds.join(", ")}`,
      },
    },
    roundNumber: {
      type: Number,
      required: [true, ErrorMessages.REQUIRED],
      min: [1, "Round number must be positive"],
      max: [50, "Round number cannot exceed 50"],
    },
    team1: {
      type: matchTeamSchema,
      required: [true, ErrorMessages.REQUIRED],
    },
    team2: {
      type: matchTeamSchema,
      required: [true, ErrorMessages.REQUIRED],
    },
    winner: {
      type: String,
      enum: ["team1", "team2"],
    },
    status: {
      type: String,
      enum: {
        values: MatchStatuses,
        message: `Status must be one of: ${MatchStatuses.join(", ")}`,
      },
      default: "scheduled",
    },
    scheduledDate: {
      type: Date,
    },
    completedDate: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
      validate: createStringValidator(1, 500),
    },
    adminOverride: {
      type: {
        reason: {
          type: String,
          trim: true,
          required: true,
        },
        authorizedBy: {
          type: String,
          trim: true,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
      required: false,
    },
  },
  baseSchemaOptions,
);

// Validation for team player arrays
matchSchema.path("team1.players").validate(function (players: any[]) {
  return players && players.length >= 1 && players.length <= 2;
}, "Team must have 1 or 2 players");

matchSchema.path("team2.players").validate(function (players: any[]) {
  return players && players.length >= 1 && players.length <= 2;
}, "Team must have 1 or 2 players");

// Validation for matching player array lengths
matchSchema.pre("validate", function () {
  if (this.team1.players.length !== this.team1.playerNames.length) {
    this.invalidate(
      "team1.playerNames",
      "Player names must match player count",
    );
  }
  if (this.team2.players.length !== this.team2.playerNames.length) {
    this.invalidate(
      "team2.playerNames",
      "Player names must match player count",
    );
  }
});

// Compound index for tournament matches
matchSchema.index({ tournamentId: 1, matchNumber: 1 }, { unique: true });

// Validation for completed matches
matchSchema.path("status").validate(function (status: string) {
  if (status === "completed") {
    if (this.winner === undefined) {
      return false;
    }

    // Validate tennis score or require admin override
    const team1Score = this.team1?.score || 0;
    const team2Score = this.team2?.score || 0;
    const scoreValidation = validateTennisScore(team1Score, team2Score);

    // If score is invalid and no admin override, reject
    if (!scoreValidation.isValid && !this.adminOverride) {
      this.invalidate(
        "status",
        `Invalid tennis score (${team1Score}-${team2Score}). ${scoreValidation.reason}. Admin override required for non-standard scores.`,
      );
      return false;
    }

    return true;
  }
  return true;
}, "Completed matches must have a winner and valid tennis score");

// Validation for winner selection
matchSchema.path("winner").validate(function (winner: string) {
  if (!winner) return true;

  const team1Score = this.team1?.score || 0;
  const team2Score = this.team2?.score || 0;

  if (team1Score === team2Score) {
    return false; // Ties not allowed
  }

  if (winner === "team1") {
    return team1Score > team2Score;
  } else if (winner === "team2") {
    return team2Score > team1Score;
  }

  return false;
}, "Winner must be the team with the higher score");

// Virtual for match description
matchSchema.virtual("description").get(function (this: IMatch) {
  const team1Names = this.team1.playerNames.join(" & ");
  const team2Names = this.team2.playerNames.join(" & ");
  return `${team1Names} vs ${team2Names}`;
});

// Virtual for score summary
matchSchema.virtual("scoreDisplay").get(function (this: IMatch) {
  if (this.status === "completed") {
    return `${this.team1.score}-${this.team2.score}`;
  }
  return "Not completed";
});

// Virtual for winning team names
matchSchema.virtual("winnerNames").get(function (this: IMatch) {
  if (!this.winner) return null;

  const winningTeam = this.winner === "team1" ? this.team1 : this.team2;
  return winningTeam.playerNames.join(" & ");
});

// Add methods and statics
matchSchema.methods = { ...baseMethods };
matchSchema.statics = { ...baseStatics };

// Pre-save middleware
matchSchema.pre("save", createPreSaveMiddleware(calculateMatchStats));
matchSchema.pre("findOneAndUpdate", function () {
  this.setOptions({ runValidators: true });
});

// Create indexes
createIndexes(matchSchema, [
  { fields: { tournamentId: 1, round: 1 } },
  { fields: { tournamentId: 1, status: 1 } },
  { fields: { tournamentId: 1, roundNumber: 1 } },
  { fields: { status: 1, scheduledDate: 1 } },
  { fields: { "team1.players": 1 } },
  { fields: { "team2.players": 1 } },
  { fields: { completedDate: -1 } },
  { fields: { "team1.playerScores.playerId": 1 } },
  { fields: { "team2.playerScores.playerId": 1 } },
]);

export interface IMatchModel extends BaseModelStatics<IMatch> {}

export const Match = model<IMatch, IMatchModel>("Match", matchSchema);
export default Match;
