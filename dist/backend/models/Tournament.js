"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tournament = void 0;
const mongoose_1 = require("mongoose");
const tournament_1 = require("../types/tournament");
const common_1 = require("../types/common");
const base_1 = require("./base");
const calculateTournamentStats = (tournament) => {
    if (tournament.date && typeof tournament.date === 'string') {
        tournament.date = new Date(tournament.date);
    }
    if (tournament.registrationOpensAt && typeof tournament.registrationOpensAt === 'string') {
        tournament.registrationOpensAt = new Date(tournament.registrationOpensAt);
    }
    if (tournament.registrationDeadline && typeof tournament.registrationDeadline === 'string') {
        tournament.registrationDeadline = new Date(tournament.registrationDeadline);
    }
    if (tournament.format) {
        tournament.format = tournament.format.trim();
    }
    if (tournament.location) {
        tournament.location = tournament.location.trim();
    }
    if (tournament.allowSelfRegistration === undefined) {
        tournament.allowSelfRegistration = tournament.registrationType === 'open';
    }
    if (!tournament.bracketType) {
        tournament.bracketType = 'round_robin_playoff';
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
    managementState: {
        currentRound: {
            type: String,
            required: false,
            trim: true,
        }
    }
}, base_1.baseSchemaOptions);
tournamentSchema.path('bodNumber').validate(function (bodNumber) {
    if (bodNumber >= 1 && bodNumber <= 999999) {
        return Number.isInteger(bodNumber);
    }
    const bodStr = bodNumber.toString();
    if (bodStr.length === 6) {
        const year = parseInt(bodStr.substring(0, 4));
        const month = parseInt(bodStr.substring(4, 6));
        return year >= 2009 && month >= 1 && month <= 12;
    }
    return false;
}, 'BOD number must be a positive integer or legacy YYYYMM format');
tournamentSchema.path('players').validate(function (players) {
    if (!players || !this.maxPlayers)
        return true;
    return players.length <= this.maxPlayers;
}, 'Tournament exceeds maximum player limit');
tournamentSchema.path('status').validate(function (newStatus) {
    if (this.isNew)
        return true;
    const currentStatus = this._original?.status;
    if (!currentStatus)
        return true;
    const validTransitions = {
        'scheduled': ['open', 'cancelled'],
        'open': ['active', 'cancelled', 'scheduled'],
        'active': ['completed', 'cancelled'],
        'completed': [],
        'cancelled': ['scheduled', 'open'],
    };
    return validTransitions[currentStatus]?.includes(newStatus) ?? false;
}, 'Invalid status transition');
tournamentSchema.virtual('formattedDate').get(function () {
    return this.date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
});
tournamentSchema.virtual('year').get(function () {
    return this.date.getFullYear();
});
tournamentSchema.virtual('month').get(function () {
    return this.date.getMonth() + 1;
});
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
tournamentSchema.virtual('currentPlayerCount').get(function () {
    return this.players?.length || 0;
});
tournamentSchema.virtual('isFull').get(function () {
    if (!this.maxPlayers)
        return false;
    return (this.players?.length || 0) >= this.maxPlayers;
});
tournamentSchema.virtual('canStart').get(function () {
    const playerCount = this.players?.length || 0;
    return this.status === 'open' && playerCount >= 2 && playerCount <= (this.maxPlayers || 64);
});
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
tournamentSchema.virtual('registeredPlayerCount').get(function () {
    return this.registeredPlayers?.length || 0;
});
tournamentSchema.virtual('waitlistCount').get(function () {
    return this.waitlistPlayers?.length || 0;
});
tournamentSchema.virtual('isRegistrationOpen').get(function () {
    return this.registrationStatus === 'open';
});
tournamentSchema.methods = { ...base_1.baseMethods };
tournamentSchema.statics = { ...base_1.baseStatics };
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
tournamentSchema.pre('save', (0, base_1.createPreSaveMiddleware)(calculateTournamentStats));
tournamentSchema.pre('save', function () {
    if (!this.isNew && this.isModified('status')) {
        this._original = this._original || {};
        this._original.status = this.get('status', null, { getters: false });
    }
});
tournamentSchema.pre('findOneAndUpdate', function () {
    this.setOptions({ runValidators: true });
});
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
tournamentSchema.index({
    location: 'text',
    notes: 'text',
    advancementCriteria: 'text'
});
exports.Tournament = (0, mongoose_1.model)('Tournament', tournamentSchema);
exports.default = exports.Tournament;
//# sourceMappingURL=Tournament.js.map