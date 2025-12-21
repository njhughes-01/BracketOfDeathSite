"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tournamentController = exports.TournamentController = void 0;
const Tournament_1 = require("../models/Tournament");
const TournamentResult_1 = require("../models/TournamentResult");
const Player_1 = require("../models/Player");
const tournament_1 = require("../types/tournament");
const base_1 = require("./base");
class TournamentController extends base_1.BaseController {
    constructor() {
        super(Tournament_1.Tournament, 'Tournament');
    }
    buildFilter(query) {
        const filter = {};
        const { page, limit, sort, select, populate, q, ...filterParams } = query;
        if (filterParams.startDate || filterParams.endDate) {
            filter.date = {};
            if (filterParams.startDate) {
                filter.date.$gte = new Date(filterParams.startDate);
            }
            if (filterParams.endDate) {
                filter.date.$lte = new Date(filterParams.endDate);
            }
        }
        else if (filterParams.date) {
            filter.date = new Date(filterParams.date);
        }
        if (filterParams.year) {
            const year = parseInt(filterParams.year);
            filter.date = {
                $gte: new Date(`${year}-01-01`),
                $lte: new Date(`${year}-12-31`),
            };
        }
        if (filterParams.bodNumber) {
            filter.bodNumber = parseInt(filterParams.bodNumber);
        }
        else if (filterParams.bodNumber_min || filterParams.bodNumber_max) {
            filter.bodNumber = {};
            if (filterParams.bodNumber_min) {
                filter.bodNumber.$gte = parseInt(filterParams.bodNumber_min);
            }
            if (filterParams.bodNumber_max) {
                filter.bodNumber.$lte = parseInt(filterParams.bodNumber_max);
            }
        }
        if (filterParams.format) {
            filter.format = filterParams.format;
        }
        if (filterParams.location) {
            filter.location = new RegExp(filterParams.location, 'i');
        }
        if (filterParams.advancementCriteria) {
            filter.advancementCriteria = new RegExp(filterParams.advancementCriteria, 'i');
        }
        return filter;
    }
    buildSearchFilter(searchTerm) {
        return {
            $or: [
                { location: new RegExp(searchTerm, 'i') },
                { notes: new RegExp(searchTerm, 'i') },
                { advancementCriteria: new RegExp(searchTerm, 'i') },
            ],
        };
    }
    getStats = this.asyncHandler(async (req, res, next) => {
        try {
            const stats = await Tournament_1.Tournament.aggregate([
                {
                    $group: {
                        _id: null,
                        totalTournaments: { $sum: 1 },
                        formats: { $addToSet: '$format' },
                        locations: { $addToSet: '$location' },
                        earliestDate: { $min: '$date' },
                        latestDate: { $max: '$date' },
                    },
                },
            ]);
            const formatStats = await Tournament_1.Tournament.aggregate([
                {
                    $group: {
                        _id: '$format',
                        count: { $sum: 1 },
                    },
                },
                {
                    $sort: { count: -1 },
                },
            ]);
            const yearlyStats = await Tournament_1.Tournament.aggregate([
                {
                    $group: {
                        _id: { $year: '$date' },
                        count: { $sum: 1 },
                        formats: { $addToSet: '$format' },
                    },
                },
                {
                    $sort: { _id: -1 },
                },
            ]);
            const response = {
                success: true,
                data: {
                    overview: stats[0] || {},
                    formatBreakdown: formatStats,
                    yearlyBreakdown: yearlyStats,
                },
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    });
    getByYear = this.asyncHandler(async (req, res, next) => {
        try {
            const { year } = req.params;
            const yearInt = parseInt(year);
            if (isNaN(yearInt) || yearInt < 2009 || yearInt > new Date().getFullYear() + 10) {
                this.sendError(res, 400, 'Invalid year provided');
                return;
            }
            const tournaments = await Tournament_1.Tournament.find({
                date: {
                    $gte: new Date(`${yearInt}-01-01`),
                    $lte: new Date(`${yearInt}-12-31`),
                },
            }).sort({ date: 1 });
            const response = {
                success: true,
                data: tournaments,
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    });
    getByFormat = this.asyncHandler(async (req, res, next) => {
        try {
            const { format } = req.params;
            if (!tournament_1.TournamentFormats.includes(format)) {
                this.sendError(res, 400, `Invalid format. Must be one of: ${tournament_1.TournamentFormats.join(', ')}`);
                return;
            }
            const tournaments = await Tournament_1.Tournament.find({ format }).sort({ date: -1 });
            const response = {
                success: true,
                data: tournaments,
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    });
    getWithResults = this.asyncHandler(async (req, res, next) => {
        try {
            const { id } = req.params;
            const tournament = await Tournament_1.Tournament.findById(id);
            if (!tournament) {
                this.sendError(res, 404, 'Tournament not found');
                return;
            }
            const results = await TournamentResult_1.TournamentResult.find({ tournamentId: id })
                .populate('players', 'name')
                .sort({ 'totalStats.finalRank': 1, 'totalStats.winPercentage': -1 });
            const response = {
                success: true,
                data: {
                    tournament,
                    results,
                    resultCount: results.length,
                },
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    });
    getUpcoming = this.asyncHandler(async (req, res, next) => {
        try {
            const now = new Date();
            const limit = parseInt(req.query.limit) || 10;
            const upcomingTournaments = await Tournament_1.Tournament.find({
                date: { $gte: now },
            })
                .sort({ date: 1 })
                .limit(limit);
            const response = {
                success: true,
                data: upcomingTournaments,
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    });
    getRecent = this.asyncHandler(async (req, res, next) => {
        try {
            const limit = parseInt(req.query.limit) || 10;
            const recentTournaments = await Tournament_1.Tournament.find({})
                .sort({ date: -1 })
                .limit(limit);
            const response = {
                success: true,
                data: recentTournaments,
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    });
    listOpen = this.asyncHandler(async (req, res, next) => {
        try {
            const now = new Date();
            const openTournaments = await Tournament_1.Tournament.find({
                $or: [
                    { allowSelfRegistration: true },
                    { registrationType: 'open' }
                ],
                status: { $in: ['scheduled', 'open'] },
                $and: [
                    { $or: [{ registrationOpensAt: { $exists: false } }, { registrationOpensAt: { $lte: now } }] },
                    { $or: [{ registrationDeadline: { $exists: false } }, { registrationDeadline: { $gte: now } }] }
                ]
            }).sort({ date: 1 });
            const response = {
                success: true,
                data: openTournaments,
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    });
    join = this.asyncHandler(async (req, res, next) => {
        try {
            const { id } = req.params;
            const { playerId } = req.body;
            const userId = req.user?.id;
            const tournament = await Tournament_1.Tournament.findById(id);
            if (!tournament) {
                this.sendError(res, 404, 'Tournament not found');
                return;
            }
            if (!tournament.allowSelfRegistration && tournament.registrationType !== 'open') {
                this.sendError(res, 403, 'Self-registration is not allowed for this tournament');
                return;
            }
            const now = new Date();
            if (tournament.registrationOpensAt && now < new Date(tournament.registrationOpensAt)) {
                this.sendError(res, 400, 'Registration is not yet open');
                return;
            }
            if (tournament.registrationDeadline && now > new Date(tournament.registrationDeadline)) {
                this.sendError(res, 400, 'Registration deadline has passed');
                return;
            }
            let player;
            if (playerId) {
                player = await Player_1.Player.findById(playerId);
            }
            else {
                this.sendError(res, 400, 'Player ID is required for registration');
                return;
            }
            if (!player) {
                this.sendError(res, 404, 'Player profile not found');
                return;
            }
            const isRegistered = tournament.registeredPlayers.some((p) => p.playerId?.toString() === playerId || p.toString() === playerId);
            const isWaitlisted = tournament.waitlistPlayers.some((p) => p.playerId?.toString() === playerId || p.toString() === playerId);
            if (isRegistered) {
                this.sendError(res, 400, 'Player already registered');
                return;
            }
            if (isWaitlisted) {
                this.sendError(res, 400, 'Player already on waitlist');
                return;
            }
            const maxPlayers = tournament.maxPlayers || 32;
            const currentCount = tournament.registeredPlayers.length;
            let status = 'registered';
            if (currentCount >= maxPlayers) {
                tournament.waitlistPlayers.push({
                    playerId: player._id,
                    registeredAt: now
                });
                status = 'waitlisted';
            }
            else {
                tournament.registeredPlayers.push({
                    playerId: player._id,
                    registeredAt: now
                });
            }
            await tournament.save();
            const response = {
                success: true,
                data: {
                    tournamentId: tournament._id,
                    playerId: player._id,
                    status,
                    message: status === 'registered' ? 'Successfully registered for tournament' : 'Tournament full. Added to waitlist.'
                }
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    });
    getNextBodNumber = this.asyncHandler(async (req, res, next) => {
        try {
            const latestTournament = await Tournament_1.Tournament.findOne({})
                .sort({ bodNumber: -1 })
                .select('bodNumber');
            const nextBodNumber = latestTournament ? latestTournament.bodNumber + 1 : 1;
            const response = {
                success: true,
                data: { nextBodNumber },
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    });
    generatePlayerSeeds = this.asyncHandler(async (req, res, next) => {
        try {
            console.log('generatePlayerSeeds called with:', req.body);
            const { method = 'historical', parameters = {} } = req.body;
            const players = await this.getAllPlayersWithStats();
            console.log(`Found ${players.length} players for seeding`);
            if (players.length === 0) {
                this.sendError(res, 404, 'No players found for seeding');
                return;
            }
            let playerSeeds = [];
            switch (method) {
                case 'historical':
                    playerSeeds = this.calculateHistoricalSeeds(players, parameters);
                    break;
                case 'recent_form':
                    playerSeeds = this.calculateRecentFormSeeds(players, parameters);
                    break;
                case 'elo':
                    playerSeeds = this.calculateEloSeeds(players, parameters);
                    break;
                case 'manual':
                    playerSeeds = players.map((player, index) => ({
                        playerId: player._id,
                        playerName: player.name,
                        seed: index + 1,
                        statistics: this.getPlayerStatistics(player)
                    }));
                    break;
                default:
                    playerSeeds = this.calculateHistoricalSeeds(players, parameters);
            }
            console.log(`Generated ${playerSeeds.length} player seeds`);
            const response = {
                success: true,
                data: playerSeeds,
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in generatePlayerSeeds:', error);
            next(error);
        }
    });
    generateTeams = this.asyncHandler(async (req, res, next) => {
        try {
            const { playerIds, config } = req.body;
            if (!Array.isArray(playerIds) || playerIds.length === 0) {
                this.sendError(res, 400, 'Player IDs array is required');
                return;
            }
            const players = await this.getPlayersById(playerIds);
            if (players.length !== playerIds.length) {
                this.sendError(res, 400, 'Some players not found');
                return;
            }
            const teams = await this.formTeams(players, config);
            const response = {
                success: true,
                data: teams,
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    });
    setupTournament = this.asyncHandler(async (req, res, next) => {
        try {
            console.log('setupTournament called with body:', JSON.stringify(req.body, null, 2));
            let { basicInfo, seedingConfig, teamFormationConfig, bracketType, maxPlayers, selectedPlayers, generatedSeeds, generatedTeams } = req.body;
            if (!bracketType) {
                bracketType = 'round_robin_playoff';
            }
            if (!basicInfo) {
                this.sendError(res, 400, 'basicInfo is required');
                return;
            }
            const requiredFields = ['date', 'bodNumber', 'format', 'location', 'advancementCriteria'];
            const missingFields = requiredFields.filter(field => !basicInfo[field]);
            if (missingFields.length > 0) {
                this.sendError(res, 400, `Missing required fields in basicInfo: ${missingFields.join(', ')}`);
                return;
            }
            console.log('Creating tournament with data:', {
                ...basicInfo,
                maxPlayers,
                status: basicInfo.status || 'scheduled',
                players: selectedPlayers || [],
                seedingConfig,
                teamFormationConfig,
                bracketType,
                generatedSeeds: generatedSeeds || [],
                generatedTeams: generatedTeams || []
            });
            const tournament = await Tournament_1.Tournament.create({
                ...basicInfo,
                maxPlayers,
                status: basicInfo.status || 'scheduled',
                players: selectedPlayers || [],
                seedingConfig,
                teamFormationConfig,
                bracketType,
                generatedSeeds: generatedSeeds || [],
                generatedTeams: generatedTeams || []
            });
            const response = {
                success: true,
                data: tournament,
                message: 'Tournament setup completed successfully'
            };
            res.status(201).json(response);
        }
        catch (error) {
            console.error('Error in setupTournament:', error);
            if (error.name === 'ValidationError') {
                const validationErrors = Object.values(error.errors).map((err) => err.message).join(', ');
                this.sendError(res, 400, `Validation error: ${validationErrors}`);
            }
            else {
                next(error);
            }
        }
    });
    bulkImport = this.asyncHandler(async (req, res, next) => {
        try {
            const { tournaments } = req.body;
            if (!Array.isArray(tournaments) || tournaments.length === 0) {
                this.sendError(res, 400, 'Tournaments array is required');
                return;
            }
            const results = {
                created: 0,
                updated: 0,
                errors: [],
            };
            for (const tournamentData of tournaments) {
                try {
                    const existingTournament = await Tournament_1.Tournament.findOne({
                        bodNumber: tournamentData.bodNumber
                    });
                    if (existingTournament) {
                        await Tournament_1.Tournament.findByIdAndUpdateSafe(existingTournament._id.toString(), tournamentData);
                        results.updated++;
                    }
                    else {
                        await Tournament_1.Tournament.create(tournamentData);
                        results.created++;
                    }
                }
                catch (error) {
                    results.errors.push({
                        bodNumber: tournamentData.bodNumber || 0,
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
    validateTournamentData(data) {
        const errors = [];
        if (data.date) {
            const date = new Date(data.date);
            const minDate = new Date('2009-01-01');
            const maxDate = new Date();
            maxDate.setFullYear(maxDate.getFullYear() + 10);
            if (date < minDate || date > maxDate) {
                errors.push('Date must be between 2009 and 10 years in the future');
            }
        }
        if (data.bodNumber) {
            const bodStr = data.bodNumber.toString();
            if (bodStr.length !== 6) {
                errors.push('BOD number must be 6 digits (YYYYMM)');
            }
            else {
                const year = parseInt(bodStr.substring(0, 4));
                const month = parseInt(bodStr.substring(4, 6));
                if (year < 2009 || month < 1 || month > 12) {
                    errors.push('BOD number must be valid (YYYYMM format)');
                }
            }
        }
        if (data.format && !tournament_1.TournamentFormats.includes(data.format)) {
            errors.push(`Format must be one of: ${tournament_1.TournamentFormats.join(', ')}`);
        }
        if (data.date && data.bodNumber) {
            const date = new Date(data.date);
            const bodStr = data.bodNumber.toString();
            const bodYear = parseInt(bodStr.substring(0, 4));
            const bodMonth = parseInt(bodStr.substring(4, 6));
            if (date.getFullYear() !== bodYear || (date.getMonth() + 1) !== bodMonth) {
                errors.push('Date must match BOD number year and month');
            }
        }
        return errors;
    }
    async getAllPlayersWithStats() {
        return Player_1.Player.find({}).lean();
    }
    async getPlayersById(playerIds) {
        return Player_1.Player.find({ _id: { $in: playerIds } }).lean();
    }
    getPlayerStatistics(player) {
        return {
            avgFinish: player.avgFinish || 0,
            winningPercentage: player.winningPercentage || 0,
            totalChampionships: player.totalChampionships || 0,
            bodsPlayed: player.bodsPlayed || 0,
            recentForm: player.recentForm || 0
        };
    }
    calculateHistoricalSeeds(players, parameters) {
        const { championshipWeight = 0.3, winPercentageWeight = 0.4, avgFinishWeight = 0.3 } = parameters;
        const playersWithScores = players.map(player => {
            const stats = this.getPlayerStatistics(player);
            const champScore = stats.totalChampionships;
            const winPctScore = stats.winningPercentage;
            const avgFinishScore = stats.bodsPlayed > 0 ? (1 / (stats.avgFinish || 1)) : 0;
            const compositeScore = (champScore * championshipWeight) +
                (winPctScore * winPercentageWeight) +
                (avgFinishScore * avgFinishWeight);
            return {
                ...player,
                compositeScore,
                statistics: stats
            };
        });
        playersWithScores.sort((a, b) => b.compositeScore - a.compositeScore);
        return playersWithScores.map((player, index) => ({
            playerId: player._id,
            playerName: player.name,
            seed: index + 1,
            statistics: player.statistics
        }));
    }
    calculateRecentFormSeeds(players, parameters) {
        return this.calculateHistoricalSeeds(players, parameters);
    }
    calculateEloSeeds(players, parameters) {
        return this.calculateHistoricalSeeds(players, parameters);
    }
    async formTeams(players, config) {
        const { method = 'manual', parameters = {} } = config;
        switch (method) {
            case 'preformed':
                return this.handlePreformedTeams(players, parameters);
            case 'draft':
                return this.handleDraftTeams(players, parameters);
            case 'statistical_pairing':
                return this.handleStatisticalPairing(players, parameters);
            case 'random':
                return this.handleRandomPairing(players);
            case 'manual':
            default:
                return this.handleManualTeams(players);
        }
    }
    handlePreformedTeams(players, parameters) {
        return this.handleManualTeams(players);
    }
    handleDraftTeams(players, parameters) {
        return this.handleStatisticalPairing(players, parameters);
    }
    handleStatisticalPairing(players, parameters) {
        const { skillBalancing = true } = parameters;
        if (!skillBalancing) {
            return this.handleRandomPairing(players);
        }
        const sortedPlayers = players.map(player => ({
            ...player,
            skillScore: (player.winningPercentage || 0) * 100 + (player.totalChampionships || 0) * 10
        })).sort((a, b) => b.skillScore - a.skillScore);
        const teams = [];
        const teamCount = Math.floor(sortedPlayers.length / 2);
        for (let i = 0; i < teamCount; i++) {
            const highSkillPlayer = sortedPlayers[i];
            const lowSkillPlayer = sortedPlayers[sortedPlayers.length - 1 - i];
            const combinedSeed = Math.ceil((i + 1 + (teamCount - i)) / 2);
            teams.push({
                teamId: `team_${i + 1}`,
                players: [
                    {
                        playerId: highSkillPlayer._id,
                        playerName: highSkillPlayer.name,
                        seed: i + 1,
                        statistics: this.getPlayerStatistics(highSkillPlayer)
                    },
                    {
                        playerId: lowSkillPlayer._id,
                        playerName: lowSkillPlayer.name,
                        seed: sortedPlayers.length - i,
                        statistics: this.getPlayerStatistics(lowSkillPlayer)
                    }
                ],
                combinedSeed,
                teamName: `${highSkillPlayer.name} & ${lowSkillPlayer.name}`,
                combinedStatistics: {
                    avgFinish: ((highSkillPlayer.avgFinish || 0) + (lowSkillPlayer.avgFinish || 0)) / 2,
                    combinedWinPercentage: ((highSkillPlayer.winningPercentage || 0) + (lowSkillPlayer.winningPercentage || 0)) / 2,
                    totalChampionships: (highSkillPlayer.totalChampionships || 0) + (lowSkillPlayer.totalChampionships || 0),
                    combinedBodsPlayed: (highSkillPlayer.bodsPlayed || 0) + (lowSkillPlayer.bodsPlayed || 0)
                }
            });
        }
        return teams;
    }
    handleRandomPairing(players) {
        const shuffled = [...players].sort(() => Math.random() - 0.5);
        const teams = [];
        for (let i = 0; i < shuffled.length; i += 2) {
            if (i + 1 < shuffled.length) {
                const player1 = shuffled[i];
                const player2 = shuffled[i + 1];
                teams.push({
                    teamId: `team_${Math.floor(i / 2) + 1}`,
                    players: [
                        {
                            playerId: player1._id,
                            playerName: player1.name,
                            seed: i + 1,
                            statistics: this.getPlayerStatistics(player1)
                        },
                        {
                            playerId: player2._id,
                            playerName: player2.name,
                            seed: i + 2,
                            statistics: this.getPlayerStatistics(player2)
                        }
                    ],
                    combinedSeed: Math.floor(i / 2) + 1,
                    teamName: `${player1.name} & ${player2.name}`,
                    combinedStatistics: {
                        avgFinish: ((player1.avgFinish || 0) + (player2.avgFinish || 0)) / 2,
                        combinedWinPercentage: ((player1.winningPercentage || 0) + (player2.winningPercentage || 0)) / 2,
                        totalChampionships: (player1.totalChampionships || 0) + (player2.totalChampionships || 0),
                        combinedBodsPlayed: (player1.bodsPlayed || 0) + (player2.bodsPlayed || 0)
                    }
                });
            }
        }
        return teams;
    }
    handleManualTeams(players) {
        return players.map((player, index) => ({
            teamId: `player_${player._id}`,
            players: [{
                    playerId: player._id,
                    playerName: player.name,
                    seed: index + 1,
                    statistics: this.getPlayerStatistics(player)
                }],
            combinedSeed: index + 1,
            teamName: player.name,
            combinedStatistics: this.getPlayerStatistics(player)
        }));
    }
    create = async (req, res, next) => {
        try {
            const validationErrors = this.validateTournamentData(req.body);
            if (validationErrors.length > 0) {
                this.sendError(res, 400, validationErrors.join(', '));
                return;
            }
            await super.create(req, res, next);
        }
        catch (error) {
            next(error);
        }
    };
    update = async (req, res, next) => {
        try {
            const validationErrors = this.validateTournamentData(req.body);
            if (validationErrors.length > 0) {
                this.sendError(res, 400, validationErrors.join(', '));
                return;
            }
            await super.update(req, res, next);
        }
        catch (error) {
            next(error);
        }
    };
    delete = async (req, res, next) => {
        try {
            const { id } = req.params;
            const { cascade } = req.query;
            const tournament = await Tournament_1.Tournament.findById(id);
            if (!tournament) {
                this.sendError(res, 404, 'Tournament not found');
                return;
            }
            const resultsCount = await TournamentResult_1.TournamentResult.countDocuments({ tournamentId: id });
            if (resultsCount > 0 && cascade !== 'true') {
                this.sendError(res, 400, `Tournament has ${resultsCount} results. Use ?cascade=true to delete tournament and all results.`);
                return;
            }
            if (cascade === 'true' && resultsCount > 0) {
                await TournamentResult_1.TournamentResult.deleteMany({ tournamentId: id });
            }
            await Tournament_1.Tournament.findByIdAndDelete(id);
            const response = {
                success: true,
                message: cascade === 'true' && resultsCount > 0
                    ? `Tournament and ${resultsCount} results deleted successfully`
                    : 'Tournament deleted successfully',
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    };
}
exports.TournamentController = TournamentController;
exports.tournamentController = new TournamentController();
//# sourceMappingURL=TournamentController.js.map