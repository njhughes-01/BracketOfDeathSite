"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TournamentAdminController = void 0;
const Tournament_1 = require("../models/Tournament");
const Player_1 = require("../models/Player");
const Match_1 = require("../models/Match");
const TournamentResult_1 = require("../models/TournamentResult");
const base_1 = require("./base");
const mongoose_1 = require("mongoose");
class TournamentAdminController extends base_1.BaseController {
    constructor() {
        super(Tournament_1.Tournament, 'Tournament');
    }
    /**
     * Update tournament status with validation
     */
    updateStatus = async (req, res, next) => {
        try {
            const { id } = req.params;
            const { status } = req.body;
            if (!status) {
                res.status(400).json({
                    success: false,
                    message: 'Status is required',
                    data: null,
                });
                return;
            }
            const tournament = await Tournament_1.Tournament.findById(id);
            if (!tournament) {
                res.status(404).json({
                    success: false,
                    message: 'Tournament not found',
                    data: null,
                });
                return;
            }
            // Validate status transition
            const oldStatus = tournament.status;
            tournament.status = status;
            try {
                await tournament.save();
            }
            catch (error) {
                if (error.message.includes('Invalid status transition')) {
                    res.status(400).json({
                        success: false,
                        message: `Cannot transition from ${oldStatus} to ${status}`,
                        data: null,
                    });
                    return;
                }
                throw error;
            }
            const response = {
                success: true,
                message: `Tournament status updated to ${status}`,
                data: tournament,
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    };
    /**
     * Add players to a tournament
     */
    addPlayers = async (req, res, next) => {
        try {
            const { id } = req.params;
            const { playerIds } = req.body;
            if (!playerIds || !Array.isArray(playerIds)) {
                res.status(400).json({
                    success: false,
                    message: 'Player IDs array is required',
                    data: null,
                });
                return;
            }
            const tournament = await Tournament_1.Tournament.findById(id).populate('players', 'name');
            if (!tournament) {
                res.status(404).json({
                    success: false,
                    message: 'Tournament not found',
                    data: null,
                });
                return;
            }
            // Check if tournament allows player additions
            if (!['scheduled', 'open'].includes(tournament.status)) {
                res.status(400).json({
                    success: false,
                    message: 'Players can only be added to scheduled or open tournaments',
                    data: null,
                });
                return;
            }
            // Validate players exist
            const objectIds = playerIds.map(id => new mongoose_1.Types.ObjectId(id));
            const players = await Player_1.Player.find({ _id: { $in: objectIds } });
            if (players.length !== playerIds.length) {
                res.status(400).json({
                    success: false,
                    message: 'One or more players not found',
                    data: null,
                });
                return;
            }
            // Add new players (avoid duplicates)
            const existingPlayerIds = tournament.players?.map(p => p.toString()) || [];
            const newPlayerIds = objectIds.filter(id => !existingPlayerIds.includes(id.toString()));
            if (newPlayerIds.length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'All players are already registered for this tournament',
                    data: null,
                });
                return;
            }
            tournament.players = [...(tournament.players || []), ...newPlayerIds];
            // Check max players limit
            if (tournament.maxPlayers && tournament.players.length > tournament.maxPlayers) {
                res.status(400).json({
                    success: false,
                    message: `Tournament is limited to ${tournament.maxPlayers} players`,
                    data: null,
                });
                return;
            }
            await tournament.save();
            const updatedTournament = await Tournament_1.Tournament.findById(id).populate('players', 'name firstName lastName');
            const response = {
                success: true,
                message: `Added ${newPlayerIds.length} players to tournament`,
                data: updatedTournament,
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    };
    /**
     * Remove a player from a tournament
     */
    removePlayer = async (req, res, next) => {
        try {
            const { id, playerId } = req.params;
            const tournament = await Tournament_1.Tournament.findById(id);
            if (!tournament) {
                res.status(404).json({
                    success: false,
                    message: 'Tournament not found',
                    data: null,
                });
                return;
            }
            // Check if tournament allows player removal
            if (!['scheduled', 'open'].includes(tournament.status)) {
                res.status(400).json({
                    success: false,
                    message: 'Players can only be removed from scheduled or open tournaments',
                    data: null,
                });
                return;
            }
            const playerObjectId = new mongoose_1.Types.ObjectId(playerId);
            const playerIndex = tournament.players?.findIndex(p => p.toString() === playerId);
            if (playerIndex === undefined || playerIndex === -1) {
                res.status(404).json({
                    success: false,
                    message: 'Player not found in this tournament',
                    data: null,
                });
                return;
            }
            tournament.players?.splice(playerIndex, 1);
            await tournament.save();
            const updatedTournament = await Tournament_1.Tournament.findById(id).populate('players', 'name firstName lastName');
            const response = {
                success: true,
                message: 'Player removed from tournament',
                data: updatedTournament,
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    };
    /**
     * Generate matches for a tournament (create bracket)
     */
    generateMatches = async (req, res, next) => {
        try {
            const { id } = req.params;
            const { bracketType = 'single-elimination' } = req.body;
            const tournament = await Tournament_1.Tournament.findById(id).populate('players', 'name firstName lastName');
            if (!tournament) {
                res.status(404).json({
                    success: false,
                    message: 'Tournament not found',
                    data: null,
                });
                return;
            }
            // Check if tournament can start
            if (tournament.status !== 'open') {
                res.status(400).json({
                    success: false,
                    message: 'Tournament must be open to generate matches',
                    data: null,
                });
                return;
            }
            const playerCount = tournament.players?.length || 0;
            if (playerCount < 2) {
                res.status(400).json({
                    success: false,
                    message: 'Tournament needs at least 2 players to generate matches',
                    data: null,
                });
                return;
            }
            // Check if matches already exist
            const existingMatches = await Match_1.Match.find({ tournamentId: id });
            if (existingMatches.length > 0) {
                res.status(400).json({
                    success: false,
                    message: 'Matches already exist for this tournament',
                    data: null,
                });
                return;
            }
            // For doubles tournaments, we need an even number of players (teams of 2)
            const isDoubles = ['Mixed', 'Men\'s Doubles', 'Women\'s Doubles'].includes(tournament.format);
            if (isDoubles && playerCount % 2 !== 0) {
                res.status(400).json({
                    success: false,
                    message: 'Doubles tournaments require an even number of players',
                    data: null,
                });
                return;
            }
            // Generate bracket matches
            const matches = await this.createBracketMatches(tournament, isDoubles);
            // Update tournament status to active
            tournament.status = 'active';
            await tournament.save();
            const response = {
                success: true,
                message: `Generated ${matches.length} matches for tournament`,
                data: { tournament, matches },
            };
            res.status(201).json(response);
        }
        catch (error) {
            next(error);
        }
    };
    /**
     * Update match score
     */
    updateMatchScore = async (req, res, next) => {
        try {
            const { matchId } = req.params;
            const { team1Score, team2Score, notes } = req.body;
            const match = await Match_1.Match.findById(matchId).populate('tournamentId', 'status');
            if (!match) {
                res.status(404).json({
                    success: false,
                    message: 'Match not found',
                    data: null,
                });
                return;
            }
            // Verify tournament is active
            const tournament = match.tournamentId;
            if (tournament.status !== 'active') {
                res.status(400).json({
                    success: false,
                    message: 'Can only update scores for active tournaments',
                    data: null,
                });
                return;
            }
            // Update scores
            if (team1Score !== undefined)
                match.team1.score = team1Score;
            if (team2Score !== undefined)
                match.team2.score = team2Score;
            if (notes !== undefined)
                match.notes = notes;
            // Save will trigger automatic winner calculation and status update
            await match.save();
            // If this match is completed, update tournament results
            if (match.status === 'completed') {
                await this.updateTournamentResults(match);
            }
            const response = {
                success: true,
                message: 'Match score updated',
                data: match,
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    };
    /**
     * Finalize tournament (mark as completed)
     */
    finalizeTournament = async (req, res, next) => {
        try {
            const { id } = req.params;
            const tournament = await Tournament_1.Tournament.findById(id);
            if (!tournament) {
                res.status(404).json({
                    success: false,
                    message: 'Tournament not found',
                    data: null,
                });
                return;
            }
            if (tournament.status !== 'active') {
                res.status(400).json({
                    success: false,
                    message: 'Only active tournaments can be finalized',
                    data: null,
                });
                return;
            }
            // Check if all matches are completed
            const incompleteMatches = await Match_1.Match.find({
                tournamentId: id,
                status: { $ne: 'completed' }
            });
            if (incompleteMatches.length > 0) {
                res.status(400).json({
                    success: false,
                    message: `Tournament has ${incompleteMatches.length} incomplete matches`,
                    data: null,
                });
                return;
            }
            // Find the champion (winner of the final match)
            const finalMatch = await Match_1.Match.findOne({
                tournamentId: id,
                round: 'final'
            }).populate('team1.players team2.players', 'name firstName lastName');
            if (finalMatch && finalMatch.winner) {
                const winningTeam = finalMatch.winner === 'team1' ? finalMatch.team1 : finalMatch.team2;
                const championPlayer = winningTeam.players[0];
                tournament.champion = {
                    playerId: championPlayer._id,
                    playerName: championPlayer.name || `${championPlayer.firstName} ${championPlayer.lastName}`,
                };
            }
            // Update status to completed
            tournament.status = 'completed';
            await tournament.save();
            // Update player statistics
            await this.updatePlayerStatistics(tournament);
            const response = {
                success: true,
                message: 'Tournament finalized successfully',
                data: tournament,
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    };
    /**
     * Get tournament with matches and results
     */
    getTournamentWithMatches = async (req, res, next) => {
        try {
            const { id } = req.params;
            const tournament = await Tournament_1.Tournament.findById(id).populate('players', 'name firstName lastName');
            if (!tournament) {
                res.status(404).json({
                    success: false,
                    message: 'Tournament not found',
                    data: null,
                });
                return;
            }
            const matches = await Match_1.Match.find({ tournamentId: id }).sort({ roundNumber: 1, matchNumber: 1 });
            const results = await TournamentResult_1.TournamentResult.find({ tournamentId: id }).populate('players', 'name firstName lastName');
            const response = {
                success: true,
                message: 'Tournament details retrieved',
                data: {
                    tournament,
                    matches,
                    results,
                },
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    };
    // Private helper methods
    async createBracketMatches(tournament, isDoubles) {
        const players = tournament.players || [];
        const matches = [];
        if (isDoubles) {
            // Create teams from pairs of players
            const teams = [];
            for (let i = 0; i < players.length; i += 2) {
                const player1 = players[i];
                const player2 = players[i + 1];
                teams.push({
                    players: [player1._id, player2._id],
                    playerNames: [player1.name, player2.name],
                    seed: Math.floor(i / 2) + 1,
                });
            }
            // Generate bracket matches for teams
            await this.generateBracketForTeams(tournament._id, teams, matches);
        }
        else {
            // Singles tournament - each player is a "team"
            const teams = players.map((player, index) => ({
                players: [player._id],
                playerNames: [player.name],
                seed: index + 1,
            }));
            await this.generateBracketForTeams(tournament._id, teams, matches);
        }
        // Save all matches
        const savedMatches = await Match_1.Match.insertMany(matches);
        return savedMatches;
    }
    async generateBracketForTeams(tournamentId, teams, matches) {
        const teamCount = teams.length;
        const bracketSize = Math.pow(2, Math.ceil(Math.log2(teamCount)));
        // Shuffle teams for random bracket seeding
        const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
        // Pad with byes if needed
        while (shuffledTeams.length < bracketSize) {
            shuffledTeams.push(null); // bye
        }
        let currentRound = shuffledTeams;
        let roundNumber = 1;
        let matchNumber = 1;
        // Generate rounds until we have a winner
        while (currentRound.length > 1) {
            const nextRound = [];
            const roundName = this.getRoundName(currentRound.length);
            for (let i = 0; i < currentRound.length; i += 2) {
                const team1 = currentRound[i];
                const team2 = currentRound[i + 1];
                if (team1 && team2) {
                    // Both teams present - create match
                    matches.push({
                        tournamentId,
                        matchNumber: matchNumber++,
                        round: roundName,
                        roundNumber,
                        team1: { ...team1, score: 0 },
                        team2: { ...team2, score: 0 },
                        status: 'scheduled',
                    });
                    nextRound.push(null); // TBD winner
                }
                else if (team1) {
                    // Team1 gets a bye
                    nextRound.push(team1);
                }
                else if (team2) {
                    // Team2 gets a bye
                    nextRound.push(team2);
                }
            }
            currentRound = nextRound;
            roundNumber++;
        }
    }
    getRoundName(teamsRemaining) {
        switch (teamsRemaining) {
            case 64: return 'round-of-64';
            case 32: return 'round-of-32';
            case 16: return 'round-of-16';
            case 8: return 'quarterfinal';
            case 4: return 'semifinal';
            case 2: return 'final';
            default: return 'round-of-16'; // fallback
        }
    }
    async updateTournamentResults(match) {
        try {
            if (!match.tournamentId || !match.winner)
                return;
            const tournament = await Tournament_1.Tournament.findById(match.tournamentId);
            if (!tournament)
                return;
            // Determine teams involved
            const winningTeam = match.winner === 'team1' ? match.team1 : match.team2;
            const losingTeam = match.winner === 'team1' ? match.team2 : match.team1;
            // Update or create TournamentResult for winning team
            await this.updateTeamResult(tournament, winningTeam, true, match);
            // Update or create TournamentResult for losing team  
            await this.updateTeamResult(tournament, losingTeam, false, match);
        }
        catch (error) {
            console.error('Error updating tournament results:', error);
        }
    }
    async updateTeamResult(tournament, team, won, match) {
        try {
            // For each player in the team
            for (const playerId of team.players) {
                // Find or create TournamentResult
                let result = await TournamentResult_1.TournamentResult.findOne({
                    tournamentId: tournament._id,
                    players: playerId
                });
                if (!result) {
                    // Create new result record
                    result = new TournamentResult_1.TournamentResult({
                        tournamentId: tournament._id,
                        players: team.players.length > 1 ? team.players : [playerId], // Team or individual
                        division: tournament.format,
                        seed: team.seed || 0,
                        roundRobinScores: {
                            rrWon: 0,
                            rrLost: 0,
                            rrPlayed: 0,
                            rrWinPercentage: 0,
                            rrRank: 0,
                        },
                        bracketScores: {
                            bracketWon: 0,
                            bracketLost: 0,
                            bracketPlayed: 0,
                        },
                        totalStats: {
                            totalWon: 0,
                            totalLost: 0,
                            totalPlayed: 0,
                            winPercentage: 0,
                        },
                    });
                }
                // Initialize nested objects if they don't exist
                if (!result.bracketScores) {
                    result.bracketScores = {
                        bracketWon: 0,
                        bracketLost: 0,
                        bracketPlayed: 0,
                    };
                }
                if (!result.totalStats) {
                    result.totalStats = {
                        totalWon: 0,
                        totalLost: 0,
                        totalPlayed: 0,
                        winPercentage: 0,
                    };
                }
                // Update bracket statistics based on match round and outcome
                result.bracketScores.bracketPlayed = (result.bracketScores.bracketPlayed || 0) + 1;
                if (won) {
                    result.bracketScores.bracketWon = (result.bracketScores.bracketWon || 0) + 1;
                    // Set finish position based on round
                    if (match.round === 'final') {
                        result.totalStats.bodFinish = 1; // Champion
                    }
                    else if (match.round === 'semifinal') {
                        result.totalStats.bodFinish = 2; // Finalist
                    }
                }
                else {
                    result.bracketScores.bracketLost = (result.bracketScores.bracketLost || 0) + 1;
                    // Set finish position for losing rounds
                    if (match.round === 'final') {
                        result.totalStats.bodFinish = 2; // Runner-up
                    }
                    else if (match.round === 'semifinal') {
                        result.totalStats.bodFinish = 3; // Semifinalist
                    }
                }
                // Update total stats
                result.totalStats.totalPlayed = (result.bracketScores.bracketPlayed || 0) + (result.roundRobinScores?.rrPlayed || 0);
                result.totalStats.totalWon = (result.bracketScores.bracketWon || 0) + (result.roundRobinScores?.rrWon || 0);
                result.totalStats.totalLost = (result.bracketScores.bracketLost || 0) + (result.roundRobinScores?.rrLost || 0);
                if (result.totalStats.totalPlayed > 0) {
                    result.totalStats.winPercentage = result.totalStats.totalWon / result.totalStats.totalPlayed;
                }
                await result.save();
            }
        }
        catch (error) {
            console.error('Error updating team result:', error);
        }
    }
    calculatePlayerPoints(result) {
        let points = 0;
        // Points for round robin
        points += (result.roundRobinScores?.rrWon || 0) * 2; // 2 points per win
        points += (result.roundRobinScores?.rrLost || 0) * 1; // 1 point per loss (participation)
        // Points for bracket performance
        points += (result.bracketScores?.bracketWon || 0) * 3; // 3 points per bracket win
        // Bonus points for final position
        const finish = result.totalStats?.bodFinish;
        if (finish === 1) {
            points += 20; // Champion
        }
        else if (finish === 2) {
            points += 15; // Runner-up
        }
        else if (finish === 3) {
            points += 10; // Semifinalist
        }
        return points;
    }
    async updatePlayerStatistics(tournament) {
        try {
            // Get all tournament results for this tournament
            const results = await TournamentResult_1.TournamentResult.find({ tournamentId: tournament._id }).populate('players');
            // Group results by player
            const playerStats = new Map();
            for (const result of results) {
                for (const player of result.players) {
                    const playerId = player._id.toString();
                    if (!playerStats.has(playerId)) {
                        playerStats.set(playerId, {
                            player,
                            tournaments: 0,
                            wins: 0,
                            championships: 0,
                            totalPoints: 0,
                        });
                    }
                    const stats = playerStats.get(playerId);
                    stats.tournaments += 1;
                    stats.wins += result.totalStats?.totalWon || 0;
                    stats.totalPoints += this.calculatePlayerPoints(result);
                    if (result.totalStats?.bodFinish === 1) {
                        stats.championships += 1;
                    }
                }
            }
            // Update each player's lifetime statistics
            for (const [playerId, stats] of playerStats) {
                await Player_1.Player.findByIdAndUpdate(playerId, {
                    $inc: {
                        'statistics.tournamentsPlayed': stats.tournaments,
                        'statistics.totalWins': stats.wins,
                        'statistics.championships': stats.championships,
                        'statistics.totalPoints': stats.totalPoints,
                    }
                });
            }
        }
        catch (error) {
            console.error('Error updating player statistics:', error);
        }
    }
}
exports.TournamentAdminController = TournamentAdminController;
exports.default = TournamentAdminController;
//# sourceMappingURL=TournamentAdminController.js.map