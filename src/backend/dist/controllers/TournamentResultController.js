"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TournamentResultController = void 0;
const mongoose_1 = require("mongoose");
const sanitization_1 = require("../utils/sanitization");
const TournamentResult_1 = require("../models/TournamentResult");
const Tournament_1 = require("../models/Tournament");
const Player_1 = require("../models/Player");
const base_1 = require("./base");
class TournamentResultController extends base_1.BaseCrudController {
    constructor() {
        super(TournamentResult_1.TournamentResult, "TournamentResult");
    }
    // Override buildFilter for tournament result-specific filtering
    buildFilter = (query) => {
        const filter = {};
        const { page, limit, sort, select, populate, q, year, ...filterParams } = query;
        // Tournament ID filtering
        if (filterParams.tournamentId) {
            filter.tournamentId = new mongoose_1.Types.ObjectId(filterParams.tournamentId);
        }
        // Player filtering
        if (filterParams.playerId) {
            filter.players = { $in: [new mongoose_1.Types.ObjectId(filterParams.playerId)] };
        }
        if (filterParams.playerIds) {
            const playerIds = Array.isArray(filterParams.playerIds)
                ? filterParams.playerIds
                : filterParams.playerIds.split(",");
            filter.players = {
                $in: playerIds.map((id) => new mongoose_1.Types.ObjectId(id)),
            };
        }
        // Division filtering
        if (filterParams.division) {
            filter.division = new RegExp(filterParams.division, "i");
        }
        // Seed filtering
        if (filterParams.seed) {
            filter.seed = parseInt(filterParams.seed);
        }
        else if (filterParams.seed_min || filterParams.seed_max) {
            filter.seed = {};
            if (filterParams.seed_min) {
                filter.seed.$gte = parseInt(filterParams.seed_min);
            }
            if (filterParams.seed_max) {
                filter.seed.$lte = parseInt(filterParams.seed_max);
            }
        }
        // Final rank filtering
        if (filterParams.finalRank) {
            filter["totalStats.finalRank"] = parseInt(filterParams.finalRank);
        }
        else if (filterParams.finalRank_min || filterParams.finalRank_max) {
            filter["totalStats.finalRank"] = {};
            if (filterParams.finalRank_min) {
                filter["totalStats.finalRank"].$gte = parseInt(filterParams.finalRank_min);
            }
            if (filterParams.finalRank_max) {
                filter["totalStats.finalRank"].$lte = parseInt(filterParams.finalRank_max);
            }
        }
        // BOD finish filtering
        if (filterParams.bodFinish) {
            filter["totalStats.bodFinish"] = parseInt(filterParams.bodFinish);
        }
        else if (filterParams.bodFinish_min || filterParams.bodFinish_max) {
            filter["totalStats.bodFinish"] = {};
            if (filterParams.bodFinish_min) {
                filter["totalStats.bodFinish"].$gte = parseInt(filterParams.bodFinish_min);
            }
            if (filterParams.bodFinish_max) {
                filter["totalStats.bodFinish"].$lte = parseInt(filterParams.bodFinish_max);
            }
        }
        // Win percentage filtering
        if (filterParams.winPercentage_min || filterParams.winPercentage_max) {
            filter["totalStats.winPercentage"] = {};
            if (filterParams.winPercentage_min) {
                filter["totalStats.winPercentage"].$gte = parseFloat(filterParams.winPercentage_min);
            }
            if (filterParams.winPercentage_max) {
                filter["totalStats.winPercentage"].$lte = parseFloat(filterParams.winPercentage_max);
            }
        }
        return filter;
    };
    // Override getAll to include default population
    getAll = this.asyncHandler(async (req, res) => {
        const options = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 10,
            sort: req.query.sort || "-tournament.date",
            select: req.query.select,
        };
        const filter = this.buildFilter(req.query);
        const year = req.query.year;
        // Use aggregation for better performance with populated data
        const pipeline = [
            { $match: filter },
            {
                $lookup: {
                    from: "players",
                    localField: "players",
                    foreignField: "_id",
                    as: "playerDetails",
                },
            },
            {
                $lookup: {
                    from: "tournaments",
                    localField: "tournamentId",
                    foreignField: "_id",
                    as: "tournamentDetails",
                },
            },
            {
                $addFields: {
                    tournament: { $arrayElemAt: ["$tournamentDetails", 0] },
                    teamName: {
                        $reduce: {
                            input: "$playerDetails",
                            initialValue: "",
                            in: {
                                $cond: {
                                    if: { $eq: ["$$value", ""] },
                                    then: "$$this.name",
                                    else: { $concat: ["$$value", " & ", "$$this.name"] },
                                },
                            },
                        },
                    },
                },
            },
        ];
        // Add year filtering after lookup if specified
        if (year) {
            const yearInt = parseInt(year);
            pipeline.push({
                $match: {
                    "tournament.date": {
                        $gte: new Date(`${yearInt}-01-01`),
                        $lte: new Date(`${yearInt}-12-31`),
                    },
                },
            });
        }
        pipeline.push({
            $project: {
                tournamentDetails: 0,
                playerDetails: 0,
            },
        }, { $sort: this.parseSortString(options.sort) }, { $skip: (options.page - 1) * options.limit }, { $limit: options.limit });
        // Create count pipeline for accurate total with year filtering
        const countPipeline = [
            { $match: filter },
            {
                $lookup: {
                    from: "tournaments",
                    localField: "tournamentId",
                    foreignField: "_id",
                    as: "tournament",
                },
            },
            {
                $addFields: {
                    tournament: { $arrayElemAt: ["$tournament", 0] },
                },
            },
        ];
        if (year) {
            const yearInt = parseInt(year);
            countPipeline.push({
                $match: {
                    "tournament.date": {
                        $gte: new Date(`${yearInt}-01-01`),
                        $lte: new Date(`${yearInt}-12-31`),
                    },
                },
            });
        }
        countPipeline.push({ $count: "total" });
        const [results, totalResult] = await Promise.all([
            TournamentResult_1.TournamentResult.aggregate(pipeline),
            TournamentResult_1.TournamentResult.aggregate(countPipeline),
        ]);
        const total = totalResult.length > 0 ? totalResult[0].total : 0;
        const pages = Math.ceil(total / options.limit);
        this.sendSuccess(res, results, undefined, {
            current: options.page,
            pages,
            count: results.length,
            total,
        });
    });
    // Get results by tournament
    getByTournament = this.asyncHandler(async (req, res) => {
        const { tournamentId } = req.params;
        const tournament = await Tournament_1.Tournament.findById(tournamentId);
        if (!tournament) {
            this.sendNotFound(res, "Tournament");
            return;
        }
        const results = await TournamentResult_1.TournamentResult.find({ tournamentId })
            .populate("players", "name")
            .sort({ "totalStats.finalRank": 1, "totalStats.winPercentage": -1 });
        this.sendSuccess(res, {
            tournament,
            results,
            resultCount: results.length,
        });
    });
    // Get results by player
    getByPlayer = this.asyncHandler(async (req, res) => {
        const { playerId } = req.params;
        const player = await Player_1.Player.findById(playerId);
        if (!player) {
            this.sendNotFound(res, "Player");
            return;
        }
        const results = await TournamentResult_1.TournamentResult.find({
            players: { $in: [playerId] },
        })
            .populate("tournamentId")
            .populate("players", "name")
            .sort({ "tournament.date": -1 });
        // Calculate player statistics across all tournaments
        const stats = this.calculatePlayerStats(results);
        this.sendSuccess(res, {
            player,
            results,
            stats,
            resultCount: results.length,
        });
    });
    // Get leaderboard/rankings
    getLeaderboard = this.asyncHandler(async (req, res) => {
        const { tournamentId, format, year } = req.query;
        const limit = parseInt(req.query.limit) || 50;
        const sort = req.query.sort || "-points"; // Default sort by points
        const matchStage = {};
        // Filter by tournament
        if (tournamentId) {
            matchStage.tournamentId = new mongoose_1.Types.ObjectId(tournamentId);
        }
        // Build aggregation pipeline
        const pipeline = [
            { $match: matchStage },
            {
                $lookup: {
                    from: "tournaments",
                    localField: "tournamentId",
                    foreignField: "_id",
                    as: "tournament",
                },
            },
            {
                $unwind: "$tournament",
            },
        ];
        // Add format filtering if specified
        if (format) {
            pipeline.push({
                $match: { "tournament.format": format },
            });
        }
        // Add year filtering if specified
        if (year) {
            const { years, ranges } = (0, sanitization_1.parseYearFilter)(year);
            const yearOrConditions = [];
            // Condition 1: Specific years
            if (years.length > 0) {
                years.forEach((y) => {
                    yearOrConditions.push({
                        "tournament.date": {
                            $gte: new Date(`${y}-01-01`),
                            $lte: new Date(`${y}-12-31`),
                        },
                    });
                });
            }
            // Condition 2: Ranges
            if (ranges.length > 0) {
                ranges.forEach((r) => {
                    yearOrConditions.push({
                        "tournament.date": {
                            $gte: new Date(`${r.start}-01-01`),
                            $lte: new Date(`${r.end}-12-31`),
                        },
                    });
                });
            }
            // Only add match stage if we have valid filters
            if (yearOrConditions.length > 0) {
                pipeline.push({
                    $match: {
                        $or: yearOrConditions,
                    },
                });
            }
            else {
                pipeline.push({
                    $match: {
                        _id: null, // Impossible match
                    },
                });
            }
        }
        // Unwind players to rank individuals instead of teams
        pipeline.push({
            $unwind: "$players",
        });
        // Group by individual player and calculate aggregate stats
        pipeline.push({
            $group: {
                _id: "$players",
                totalTournaments: { $sum: 1 },
                totalWins: { $sum: "$totalStats.totalWon" },
                totalLosses: { $sum: "$totalStats.totalLost" },
                totalGames: { $sum: "$totalStats.totalPlayed" },
                avgWinPercentage: { $avg: "$totalStats.winPercentage" },
                bestFinish: { $min: "$totalStats.finalRank" },
                avgFinish: { $avg: "$totalStats.finalRank" },
                totalChampionships: {
                    $sum: {
                        $cond: [{ $eq: ["$totalStats.finalRank", 1] }, 1, 0],
                    },
                },
                totalRunnerUps: {
                    $sum: {
                        $cond: [{ $eq: ["$totalStats.finalRank", 2] }, 1, 0],
                    },
                },
                totalFinalFours: {
                    $sum: {
                        $cond: [{ $in: ["$totalStats.finalRank", [3, 4]] }, 1, 0],
                    },
                },
            },
        }, {
            $lookup: {
                from: "players",
                localField: "_id",
                foreignField: "_id",
                as: "playerDetails",
            },
        }, {
            $addFields: {
                name: { $arrayElemAt: ["$playerDetails.name", 0] },
                winningPercentage: {
                    $cond: [
                        { $gt: ["$totalGames", 0] },
                        { $divide: ["$totalWins", "$totalGames"] },
                        0,
                    ],
                },
                points: {
                    $add: [
                        { $multiply: ["$totalChampionships", 1000] },
                        { $multiply: ["$totalRunnerUps", 500] },
                        { $multiply: ["$totalFinalFours", 250] },
                        { $multiply: ["$totalWins", 10] },
                    ],
                },
            },
        }, {
            $project: {
                playerDetails: 0,
            },
        }, {
            $sort: this.parseSortString(sort),
        }, { $limit: limit });
        const leaderboard = await TournamentResult_1.TournamentResult.aggregate(pipeline);
        this.sendSuccess(res, leaderboard);
    });
    // Get tournament result statistics
    getStats = this.asyncHandler(async (req, res) => {
        const stats = await TournamentResult_1.TournamentResult.aggregate([
            {
                $group: {
                    _id: null,
                    totalResults: { $sum: 1 },
                    avgWinPercentage: { $avg: "$totalStats.winPercentage" },
                    avgGamesPlayed: { $avg: "$totalStats.totalPlayed" },
                    highestWinPercentage: { $max: "$totalStats.winPercentage" },
                    lowestWinPercentage: { $min: "$totalStats.winPercentage" },
                },
            },
        ]);
        const performanceDistribution = await TournamentResult_1.TournamentResult.aggregate([
            {
                $bucket: {
                    groupBy: "$totalStats.winPercentage",
                    boundaries: [0, 0.2, 0.4, 0.6, 0.8, 1.0],
                    default: "Other",
                    output: {
                        count: { $sum: 1 },
                        avgRank: { $avg: "$totalStats.finalRank" },
                    },
                },
            },
        ]);
        this.sendSuccess(res, {
            overview: stats[0] || {},
            performanceDistribution,
        });
    });
    // Bulk import tournament results (for data migration)
    bulkImport = this.asyncHandler(async (req, res) => {
        const { results } = req.body;
        if (!Array.isArray(results) || results.length === 0) {
            this.sendError(res, "Results array is required", 400);
            return;
        }
        const importResults = {
            created: 0,
            updated: 0,
            errors: [],
        };
        for (const resultData of results) {
            try {
                // Validate tournament exists
                const tournament = await Tournament_1.Tournament.findById(resultData.tournamentId);
                if (!tournament) {
                    importResults.errors.push({
                        tournament: resultData.tournamentId,
                        players: resultData.players || [],
                        error: "Tournament not found",
                    });
                    continue;
                }
                // Validate players exist
                const playerIds = Array.isArray(resultData.players)
                    ? resultData.players
                    : [resultData.players];
                const players = await Player_1.Player.find({ _id: { $in: playerIds } });
                if (players.length !== playerIds.length) {
                    importResults.errors.push({
                        tournament: resultData.tournamentId,
                        players: playerIds,
                        error: "One or more players not found",
                    });
                    continue;
                }
                // Check if result already exists
                const existingResult = await TournamentResult_1.TournamentResult.findOne({
                    tournamentId: resultData.tournamentId,
                    players: { $all: playerIds },
                });
                if (existingResult) {
                    await TournamentResult_1.TournamentResult.findByIdAndUpdateSafe(existingResult._id.toString(), resultData);
                    importResults.updated++;
                }
                else {
                    await TournamentResult_1.TournamentResult.create(resultData);
                    importResults.created++;
                }
            }
            catch (error) {
                importResults.errors.push({
                    tournament: resultData.tournamentId || "Unknown",
                    players: resultData.players || [],
                    error: error.message,
                });
            }
        }
        this.sendSuccess(res, importResults, `Bulk import completed: ${importResults.created} created, ${importResults.updated} updated, ${importResults.errors.length} errors`);
    });
    // Helper method to parse sort string
    parseSortString(sortStr) {
        const sort = {};
        const parts = sortStr.split(",");
        parts.forEach((part) => {
            const trimmed = part.trim();
            if (trimmed.startsWith("-")) {
                const field = trimmed.substring(1);
                // Handle nested field references
                sort[field] = -1;
            }
            else {
                sort[trimmed] = 1;
            }
        });
        return sort;
    }
    // Helper method to calculate player statistics
    calculatePlayerStats(results) {
        if (results.length === 0) {
            return {
                totalTournaments: 0,
                totalWins: 0,
                totalLosses: 0,
                totalGames: 0,
                overallWinPercentage: 0,
                avgFinish: 0,
                bestFinish: null,
                championships: 0,
            };
        }
        const totalWins = results.reduce((sum, result) => sum + result.totalStats.totalWon, 0);
        const totalLosses = results.reduce((sum, result) => sum + result.totalStats.totalLost, 0);
        const totalGames = results.reduce((sum, result) => sum + result.totalStats.totalPlayed, 0);
        const validRanks = results
            .filter((r) => r.totalStats.finalRank)
            .map((r) => r.totalStats.finalRank);
        const championships = results.filter((r) => r.totalStats.finalRank === 1).length;
        return {
            totalTournaments: results.length,
            totalWins,
            totalLosses,
            totalGames,
            overallWinPercentage: totalGames > 0 ? totalWins / totalGames : 0,
            avgFinish: validRanks.length > 0
                ? validRanks.reduce((a, b) => a + b, 0) / validRanks.length
                : 0,
            bestFinish: validRanks.length > 0 ? Math.min(...validRanks) : null,
            championships,
        };
    }
    // Validate tournament result data
    validateTournamentResultData(data) {
        const errors = [];
        // Validate total stats consistency
        const stats = data.totalStats;
        if (stats) {
            if (stats.totalWon + stats.totalLost !== stats.totalPlayed) {
                errors.push("Total games played must equal total won plus total lost");
            }
            if (stats.totalWon > stats.totalPlayed) {
                errors.push("Total games won cannot exceed total games played");
            }
            if (stats.totalLost > stats.totalPlayed) {
                errors.push("Total games lost cannot exceed total games played");
            }
            if (stats.winPercentage < 0 || stats.winPercentage > 1) {
                errors.push("Win percentage must be between 0 and 1");
            }
        }
        // Validate player count
        if (data.players && (data.players.length < 1 || data.players.length > 2)) {
            errors.push("A team must have 1 or 2 players");
        }
        return errors;
    }
    // Override create method to add custom validation
    create = this.asyncHandler(async (req, res) => {
        const validationErrors = this.validateTournamentResultData(req.body);
        if (validationErrors.length > 0) {
            this.sendError(res, validationErrors.join(", "), 400);
            return;
        }
        // Use model directly instead of super because it's a field property now
        const result = await TournamentResult_1.TournamentResult.create(req.body);
        this.sendSuccess(res, result, "Tournament Result created successfully", undefined, 201);
    });
    // Override update method to add custom validation
    update = this.asyncHandler(async (req, res) => {
        const validationErrors = this.validateTournamentResultData(req.body);
        if (validationErrors.length > 0) {
            this.sendError(res, validationErrors.join(", "), 400);
            return;
        }
        const result = await TournamentResult_1.TournamentResult.findByIdAndUpdateSafe(req.params.id, req.body);
        if (!result) {
            this.sendNotFound(res, "Tournament Result");
            return;
        }
        this.sendSuccess(res, result, "Tournament Result updated successfully");
    });
    /**
     * Get the range of available years from tournament data
     */
    getAvailableYears = this.asyncHandler(async (req, res) => {
        const DEFAULT_MIN_YEAR = 2008;
        const currentYear = new Date().getFullYear();
        const result = await Tournament_1.Tournament.aggregate([
            {
                $group: {
                    _id: null,
                    minDate: { $min: "$date" },
                    maxDate: { $max: "$date" },
                },
            },
        ]);
        if (result.length === 0 || !result[0].minDate) {
            this.sendSuccess(res, { min: DEFAULT_MIN_YEAR, max: currentYear });
            return;
        }
        const minYear = new Date(result[0].minDate).getFullYear();
        const maxYear = new Date(result[0].maxDate).getFullYear();
        this.sendSuccess(res, {
            min: isNaN(minYear) ? DEFAULT_MIN_YEAR : minYear,
            max: isNaN(maxYear) ? currentYear : maxYear,
        });
    });
}
exports.TournamentResultController = TournamentResultController;
exports.default = new TournamentResultController();
//# sourceMappingURL=TournamentResultController.js.map