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
    // Format registration dates
    if (tournament.registrationOpensAt && typeof tournament.registrationOpensAt === 'string') {
        tournament.registrationOpensAt = new Date(tournament.registrationOpensAt);
    }
    if (tournament.registrationDeadline && typeof tournament.registrationDeadline === 'string') {
        tournament.registrationDeadline = new Date(tournament.registrationDeadline);
    }
    // BOD number will be auto-generated in pre-save hook if not provided
    // Normalize format
    if (tournament.format) {
        tournament.format = tournament.format.trim();
    }
    // Normalize location
    if (tournament.location) {
        tournament.location = tournament.location.trim();
    }
    // Set default registration behavior
    if (tournament.allowSelfRegistration === undefined) {
        tournament.allowSelfRegistration = tournament.registrationType === 'open';
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
        validate: (0, base_1.createStringValidator)(1, 1000),
    },
    photoAlbums: {
        type: String,
        trim: true,
        validate: {
            validator: (value) => {
                if (!value)
                    return true;
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
    registrationType: {
        type: String,
        required: [true, common_1.ErrorMessages.REQUIRED],
        enum: {
            values: tournament_1.RegistrationTypes,
            message: `Registration type must be one of: ${tournament_1.RegistrationTypes.join(', ')}`,
        },
        default: 'open',
    },
    registrationOpensAt: {
        type: Date,
        validate: {
            validator: function (date) {
                if (!date)
                    return true;
                return date <= this.date;
            },
            message: 'Registration must open before tournament date',
        },
    },
    registrationDeadline: {
        type: Date,
        validate: {
            validator: function (date) {
                if (!date)
                    return true;
                const now = new Date();
                const tournamentDate = this.date;
                return date >= now && date <= tournamentDate;
            },
            message: 'Registration deadline must be between now and tournament date',
        },
    },
    allowSelfRegistration: {
        type: Boolean,
        default: function () {
            return this.registrationType === 'open';
        },
    },
    registeredPlayers: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Player',
        }],
    waitlistPlayers: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Player',
        }],
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
// Virtual for registration status
tournamentSchema.virtual('registrationStatus').get(function () {
    const now = new Date();
    const registrationOpen = this.registrationOpensAt || new Date(0);
    const registrationDeadline = this.registrationDeadline || this.date;
    if (now < registrationOpen)
        return 'pending';
    if (now > registrationDeadline)
        return 'closed';
    if (this.isFull)
        return 'full';
    return 'open';
});
// Virtual for registered player count
tournamentSchema.virtual('registeredPlayerCount').get(function () {
    return this.registeredPlayers?.length || 0;
});
// Virtual for waitlist count
tournamentSchema.virtual('waitlistCount').get(function () {
    return this.waitlistPlayers?.length || 0;
});
// Virtual for checking if registration is open
tournamentSchema.virtual('isRegistrationOpen').get(function () {
    return this.registrationStatus === 'open';
});
// Add methods and statics
tournamentSchema.methods = { ...base_1.baseMethods };
tournamentSchema.statics = { ...base_1.baseStatics };
// Auto-generate BOD number if not provided
tournamentSchema.pre('save', async function () {
    if (this.isNew && !this.bodNumber) {
        try {
            const lastTournament = await exports.Tournament.findOne().sort({ bodNumber: -1 }).exec();
            this.bodNumber = lastTournament ? lastTournament.bodNumber + 1 : 1;
        }
        catch (error) {
            throw new Error('Failed to generate BOD number');
        }
    }
});
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
    { fields: { registrationType: 1 } },
    { fields: { registrationDeadline: -1 } },
    { fields: { allowSelfRegistration: 1 } },
    { fields: { date: -1, format: 1 } },
    { fields: { status: 1, date: -1 } },
    { fields: { registrationType: 1, status: 1 } },
    { fields: { registrationDeadline: 1, status: 1 } },
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