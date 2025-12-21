"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Match = void 0;
const mongoose_1 = require("mongoose");
const match_1 = require("../types/match");
const common_1 = require("../types/common");
const base_1 = require("./base");
const tennisValidation_1 = require("../utils/tennisValidation");
const calculateMatchStats = (match) => {
    if (match.scheduledDate && typeof match.scheduledDate === 'string') {
        match.scheduledDate = new Date(match.scheduledDate);
    }
    if (match.completedDate && typeof match.completedDate === 'string') {
        match.completedDate = new Date(match.completedDate);
    }
    if (match.team1.score !== undefined && match.team2.score !== undefined) {
        if (match.team1.score > match.team2.score) {
            match.winner = 'team1';
        }
        else if (match.team2.score > match.team1.score) {
            match.winner = 'team2';
        }
    }
    if (match.winner && match.status === 'in-progress') {
        match.status = 'completed';
        match.completedDate = match.completedDate || new Date();
    }
};
const matchTeamSchema = new mongoose_1.Schema({
    players: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Player',
            required: true,
        }],
    playerNames: [{
            type: String,
            required: true,
            trim: true,
        }],
    score: {
        type: Number,
        min: [0, 'Score cannot be negative'],
        max: [99, 'Score cannot exceed 99'],
        default: 0,
    },
    seed: {
        type: Number,
        min: [1, 'Seed must be positive'],
        max: [64, 'Seed cannot exceed 64'],
    },
    playerScores: [{
            playerId: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'Player',
                required: false,
            },
            playerName: {
                type: String,
                required: false,
                trim: true,
            },
            score: {
                type: Number,
                min: [0, 'Individual score cannot be negative'],
                max: [99, 'Individual score cannot exceed 99'],
                default: 0,
            },
        }],
}, { _id: false });
const matchSchema = new mongoose_1.Schema({
    tournamentId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Tournament',
        required: [true, common_1.ErrorMessages.REQUIRED],
    },
    matchNumber: {
        type: Number,
        required: [true, common_1.ErrorMessages.REQUIRED],
        min: [1, 'Match number must be positive'],
        validate: (0, base_1.createNumericValidator)(1),
    },
    round: {
        type: String,
        required: [true, common_1.ErrorMessages.REQUIRED],
        enum: {
            values: match_1.MatchRounds,
            message: `Round must be one of: ${match_1.MatchRounds.join(', ')}`,
        },
    },
    roundNumber: {
        type: Number,
        required: [true, common_1.ErrorMessages.REQUIRED],
        min: [1, 'Round number must be positive'],
        max: [50, 'Round number cannot exceed 50'],
    },
    team1: {
        type: matchTeamSchema,
        required: [true, common_1.ErrorMessages.REQUIRED],
    },
    team2: {
        type: matchTeamSchema,
        required: [true, common_1.ErrorMessages.REQUIRED],
    },
    winner: {
        type: String,
        enum: ['team1', 'team2'],
    },
    status: {
        type: String,
        enum: {
            values: match_1.MatchStatuses,
            message: `Status must be one of: ${match_1.MatchStatuses.join(', ')}`,
        },
        default: 'scheduled',
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
        validate: (0, base_1.createStringValidator)(1, 500),
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
}, base_1.baseSchemaOptions);
matchSchema.path('team1.players').validate(function (players) {
    return players && players.length >= 1 && players.length <= 2;
}, 'Team must have 1 or 2 players');
matchSchema.path('team2.players').validate(function (players) {
    return players && players.length >= 1 && players.length <= 2;
}, 'Team must have 1 or 2 players');
matchSchema.pre('validate', function () {
    if (this.team1.players.length !== this.team1.playerNames.length) {
        this.invalidate('team1.playerNames', 'Player names must match player count');
    }
    if (this.team2.players.length !== this.team2.playerNames.length) {
        this.invalidate('team2.playerNames', 'Player names must match player count');
    }
});
matchSchema.index({ tournamentId: 1, matchNumber: 1 }, { unique: true });
matchSchema.path('status').validate(function (status) {
    if (status === 'completed') {
        if (this.winner === undefined) {
            return false;
        }
        const team1Score = this.team1?.score || 0;
        const team2Score = this.team2?.score || 0;
        const scoreValidation = (0, tennisValidation_1.validateTennisScore)(team1Score, team2Score);
        if (!scoreValidation.isValid && !this.adminOverride) {
            this.invalidate('status', `Invalid tennis score (${team1Score}-${team2Score}). ${scoreValidation.reason}. Admin override required for non-standard scores.`);
            return false;
        }
        return true;
    }
    return true;
}, 'Completed matches must have a winner and valid tennis score');
matchSchema.path('winner').validate(function (winner) {
    if (!winner)
        return true;
    const team1Score = this.team1?.score || 0;
    const team2Score = this.team2?.score || 0;
    if (team1Score === team2Score) {
        return false;
    }
    if (winner === 'team1') {
        return team1Score > team2Score;
    }
    else if (winner === 'team2') {
        return team2Score > team1Score;
    }
    return false;
}, 'Winner must be the team with the higher score');
matchSchema.virtual('description').get(function () {
    const team1Names = this.team1.playerNames.join(' & ');
    const team2Names = this.team2.playerNames.join(' & ');
    return `${team1Names} vs ${team2Names}`;
});
matchSchema.virtual('scoreDisplay').get(function () {
    if (this.status === 'completed') {
        return `${this.team1.score}-${this.team2.score}`;
    }
    return 'Not completed';
});
matchSchema.virtual('winnerNames').get(function () {
    if (!this.winner)
        return null;
    const winningTeam = this.winner === 'team1' ? this.team1 : this.team2;
    return winningTeam.playerNames.join(' & ');
});
matchSchema.methods = { ...base_1.baseMethods };
matchSchema.statics = { ...base_1.baseStatics };
matchSchema.pre('save', (0, base_1.createPreSaveMiddleware)(calculateMatchStats));
matchSchema.pre('findOneAndUpdate', function () {
    this.setOptions({ runValidators: true });
});
(0, base_1.createIndexes)(matchSchema, [
    { fields: { tournamentId: 1, round: 1 } },
    { fields: { tournamentId: 1, status: 1 } },
    { fields: { tournamentId: 1, roundNumber: 1 } },
    { fields: { status: 1, scheduledDate: 1 } },
    { fields: { 'team1.players': 1 } },
    { fields: { 'team2.players': 1 } },
    { fields: { completedDate: -1 } },
    { fields: { 'team1.playerScores.playerId': 1 } },
    { fields: { 'team2.playerScores.playerId': 1 } },
]);
exports.Match = (0, mongoose_1.model)('Match', matchSchema);
exports.default = exports.Match;
//# sourceMappingURL=Match.js.map