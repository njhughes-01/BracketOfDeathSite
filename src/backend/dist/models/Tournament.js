"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tournament = void 0;
const mongoose_1 = require("mongoose");
const tournament_1 = require("../types/tournament");
const common_1 = require("../types/common");
const base_1 = require("./base");
// Tournament-specific calculations
const calculateTournamentStats = (tournament) => {
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
const tournamentSchema = new mongoose_1.Schema({
    date: {
        type: Date,
        required: [true, common_1.ErrorMessages.REQUIRED],
        validate: {
            validator: (date) => {
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
        required: [true, common_1.ErrorMessages.REQUIRED],
        min: [1, 'BOD number must be a positive integer starting from 1'],
        validate: (0, base_1.createNumericValidator)(1),
    },
    format: {
        type: String,
        required: [true, common_1.ErrorMessages.REQUIRED],
        enum: {
            values: tournament_1.TournamentFormats,
            message: `Format must be one of: ${tournament_1.TournamentFormats.join(', ')}`,
        },
    },
    location: {
        type: String,
        required: [true, common_1.ErrorMessages.REQUIRED],
        trim: true,
        validate: (0, base_1.createStringValidator)(2, 100),
    },
    advancementCriteria: {
        type: String,
        required: [true, common_1.ErrorMessages.REQUIRED],
        trim: true,
        validate: (0, base_1.createStringValidator)(5, 500),
    },
    notes: {
        type: String,
        trim: true,
        validate: {
            validator: function (value) {
                // Allow empty strings or null/undefined, but validate length if provided
                if (!value || value.trim() === '')
                    return true;
                return value.length >= 1 && value.length <= 1000;
            },
            message: 'Notes must be between 1 and 1000 characters when provided'
        },
    },
    photoAlbums: {
        type: String,
        trim: true,
        validate: {
            validator: (value) => {
                if (!value || value.trim() === '')
                    return true;
                // Basic URL validation
                const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
                return urlRegex.test(value);
            },
            message: 'Photo albums must be a valid URL when provided',
        },
    },
    status: {
        type: String,
        enum: {
            values: tournament_1.TournamentStatuses,
            message: `Status must be one of: ${tournament_1.TournamentStatuses.join(', ')}`,
        },
        default: 'scheduled',
    },
    players: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Player',
        }],
    maxPlayers: {
        type: Number,
        min: [2, 'Tournament must allow at least 2 players'],
        max: [64, 'Tournament cannot exceed 64 players'],
        validate: {
            validator: function (value) {
                if (!value)
                    return true;
                // Must be a power of 2 for bracket tournaments
                return Number.isInteger(Math.log2(value));
            },
            message: 'Maximum players must be a power of 2 (2, 4, 8, 16, 32, 64)',
        },
    },
    champion: {
        playerId: {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Player',
        },
        playerName: String,
        tournamentResult: {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'TournamentResult',
        },
    },
    // Tournament setup configuration
    seedingConfig: {
        method: {
            type: String,
            enum: ['historical', 'recent_form', 'elo', 'manual'],
        },
        parameters: {
            recentTournamentCount: Number,
            championshipWeight: Number,
            winPercentageWeight: Number,
            avgFinishWeight: Number,
        },
    },
    teamFormationConfig: {
        method: {
            type: String,
            enum: ['preformed', 'draft', 'statistical_pairing', 'random', 'manual'],
        },
        parameters: {
            skillBalancing: Boolean,
            avoidRecentPartners: Boolean,
            maxTimesPartnered: Number,
        },
    },
    bracketType: {
        type: String,
        enum: ['single_elimination', 'double_elimination', 'round_robin_playoff'],
    },
    registrationDeadline: {
        type: Date,
    },
    // Generated tournament data
    generatedSeeds: [{
            playerId: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'Player',
            },
            playerName: String,
            seed: Number,
            statistics: {
                avgFinish: Number,
                winningPercentage: Number,
                totalChampionships: Number,
                bodsPlayed: Number,
                recentForm: Number,
            },
        }],
    generatedTeams: [{
            teamId: String,
            players: [{
                    playerId: {
                        type: mongoose_1.Schema.Types.ObjectId,
                        ref: 'Player',
                    },
                    playerName: String,
                    seed: Number,
                    statistics: {
                        avgFinish: Number,
                        winningPercentage: Number,
                        totalChampionships: Number,
                        bodsPlayed: Number,
                        recentForm: Number,
                    },
                }],
            combinedSeed: Number,
            teamName: String,
            combinedStatistics: {
                avgFinish: Number,
                combinedWinPercentage: Number,
                totalChampionships: Number,
                combinedBodsPlayed: Number,
            },
        }],
    // Live management state (admin-selected)
    managementState: {
        currentRound: {
            type: String,
            required: false,
            trim: true,
        }
    }
}, base_1.baseSchemaOptions);
// Custom validation for BOD number format - supports both sequential (1, 2, 3...) and legacy YYYYMM format
tournamentSchema.path('bodNumber').validate(function (bodNumber) {
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
tournamentSchema.path('players').validate(function (players) {
    if (!players || !this.maxPlayers)
        return true;
    return players.length <= this.maxPlayers;
}, 'Tournament exceeds maximum player limit');
// Validation for status transitions
tournamentSchema.path('status').validate(function (newStatus) {
    if (this.isNew)
        return true; // Allow any status for new tournaments
    const currentStatus = this._original?.status;
    if (!currentStatus)
        return true;
    // Define valid status transitions
    const validTransitions = {
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
tournamentSchema.virtual('formattedDate').get(function () {
    return this.date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
});
// Virtual for year
tournamentSchema.virtual('year').get(function () {
    return this.date.getFullYear();
});
// Virtual for month
tournamentSchema.virtual('month').get(function () {
    return this.date.getMonth() + 1;
});
// Virtual for season (approximation)
tournamentSchema.virtual('season').get(function () {
    const month = this.date.getMonth() + 1;
    if (month >= 3 && month <= 5)
        return 'Spring';
    if (month >= 6 && month <= 8)
        return 'Summer';
    if (month >= 9 && month <= 11)
        return 'Fall';
    return 'Winter';
});
// Virtual for current player count
tournamentSchema.virtual('currentPlayerCount').get(function () {
    return this.players?.length || 0;
});
// Virtual for checking if tournament is full
tournamentSchema.virtual('isFull').get(function () {
    if (!this.maxPlayers)
        return false;
    return (this.players?.length || 0) >= this.maxPlayers;
});
// Virtual for checking if tournament can start
tournamentSchema.virtual('canStart').get(function () {
    const playerCount = this.players?.length || 0;
    return this.status === 'open' && playerCount >= 2 && playerCount <= (this.maxPlayers || 64);
});
// Add methods and statics
tournamentSchema.methods = { ...base_1.baseMethods };
tournamentSchema.statics = { ...base_1.baseStatics };
// Pre-save middleware
tournamentSchema.pre('save', (0, base_1.createPreSaveMiddleware)(calculateTournamentStats));
// Middleware to track original status for validation
tournamentSchema.pre('save', function () {
    if (!this.isNew && this.isModified('status')) {
        this._original = this._original || {};
        this._original.status = this.get('status', null, { getters: false });
    }
});
tournamentSchema.pre('findOneAndUpdate', function () {
    this.setOptions({ runValidators: true });
});
// Create indexes
(0, base_1.createIndexes)(tournamentSchema, [
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
exports.Tournament = (0, mongoose_1.model)('Tournament', tournamentSchema);
exports.default = exports.Tournament;
//# sourceMappingURL=Tournament.js.map