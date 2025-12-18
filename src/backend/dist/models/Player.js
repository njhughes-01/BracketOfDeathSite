"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Player = void 0;
const mongoose_1 = require("mongoose");
const common_1 = require("../types/common");
const base_1 = require("./base");
// Player-specific calculations
const calculatePlayerStats = (player) => {
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
const playerSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, common_1.ErrorMessages.REQUIRED],
        trim: true,
        validate: (0, base_1.createStringValidator)(2, 100),
    },
    bodsPlayed: {
        type: Number,
        default: 0,
        min: [0, 'BODs played cannot be negative'],
        validate: (0, base_1.createNumericValidator)(0),
    },
    bestResult: {
        type: Number,
        default: 0,
        min: [0, 'Best result cannot be negative'],
        validate: (0, base_1.createNumericValidator)(0),
    },
    avgFinish: {
        type: Number,
        default: 0,
        min: [0, 'Average finish cannot be negative'],
        validate: (0, base_1.createNumericValidator)(0),
    },
    gamesPlayed: {
        type: Number,
        default: 0,
        min: [0, 'Games played cannot be negative'],
        validate: (0, base_1.createNumericValidator)(0),
    },
    gamesWon: {
        type: Number,
        default: 0,
        min: [0, 'Games won cannot be negative'],
        validate: (0, base_1.createNumericValidator)(0),
    },
    winningPercentage: {
        type: Number,
        default: 0,
        min: [0, 'Winning percentage cannot be negative'],
        max: [1, 'Winning percentage cannot exceed 1'],
        validate: (0, base_1.createPercentageValidator)(),
    },
    individualChampionships: {
        type: Number,
        default: 0,
        min: [0, 'Individual championships cannot be negative'],
        validate: (0, base_1.createNumericValidator)(0),
    },
    divisionChampionships: {
        type: Number,
        default: 0,
        min: [0, 'Division championships cannot be negative'],
        validate: (0, base_1.createNumericValidator)(0),
    },
    totalChampionships: {
        type: Number,
        default: 0,
        min: [0, 'Total championships cannot be negative'],
        validate: (0, base_1.createNumericValidator)(0),
    },
    drawingSequence: {
        type: Number,
        sparse: true,
        min: [1, 'Drawing sequence must be positive'],
        validate: (0, base_1.createNumericValidator)(1),
    },
    pairing: {
        type: String,
        trim: true,
        validate: (0, base_1.createStringValidator)(1, 100),
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other'],
        trim: true,
    },
    bracketPreference: {
        type: String,
        enum: ['mens', 'womens', 'mixed'],
        trim: true,
    },
}, base_1.baseSchemaOptions);
// Custom validation for games won vs games played
playerSchema.path('gamesWon').validate(function (gamesWon) {
    return gamesWon <= this.gamesPlayed;
}, 'Games won cannot exceed games played');
// Custom validation for best result vs average finish
// Note: In tournament scoring, lower numbers are better (1st place is better than 2nd place)
playerSchema.path('bestResult').validate(function (bestResult) {
    if (!this.avgFinish || this.avgFinish === 0)
        return true;
    return bestResult >= this.avgFinish;
}, 'Best result cannot be better than average finish');
// Virtual for games lost
playerSchema.virtual('gamesLost').get(function () {
    return this.gamesPlayed - this.gamesWon;
});
// Virtual for championship ratio
playerSchema.virtual('championshipRatio').get(function () {
    return this.bodsPlayed > 0 ? this.totalChampionships / this.bodsPlayed : 0;
});
// Add methods and statics
playerSchema.methods = { ...base_1.baseMethods };
playerSchema.statics = { ...base_1.baseStatics };
// Pre-save middleware
playerSchema.pre('save', (0, base_1.createPreSaveMiddleware)(calculatePlayerStats));
playerSchema.pre('findOneAndUpdate', function () {
    this.setOptions({ runValidators: true });
});
// Create indexes
(0, base_1.createIndexes)(playerSchema, [
    { fields: { name: 1 }, options: { unique: true } },
    { fields: { winningPercentage: -1 } },
    { fields: { totalChampionships: -1 } },
    { fields: { bodsPlayed: -1 } },
    { fields: { createdAt: -1 } },
]);
// Text index for search
playerSchema.index({ name: 'text' });
exports.Player = (0, mongoose_1.model)('Player', playerSchema);
exports.default = exports.Player;
//# sourceMappingURL=Player.js.map