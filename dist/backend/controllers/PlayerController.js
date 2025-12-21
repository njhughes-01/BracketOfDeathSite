"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.playerController = exports.PlayerController = void 0;
const Player_1 = require("../models/Player");
const base_1 = require("./base");
class PlayerController extends base_1.BaseController {
    constructor() {
        super(Player_1.Player, 'Player');
    }
    buildFilter(query) {
        const filter = {};
        const { page, limit, sort, select, populate, q, ...filterParams } = query;
        if (filterParams.name) {
            filter.name = new RegExp(filterParams.name, 'i');
        }
        const numericFields = ['bodsPlayed', 'bestResult', 'avgFinish', 'winningPercentage', 'totalChampionships', 'gamesPlayed', 'gamesWon'];
        numericFields.forEach(field => {
            const value = filterParams[field];
            const minValue = filterParams[`${field}_min`];
            const maxValue = filterParams[`${field}_max`];
            if (value !== undefined) {
                filter[field] = parseFloat(value);
            }
            else if (minValue !== undefined || maxValue !== undefined) {
                filter[field] = {};
                if (minValue !== undefined) {
                    filter[field].$gte = parseFloat(minValue);
                }
                if (maxValue !== undefined) {
                    filter[field].$lte = parseFloat(maxValue);
                }
            }
        });
        if (filterParams.division) {
            filter.division = new RegExp(filterParams.division, 'i');
        }
        if (filterParams.city) {
            filter.city = new RegExp(filterParams.city, 'i');
        }
        if (filterParams.state) {
            filter.state = new RegExp(filterParams.state, 'i');
        }
        return filter;
    }
    buildSearchFilter(searchTerm) {
        return {
            $or: [
                { name: new RegExp(searchTerm, 'i') },
                { pairing: new RegExp(searchTerm, 'i') },
            ],
        };
    }
    getStats = this.asyncHandler(async (_req, res, next) => {
        try {
            const stats = await Player_1.Player.aggregate([
                {
                    $group: {
                        _id: null,
                        totalPlayers: { $sum: 1 },
                        avgWinningPercentage: { $avg: '$winningPercentage' },
                        avgBodsPlayed: { $avg: '$bodsPlayed' },
                        totalChampionships: { $sum: '$totalChampionships' },
                        maxWinningPercentage: { $max: '$winningPercentage' },
                        minWinningPercentage: { $min: '$winningPercentage' },
                    },
                },
            ]);
            const topPlayers = await Player_1.Player.find({})
                .sort({ winningPercentage: -1, totalChampionships: -1 })
                .limit(10)
                .select('name winningPercentage totalChampionships bodsPlayed');
            const response = {
                success: true,
                data: {
                    overview: stats[0] || {},
                    topPlayers,
                },
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    });
    getScoringSummary = this.asyncHandler(async (req, res, next) => {
        try {
            const { id } = req.params;
            const summary = await this.model.db.model('Match').aggregate([
                {
                    $match: {
                        $or: [
                            { 'team1.playerScores.playerId': new (require('mongoose').Types.ObjectId)(id) },
                            { 'team2.playerScores.playerId': new (require('mongoose').Types.ObjectId)(id) }
                        ]
                    }
                },
                {
                    $project: {
                        _id: 1,
                        tournamentId: 1,
                        round: 1,
                        status: 1,
                        team1: 1,
                        team2: 1,
                        scores: {
                            $concatArrays: [
                                { $ifNull: ['$team1.playerScores', []] },
                                { $ifNull: ['$team2.playerScores', []] }
                            ]
                        }
                    }
                },
                { $unwind: '$scores' },
                { $match: { 'scores.playerId': new (require('mongoose').Types.ObjectId)(id) } },
                {
                    $group: {
                        _id: '$scores.playerId',
                        matchesWithPoints: { $sum: 1 },
                        totalPoints: { $sum: { $ifNull: ['$scores.score', 0] } },
                    }
                }
            ]);
            const data = summary[0] || { matchesWithPoints: 0, totalPoints: 0 };
            const response = {
                success: true,
                data,
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    });
    getChampions = this.asyncHandler(async (req, res, next) => {
        try {
            const minChampionships = parseInt(req.query.min) || 1;
            const champions = await Player_1.Player.find({
                totalChampionships: { $gte: minChampionships }
            })
                .sort({ totalChampionships: -1, winningPercentage: -1 })
                .select('name totalChampionships individualChampionships divisionChampionships winningPercentage bodsPlayed');
            const response = {
                success: true,
                data: champions,
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    });
    getPerformanceTrends = this.asyncHandler(async (req, res, next) => {
        try {
            const { id } = req.params;
            const player = await Player_1.Player.findById(id);
            if (!player) {
                this.sendError(res, 404, 'Player not found');
                return;
            }
            const performanceData = {
                currentWinningPercentage: player.winningPercentage,
                championshipRatio: player.bodsPlayed > 0 ? player.totalChampionships / player.bodsPlayed : 0,
                gamesPerBod: player.bodsPlayed > 0 ? player.gamesPlayed / player.bodsPlayed : 0,
                consistencyScore: this.calculateConsistencyScore(player),
            };
            const response = {
                success: true,
                data: performanceData,
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    });
    updateStats = this.asyncHandler(async (req, res, next) => {
        try {
            const { id } = req.params;
            const statsUpdate = req.body;
            const requiredStats = ['gamesPlayed', 'gamesWon'];
            const missing = this.validateRequired(requiredStats, statsUpdate);
            if (missing.length > 0) {
                this.sendError(res, 400, `Missing required fields: ${missing.join(', ')}`);
                return;
            }
            if (statsUpdate.gamesWon > statsUpdate.gamesPlayed) {
                this.sendError(res, 400, 'Games won cannot exceed games played');
                return;
            }
            const updatedPlayer = await Player_1.Player.findByIdAndUpdateSafe(id, statsUpdate);
            if (!updatedPlayer) {
                this.sendError(res, 404, 'Player not found');
                return;
            }
            this.sendSuccess(res, updatedPlayer, 'Player statistics updated successfully');
        }
        catch (error) {
            next(error);
        }
    });
    bulkImport = this.asyncHandler(async (req, res, next) => {
        try {
            const { players } = req.body;
            if (!Array.isArray(players) || players.length === 0) {
                this.sendError(res, 400, 'Players array is required');
                return;
            }
            const results = {
                created: 0,
                updated: 0,
                errors: [],
            };
            for (const playerData of players) {
                try {
                    const existingPlayer = await Player_1.Player.findOne({ name: playerData.name });
                    if (existingPlayer) {
                        await Player_1.Player.findByIdAndUpdateSafe(existingPlayer._id.toString(), playerData);
                        results.updated++;
                    }
                    else {
                        await Player_1.Player.create(playerData);
                        results.created++;
                    }
                }
                catch (error) {
                    results.errors.push({
                        name: playerData.name || 'Unknown',
                        error: error.message,
                    });
                }
            }
            const response = {
                success: true,
                data: results,
                message: `Bulk import completed: ${results.created} created, ${results.updated} updated, ${results.errors.length} errors`,
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    });
    calculateConsistencyScore(player) {
        if (!player.bestResult || !player.avgFinish || player.avgFinish === 0) {
            return 0;
        }
        const ratio = player.bestResult / player.avgFinish;
        return Math.max(0, Math.min(1, 1 - (ratio - 1)));
    }
    validatePlayerData(data) {
        const errors = [];
        if (data.gamesWon && data.gamesPlayed && data.gamesWon > data.gamesPlayed) {
            errors.push('Games won cannot exceed games played');
        }
        if (data.winningPercentage && (data.winningPercentage < 0 || data.winningPercentage > 1)) {
            errors.push('Winning percentage must be between 0 and 1');
        }
        if (data.bestResult && data.avgFinish && data.bestResult > data.avgFinish) {
            errors.push('Best result cannot be worse than average finish');
        }
        return errors;
    }
    async create(req, res, next) {
        try {
            const validationErrors = this.validatePlayerData(req.body);
            if (validationErrors.length > 0) {
                this.sendError(res, 400, validationErrors.join(', '));
                return;
            }
            await super.create(req, res, next);
        }
        catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            const validationErrors = this.validatePlayerData(req.body);
            if (validationErrors.length > 0) {
                this.sendError(res, 400, validationErrors.join(', '));
                return;
            }
            await super.update(req, res, next);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.PlayerController = PlayerController;
exports.playerController = new PlayerController();
//# sourceMappingURL=PlayerController.js.map