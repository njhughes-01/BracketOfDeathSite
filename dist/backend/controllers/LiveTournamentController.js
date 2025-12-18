"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.liveTournamentController = exports.LiveTournamentController = void 0;
const Tournament_1 = require("../models/Tournament");
const Match_1 = require("../models/Match");
const TournamentResult_1 = require("../models/TournamentResult");
const Player_1 = require("../models/Player");
const match_1 = require("../types/match");
const base_1 = require("./base");
const LiveStatsService_1 = require("../services/LiveStatsService");
const EventBus_1 = require("../services/EventBus");
class LiveTournamentController extends base_1.BaseController {
    constructor() {
        super(Tournament_1.Tournament, 'LiveTournament');
    }
    getLiveTournament = this.asyncHandler(async (req, res, next) => {
        try {
            const { id } = req.params;
            const tournament = await Tournament_1.Tournament.findById(id).populate('players', 'name');
            if (!tournament) {
                this.sendError(res, 404, 'Tournament not found');
                return;
            }
            const matches = await Match_1.Match.find({ tournamentId: id })
                .populate('team1.players team2.players', 'name')
                .sort({ roundNumber: 1, matchNumber: 1 });
            const standings = await TournamentResult_1.TournamentResult.find({ tournamentId: id })
                .populate('players', 'name')
                .sort({ 'totalStats.finalRank': 1 });
            const tournamentObj = tournament.toObject();
            const liveTournament = {
                _id: tournamentObj._id.toString(),
                date: tournamentObj.date,
                bodNumber: tournamentObj.bodNumber,
                format: tournamentObj.format,
                location: tournamentObj.location,
                advancementCriteria: tournamentObj.advancementCriteria,
                notes: tournamentObj.notes,
                photoAlbums: tournamentObj.photoAlbums,
                status: tournamentObj.status,
                players: tournamentObj.players?.map((p) => p.toString()),
                maxPlayers: tournamentObj.maxPlayers,
                champion: tournamentObj.champion,
                phase: this.calculateTournamentPhase(tournament, matches),
                teams: await this.generateTeamData(tournament),
                matches,
                currentStandings: standings,
                bracketProgression: this.calculateBracketProgression(matches),
                checkInStatus: await this.getCheckInStatus(tournament)
            };
            const response = {
                success: true,
                data: liveTournament,
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    });
    executeTournamentAction = this.asyncHandler(async (req, res, next) => {
        try {
            const { id } = req.params;
            const { action } = req.body;
            const tournament = await Tournament_1.Tournament.findById(id);
            if (!tournament) {
                this.sendError(res, 404, 'Tournament not found');
                return;
            }
            let updatedTournament;
            switch (action) {
                case 'start_registration':
                    updatedTournament = await this.startRegistration(tournament);
                    break;
                case 'close_registration':
                    updatedTournament = await this.closeRegistration(tournament);
                    break;
                case 'start_checkin':
                    updatedTournament = await this.startCheckIn(tournament);
                    break;
                case 'start_round_robin':
                    updatedTournament = await this.startRoundRobin(tournament);
                    break;
                case 'advance_round':
                    updatedTournament = await this.advanceRound(tournament);
                    break;
                case 'start_bracket':
                    updatedTournament = await this.startBracket(tournament);
                    break;
                case 'complete_tournament':
                    updatedTournament = await this.completeTournament(tournament);
                    break;
                case 'reset_tournament':
                    updatedTournament = await this.resetTournament(tournament);
                    break;
                default:
                    this.sendError(res, 400, `Unknown action: ${action}`);
                    return;
            }
            const matches = await Match_1.Match.find({ tournamentId: id })
                .populate('team1.players team2.players', 'name')
                .sort({ roundNumber: 1, matchNumber: 1 });
            const standings = await TournamentResult_1.TournamentResult.find({ tournamentId: id })
                .populate('players', 'name')
                .sort({ 'totalStats.finalRank': 1 });
            const updatedTournamentObj = updatedTournament.toObject();
            const liveTournament = {
                _id: updatedTournamentObj._id.toString(),
                date: updatedTournamentObj.date,
                bodNumber: updatedTournamentObj.bodNumber,
                format: updatedTournamentObj.format,
                location: updatedTournamentObj.location,
                advancementCriteria: updatedTournamentObj.advancementCriteria,
                notes: updatedTournamentObj.notes,
                photoAlbums: updatedTournamentObj.photoAlbums,
                status: updatedTournamentObj.status,
                players: updatedTournamentObj.players?.map((p) => p.toString()),
                maxPlayers: updatedTournamentObj.maxPlayers,
                champion: updatedTournamentObj.champion,
                phase: this.calculateTournamentPhase(updatedTournament, matches),
                teams: await this.generateTeamData(updatedTournament),
                matches,
                currentStandings: standings,
                bracketProgression: this.calculateBracketProgression(matches),
                checkInStatus: await this.getCheckInStatus(updatedTournament)
            };
            const response = {
                success: true,
                data: liveTournament,
                message: `Tournament action '${action}' completed successfully`,
            };
            EventBus_1.eventBus.emitTournament(id, 'action', { action, live: liveTournament });
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    });
    getTournamentMatches = this.asyncHandler(async (req, res, next) => {
        try {
            const { id } = req.params;
            const { round } = req.query;
            const filter = { tournamentId: id };
            if (round && typeof round === 'string') {
                filter.round = round;
            }
            const matches = await Match_1.Match.find(filter)
                .populate('team1.players team2.players', 'name')
                .sort({ roundNumber: 1, matchNumber: 1 });
            const response = {
                success: true,
                data: matches,
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    });
    updateMatch = this.asyncHandler(async (req, res, next) => {
        try {
            const { matchId } = req.params;
            const updateData = req.body;
            const processedUpdateData = this.processMatchUpdate(updateData);
            const matchDoc = await Match_1.Match.findById(matchId).populate('team1.players team2.players', 'name');
            if (!matchDoc) {
                this.sendError(res, 404, 'Match not found');
                return;
            }
            if (processedUpdateData['team1.playerScores'] !== undefined) {
                matchDoc.team1.playerScores = processedUpdateData['team1.playerScores'];
                matchDoc.markModified('team1.playerScores');
            }
            if (processedUpdateData['team2.playerScores'] !== undefined) {
                matchDoc.team2.playerScores = processedUpdateData['team2.playerScores'];
                matchDoc.markModified('team2.playerScores');
            }
            if (processedUpdateData['team1.score'] !== undefined) {
                matchDoc.team1.score = processedUpdateData['team1.score'];
            }
            if (processedUpdateData['team2.score'] !== undefined) {
                matchDoc.team2.score = processedUpdateData['team2.score'];
            }
            if (processedUpdateData.court !== undefined) {
                matchDoc.court = processedUpdateData.court;
            }
            if (processedUpdateData.notes !== undefined) {
                matchDoc.notes = processedUpdateData.notes;
            }
            if (processedUpdateData.startTime) {
                matchDoc.scheduledDate = new Date(processedUpdateData.startTime);
            }
            if (processedUpdateData.endTime) {
                matchDoc.completedDate = new Date(processedUpdateData.endTime);
            }
            const t1Score = matchDoc.team1?.score;
            const t2Score = matchDoc.team2?.score;
            const bothScored = typeof t1Score === 'number' && typeof t2Score === 'number';
            if (bothScored && t1Score !== t2Score) {
                matchDoc.winner = t1Score > t2Score ? 'team1' : 'team2';
                matchDoc.status = 'completed';
            }
            else if (processedUpdateData.status) {
                matchDoc.status = processedUpdateData.status;
            }
            const match = await matchDoc.save();
            if (match.status === 'completed') {
                await this.updateTournamentStatistics(match);
                await LiveStatsService_1.LiveStatsService.updateLiveStats(matchId);
            }
            const response = {
                success: true,
                data: match,
                message: 'Match updated successfully',
            };
            EventBus_1.eventBus.emitTournament(match.tournamentId.toString(), 'match:update', { matchId, update: processedUpdateData });
            try {
                const live = await this.buildLiveTournament(match.tournamentId.toString());
                if (live)
                    EventBus_1.eventBus.emitTournament(match.tournamentId.toString(), 'snapshot', { live });
            }
            catch { }
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    });
    checkInTeam = this.asyncHandler(async (req, res, next) => {
        try {
            const { id } = req.params;
            const { teamId, present = true } = req.body;
            const response = {
                success: true,
                data: { teamId, present, checkInTime: new Date().toISOString() },
                message: `Team ${present ? 'checked in' : 'marked absent'} successfully`,
            };
            EventBus_1.eventBus.emitTournament(id, 'team:checkin', { teamId, present });
            try {
                const live = await this.buildLiveTournament(id);
                if (live)
                    EventBus_1.eventBus.emitTournament(id, 'snapshot', { live });
            }
            catch { }
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    });
    generateMatches = this.asyncHandler(async (req, res, next) => {
        try {
            const { id } = req.params;
            const { round } = req.body;
            const tournament = await Tournament_1.Tournament.findById(id);
            if (!tournament) {
                this.sendError(res, 404, 'Tournament not found');
                return;
            }
            const matches = await this.createMatchesForRound(tournament, round);
            const response = {
                success: true,
                data: matches,
                message: `Matches generated for ${round}`,
            };
            EventBus_1.eventBus.emitTournament(id, 'matches:generated', { round, count: matches.length });
            try {
                const live = await this.buildLiveTournament(id);
                if (live)
                    EventBus_1.eventBus.emitTournament(id, 'snapshot', { live });
            }
            catch { }
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    });
    getLiveStats = this.asyncHandler(async (req, res, next) => {
        try {
            const { id } = req.params;
            const liveStats = await LiveStatsService_1.LiveStatsService.calculateLiveTournamentStats(id);
            if (!liveStats) {
                this.sendError(res, 404, 'Tournament not found or no statistics available');
                return;
            }
            const response = {
                success: true,
                data: liveStats,
                message: 'Live tournament statistics retrieved successfully'
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    });
    confirmCompletedMatches = this.asyncHandler(async (req, res, next) => {
        try {
            const { id } = req.params;
            const { round } = req.query;
            const filter = { tournamentId: id, status: 'completed' };
            if (round)
                filter.round = round;
            const matches = await Match_1.Match.find(filter);
            if (matches.length === 0) {
                const response = { success: true, data: { updated: 0 }, message: 'No completed matches to confirm' };
                res.status(200).json(response);
                return;
            }
            const ids = matches.map(m => m._id);
            await Match_1.Match.updateMany({ _id: { $in: ids } }, { $set: { status: 'confirmed' } });
            for (const m of matches) {
                EventBus_1.eventBus.emitTournament(m.tournamentId.toString(), 'match:confirmed', { matchId: m._id.toString() });
            }
            const live = await this.buildLiveTournament(id);
            if (live)
                EventBus_1.eventBus.emitTournament(id, 'snapshot', { live });
            const response = { success: true, data: { updated: matches.length }, message: 'Completed matches confirmed' };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    });
    getTournamentPlayerStats = this.asyncHandler(async (req, res, next) => {
        try {
            const { id } = req.params;
            const playerStats = await LiveStatsService_1.LiveStatsService.calculatePlayerStatsForTournament(id);
            const response = {
                success: true,
                data: playerStats,
                message: 'Tournament player stats retrieved successfully'
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    });
    streamTournamentEvents = this.asyncHandler(async (req, res, next) => {
        try {
            const { id } = req.params;
            res.status(200);
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('X-Accel-Buffering', 'no');
            const send = (event, data) => {
                res.write(`event: ${event}\n`);
                res.write(`data: ${JSON.stringify(data)}\n\n`);
            };
            try {
                const live = await this.buildLiveTournament(id);
                if (live) {
                    send('snapshot', { success: true, data: live });
                }
                else {
                    send('error', { success: false, error: 'Tournament not found' });
                }
            }
            catch (e) {
                send('error', { success: false, error: 'Failed to build snapshot' });
            }
            const unsubscribe = EventBus_1.eventBus.onTournament(id, (evt) => {
                send('update', evt);
            });
            const heartbeat = setInterval(() => {
                res.write(': ping\n\n');
            }, 25000);
            req.on('close', () => {
                clearInterval(heartbeat);
                unsubscribe();
            });
        }
        catch (error) {
            next(error);
        }
    });
    async buildLiveTournament(id) {
        const tournament = await Tournament_1.Tournament.findById(id).populate('players', 'name');
        if (!tournament)
            return null;
        const matches = await Match_1.Match.find({ tournamentId: id })
            .populate('team1.players team2.players', 'name')
            .sort({ roundNumber: 1, matchNumber: 1 });
        const standings = await TournamentResult_1.TournamentResult.find({ tournamentId: id })
            .populate('players', 'name')
            .sort({ 'totalStats.finalRank': 1 });
        const t = tournament.toObject();
        const liveTournament = {
            _id: t._id.toString(),
            date: t.date,
            bodNumber: t.bodNumber,
            format: t.format,
            location: t.location,
            advancementCriteria: t.advancementCriteria,
            notes: t.notes,
            photoAlbums: t.photoAlbums,
            status: t.status,
            players: t.players?.map((p) => p.toString()),
            maxPlayers: t.maxPlayers,
            champion: t.champion,
            phase: this.calculateTournamentPhase(tournament, matches),
            teams: await this.generateTeamData(tournament),
            matches,
            currentStandings: standings,
            bracketProgression: this.calculateBracketProgression(matches),
            checkInStatus: await this.getCheckInStatus(tournament),
        };
        return liveTournament;
    }
    calculateTournamentPhase(tournament, matches) {
        const completedMatches = matches.filter(m => m.status === 'completed').length;
        const totalMatches = matches.length;
        let phase = 'setup';
        let currentRound = undefined;
        let roundStatus = 'not_started';
        switch (tournament.status) {
            case 'scheduled':
                phase = 'setup';
                break;
            case 'open':
                phase = 'registration';
                break;
            case 'active':
                if (matches.length === 0) {
                    const hasPreselectedPlayers = tournament.players && tournament.players.length > 0;
                    const hasGeneratedTeams = tournament.generatedTeams && tournament.generatedTeams.length > 0;
                    if (hasPreselectedPlayers || hasGeneratedTeams) {
                        phase = 'round_robin';
                        currentRound = 'RR_R1';
                        roundStatus = 'not_started';
                    }
                    else {
                        phase = 'check_in';
                    }
                }
                else {
                    const hasRoundRobinMatches = matches.some(m => (0, match_1.isRoundRobinRound)(m.round));
                    const hasBracketMatches = matches.some(m => ['quarterfinal', 'semifinal', 'final'].includes(m.round));
                    if (hasRoundRobinMatches && !hasBracketMatches) {
                        phase = 'round_robin';
                        currentRound = this.getCurrentRoundRobinRound(matches);
                    }
                    else if (hasBracketMatches) {
                        phase = 'bracket';
                        currentRound = this.getCurrentBracketRound(matches);
                    }
                    roundStatus = completedMatches === totalMatches ? 'completed' :
                        completedMatches > 0 ? 'in_progress' : 'not_started';
                }
                break;
            case 'completed':
                phase = 'completed';
                roundStatus = 'completed';
                break;
        }
        return {
            phase,
            currentRound,
            roundStatus,
            totalMatches,
            completedMatches,
            canAdvance: this.canAdvanceRound(matches, roundStatus)
        };
    }
    getCurrentRoundRobinRound(matches) {
        return 'RR_R1';
    }
    getCurrentBracketRound(matches) {
        return 'QF';
    }
    canAdvanceRound(matches, roundStatus) {
        return roundStatus === 'completed';
    }
    calculateBracketProgression(matches) {
        void matches;
        return {
            quarterFinalists: [],
            semiFinalists: [],
            finalists: [],
            champion: undefined
        };
    }
    async generateTeamData(tournament) {
        try {
            const storedTeams = tournament.generatedTeams || [];
            if (storedTeams.length === 0) {
                console.log('No generated teams found in tournament setup data');
                return [];
            }
            const matches = await Match_1.Match.find({ tournamentId: tournament._id });
            const phase = this.calculateTournamentPhase(tournament, matches);
            const liveTeams = storedTeams.map((storedTeam) => {
                const teamMatches = matches.filter(m => this.teamInMatch(storedTeam.teamId, m));
                const isEliminated = this.isTeamEliminated(storedTeam.teamId, matches, phase.phase);
                const hasAdvanced = this.hasTeamAdvanced(storedTeam.teamId, matches, phase.phase);
                return {
                    teamId: storedTeam.teamId,
                    teamName: storedTeam.teamName,
                    players: storedTeam.players.map((player) => ({
                        playerId: player.playerId,
                        playerName: player.playerName,
                        seed: player.seed,
                        statistics: player.statistics
                    })),
                    combinedSeed: storedTeam.combinedSeed,
                    combinedStatistics: storedTeam.combinedStatistics,
                    status: isEliminated ? 'eliminated' : hasAdvanced ? 'advanced' : 'active',
                    matchesPlayed: teamMatches.filter(m => m.status === 'completed').length,
                    matchesWon: teamMatches.filter(m => m.status === 'completed' && this.isTeamWinner(storedTeam.teamId, m)).length,
                    currentRound: phase.currentRound || 'setup',
                    checkedIn: phase.phase !== 'check_in' ? true : false,
                    present: true
                };
            });
            console.log(`Generated live team data for ${liveTeams.length} teams`);
            return liveTeams;
        }
        catch (error) {
            console.error('Error generating team data:', error);
            return [];
        }
    }
    teamInMatch(teamId, match) {
        return match.team1?.players?.includes(teamId) ||
            match.team2?.players?.includes(teamId) ||
            match.team1?.teamName?.includes(teamId) ||
            match.team2?.teamName?.includes(teamId);
    }
    isTeamEliminated(teamId, matches, phase) {
        if (phase !== 'bracket')
            return false;
        const teamMatches = matches.filter(m => this.teamInMatch(teamId, m) &&
            m.status === 'completed' &&
            ['quarterfinal', 'semifinal', 'final'].includes(m.round));
        return teamMatches.some(m => !this.isTeamWinner(teamId, m));
    }
    hasTeamAdvanced(teamId, matches, phase) {
        if (phase !== 'bracket')
            return false;
        const teamMatches = matches.filter(m => this.teamInMatch(teamId, m) &&
            m.status === 'completed' &&
            ['quarterfinal', 'semifinal'].includes(m.round));
        return teamMatches.some(m => this.isTeamWinner(teamId, m));
    }
    isTeamWinner(teamId, match) {
        if (!match.winner)
            return false;
        if (match.winner === 'team1' && this.teamInMatch(teamId, { team1: match.team1 })) {
            return true;
        }
        if (match.winner === 'team2' && this.teamInMatch(teamId, { team2: match.team2 })) {
            return true;
        }
        return false;
    }
    async getCheckInStatus(tournament) {
        try {
            const teams = tournament.generatedTeams || [];
            const checkInStatus = {};
            teams.forEach(team => {
                checkInStatus[team.teamId] = {
                    checkedIn: tournament.status !== 'open',
                    checkInTime: tournament.status !== 'open' ? new Date().toISOString() : undefined,
                    present: true
                };
            });
            return checkInStatus;
        }
        catch (error) {
            console.error('Error getting check-in status:', error);
            return {};
        }
    }
    async startRegistration(tournament) {
        const hasPreselectedPlayers = tournament.players && tournament.players.length > 0;
        const hasGeneratedTeams = tournament.generatedTeams && tournament.generatedTeams.length > 0;
        if (hasPreselectedPlayers || hasGeneratedTeams) {
            console.log('Players already preselected, skipping registration phase');
            tournament.status = 'active';
            return await tournament.save();
        }
        else {
            tournament.status = 'open';
            return await tournament.save();
        }
    }
    async closeRegistration(tournament) {
        tournament.status = 'active';
        return await tournament.save();
    }
    async startCheckIn(tournament) {
        return tournament;
    }
    async startRoundRobin(tournament) {
        await this.createMatchesForRound(tournament, 'RR_R1');
        tournament.status = 'active';
        return await tournament.save();
    }
    async advanceRound(tournament) {
        try {
            console.log('Advancing tournament to next round');
            const matches = await Match_1.Match.find({ tournamentId: tournament._id });
            const phase = this.calculateTournamentPhase(tournament, matches);
            if (!phase.canAdvance) {
                console.log('Tournament round cannot advance - matches not completed');
                return tournament;
            }
            if (phase.phase === 'round_robin') {
                return await this.advanceRoundRobin(tournament, phase.currentRound);
            }
            else if (phase.phase === 'bracket') {
                return await this.advanceBracketRound(tournament, phase.currentRound);
            }
            return tournament;
        }
        catch (error) {
            console.error('Error advancing round:', error);
            return tournament;
        }
    }
    async advanceRoundRobin(tournament, currentRound) {
        try {
            const nextRound = (0, match_1.getNextRoundRobinRound)(currentRound);
            if (nextRound === 'bracket') {
                console.log('Round robin complete, starting bracket phase');
                await this.calculateRoundRobinStandings(tournament);
                await this.createMatchesForRound(tournament, 'quarterfinal');
                tournament.status = 'active';
                return await tournament.save();
            }
            else {
                console.log(`Advancing to ${nextRound}`);
                await this.createMatchesForRound(tournament, nextRound);
                return tournament;
            }
        }
        catch (error) {
            console.error('Error advancing round robin:', error);
            return tournament;
        }
    }
    async advanceBracketRound(tournament, currentRound) {
        try {
            const nextRound = this.getNextBracketRound(currentRound);
            if (!nextRound) {
                console.log('Tournament complete!');
                tournament.status = 'completed';
                await this.setTournamentChampion(tournament);
                await this.updatePlayerCareerStats(tournament);
                return await tournament.save();
            }
            else {
                console.log(`Advancing to bracket ${nextRound}`);
                const advancingTeams = await this.getBracketAdvancingTeams(tournament, currentRound);
                await this.generateBracketMatchesForRound(tournament, advancingTeams, nextRound);
                return tournament;
            }
        }
        catch (error) {
            console.error('Error advancing bracket round:', error);
            return tournament;
        }
    }
    processMatchUpdate(updateData) {
        const processedData = { ...updateData };
        if (updateData.team1PlayerScores && Array.isArray(updateData.team1PlayerScores)) {
            processedData['team1.playerScores'] = updateData.team1PlayerScores;
            const team1Total = updateData.team1PlayerScores.reduce((sum, player) => {
                return sum + (player.score || 0);
            }, 0);
            processedData['team1.score'] = team1Total;
            delete processedData.team1PlayerScores;
        }
        if (updateData.team2PlayerScores && Array.isArray(updateData.team2PlayerScores)) {
            processedData['team2.playerScores'] = updateData.team2PlayerScores;
            const team2Total = updateData.team2PlayerScores.reduce((sum, player) => {
                return sum + (player.score || 0);
            }, 0);
            processedData['team2.score'] = team2Total;
            delete processedData.team2PlayerScores;
        }
        if (updateData.team1Score !== undefined) {
            processedData['team1.score'] = updateData.team1Score;
            delete processedData.team1Score;
        }
        if (updateData.team2Score !== undefined) {
            processedData['team2.score'] = updateData.team2Score;
            delete processedData.team2Score;
        }
        if (processedData['team1.score'] !== undefined && processedData['team2.score'] !== undefined) {
            const team1Score = processedData['team1.score'];
            const team2Score = processedData['team2.score'];
            if (team1Score > team2Score) {
                processedData.winner = 'team1';
            }
            else if (team2Score > team1Score) {
                processedData.winner = 'team2';
            }
        }
        console.log('Processed match update:', JSON.stringify(processedData, null, 2));
        return processedData;
    }
    getNextBracketRound(currentRound) {
        const roundOrder = ['quarterfinal', 'semifinal', 'final'];
        const currentIndex = currentRound ? roundOrder.indexOf(currentRound) : -1;
        if (currentIndex === -1)
            return 'quarterfinal';
        if (currentIndex >= roundOrder.length - 1)
            return null;
        return roundOrder[currentIndex + 1];
    }
    async calculateRoundRobinStandings(tournament) {
        try {
            const rrMatches = await Match_1.Match.find({
                tournamentId: tournament._id,
                round: { $in: ['RR_R1', 'RR_R2', 'RR_R3'] },
                status: 'completed'
            });
            const teams = tournament.generatedTeams || [];
            const standings = teams.map(team => {
                const teamMatches = rrMatches.filter(m => this.teamInMatch(team.teamId, m));
                const wins = teamMatches.filter(m => this.isTeamWinner(team.teamId, m)).length;
                const losses = teamMatches.length - wins;
                const winPercentage = teamMatches.length > 0 ? wins / teamMatches.length : 0;
                return {
                    ...team,
                    rrWins: wins,
                    rrLosses: losses,
                    rrPlayed: teamMatches.length,
                    rrWinPercentage: winPercentage,
                    qualified: wins >= Math.floor(teamMatches.length / 2)
                };
            });
            standings.sort((a, b) => {
                if (a.rrWinPercentage !== b.rrWinPercentage) {
                    return b.rrWinPercentage - a.rrWinPercentage;
                }
                return a.combinedSeed - b.combinedSeed;
            });
            console.log('Round-robin standings calculated:', standings.length, 'teams');
        }
        catch (error) {
            console.error('Error calculating round-robin standings:', error);
        }
    }
    async getBracketAdvancingTeams(tournament, currentRound) {
        if (!currentRound)
            return [];
        const matches = await Match_1.Match.find({
            tournamentId: tournament._id,
            round: currentRound,
            status: 'completed'
        });
        const advancingTeams = [];
        matches.forEach(match => {
            if (match.winner) {
                const winningTeam = match.winner === 'team1' ? match.team1 : match.team2;
                advancingTeams.push({
                    teamId: `${winningTeam.playerNames.join('_')}`,
                    teamName: winningTeam.playerNames.join(' & '),
                    players: winningTeam.players.map((playerId, index) => ({
                        playerId,
                        playerName: winningTeam.playerNames[index] || 'Unknown',
                        seed: winningTeam.seed
                    })),
                    combinedSeed: winningTeam.seed || 0
                });
            }
        });
        console.log(`${advancingTeams.length} teams advancing from ${currentRound}`);
        return advancingTeams;
    }
    async generateBracketMatchesForRound(tournament, teams, round) {
        const matches = await this.generateBracketMatches(tournament, teams, round, 1);
        await Match_1.Match.insertMany(matches);
        console.log(`Generated ${matches.length} matches for ${round}`);
    }
    async setTournamentChampion(tournament) {
        try {
            const finalMatch = await Match_1.Match.findOne({
                tournamentId: tournament._id,
                round: 'final',
                status: 'completed'
            });
            if (finalMatch && finalMatch.winner) {
                const winningTeam = finalMatch.winner === 'team1' ? finalMatch.team1 : finalMatch.team2;
                tournament.champion = {
                    playerId: winningTeam.players[0],
                    playerName: winningTeam.playerNames.join(' & '),
                };
                console.log(`Tournament champion set: ${tournament.champion.playerName}`);
            }
        }
        catch (error) {
            console.error('Error setting tournament champion:', error);
        }
    }
    async updatePlayerCareerStats(tournament) {
        try {
            console.log(`Updating career statistics for tournament ${tournament._id}`);
            const allMatches = await Match_1.Match.find({
                tournamentId: tournament._id,
                status: 'completed'
            });
            if (allMatches.length === 0) {
                console.log('No completed matches found, skipping career stats update');
                return;
            }
            const teams = tournament.generatedTeams || [];
            if (teams.length === 0) {
                console.log('No teams found in tournament setup');
                return;
            }
            const teamResults = await this.calculateFinalTeamResults(teams, allMatches, tournament);
            for (const teamResult of teamResults) {
                await this.createTournamentResultRecord(tournament, teamResult);
                for (const player of teamResult.team.players) {
                    await this.updateIndividualPlayerStats(player, teamResult, tournament);
                }
            }
            console.log(`Career statistics updated for ${teamResults.length} teams`);
        }
        catch (error) {
            console.error('Error updating career statistics:', error);
        }
    }
    async calculateFinalTeamResults(teams, matches, tournament) {
        const teamResults = [];
        for (const team of teams) {
            const teamMatches = matches.filter(m => this.teamInMatch(team.teamId, m));
            const rrMatches = teamMatches.filter(m => (0, match_1.isRoundRobinRound)(m.round));
            const bracketMatches = teamMatches.filter(m => ['quarterfinal', 'semifinal', 'final'].includes(m.round));
            const rrStats = this.calculateRoundRobinStats(team, rrMatches);
            const bracketStats = this.calculateBracketStats(team, bracketMatches);
            const totalWon = rrStats.rrWon + bracketStats.bracketWon;
            const totalLost = rrStats.rrLost + bracketStats.bracketLost;
            const totalPlayed = totalWon + totalLost;
            const winPercentage = totalPlayed > 0 ? totalWon / totalPlayed : 0;
            const finalRank = this.calculateFinalRank(team, rrStats, bracketStats, teams.length);
            teamResults.push({
                team,
                roundRobinScores: rrStats,
                bracketScores: bracketStats,
                totalStats: {
                    totalWon,
                    totalLost,
                    totalPlayed,
                    winPercentage,
                    finalRank,
                    bodFinish: finalRank,
                    home: tournament.location === 'Home'
                }
            });
        }
        teamResults.sort((a, b) => a.totalStats.finalRank - b.totalStats.finalRank);
        return teamResults;
    }
    calculateRoundRobinStats(team, rrMatches) {
        let rrWon = 0;
        let rrLost = 0;
        const roundScores = {};
        rrMatches.forEach(match => {
            const isWinner = this.isTeamWinner(team.teamId, match);
            if (isWinner)
                rrWon++;
            else
                rrLost++;
            if (match.roundNumber) {
                const roundKey = `round${match.roundNumber}`;
                if (!roundScores[roundKey])
                    roundScores[roundKey] = 0;
                roundScores[roundKey] += isWinner ? 1 : 0;
            }
        });
        return {
            ...roundScores,
            rrWon,
            rrLost,
            rrPlayed: rrWon + rrLost,
            rrWinPercentage: (rrWon + rrLost) > 0 ? rrWon / (rrWon + rrLost) : 0,
            rrRank: 0
        };
    }
    calculateBracketStats(team, bracketMatches) {
        let bracketWon = 0;
        let bracketLost = 0;
        const roundStats = {};
        bracketMatches.forEach(match => {
            const isWinner = this.isTeamWinner(team.teamId, match);
            if (isWinner)
                bracketWon++;
            else
                bracketLost++;
            const roundPrefix = this.getBracketRoundPrefix(match.round);
            if (roundPrefix) {
                if (!roundStats[`${roundPrefix}Won`])
                    roundStats[`${roundPrefix}Won`] = 0;
                if (!roundStats[`${roundPrefix}Lost`])
                    roundStats[`${roundPrefix}Lost`] = 0;
                if (isWinner)
                    roundStats[`${roundPrefix}Won`]++;
                else
                    roundStats[`${roundPrefix}Lost`]++;
            }
        });
        return {
            ...roundStats,
            bracketWon,
            bracketLost,
            bracketPlayed: bracketWon + bracketLost
        };
    }
    getBracketRoundPrefix(round) {
        const roundMap = {
            'quarterfinal': 'qf',
            'semifinal': 'sf',
            'final': 'finals',
            'round-of-16': 'r16'
        };
        return roundMap[round] || null;
    }
    calculateFinalRank(team, rrStats, bracketStats, totalTeams) {
        if (bracketStats.finalsWon > 0)
            return 1;
        if (bracketStats.finalsLost > 0)
            return 2;
        if (bracketStats.sfLost > 0)
            return 3;
        if (bracketStats.qfLost > 0)
            return Math.min(5, totalTeams);
        const rrRank = Math.ceil((1 - rrStats.rrWinPercentage) * totalTeams);
        return Math.max(rrRank, Math.ceil(totalTeams * 0.5));
    }
    async createTournamentResultRecord(tournament, teamResult) {
        try {
            const existingResult = await TournamentResult_1.TournamentResult.findOne({
                tournamentId: tournament._id,
                players: { $all: teamResult.team.players.map((p) => p.playerId) }
            });
            if (existingResult) {
                await TournamentResult_1.TournamentResult.findByIdAndUpdate(existingResult._id, {
                    roundRobinScores: teamResult.roundRobinScores,
                    bracketScores: teamResult.bracketScores,
                    totalStats: teamResult.totalStats,
                    seed: teamResult.team.combinedSeed
                });
            }
            else {
                await TournamentResult_1.TournamentResult.create({
                    tournamentId: tournament._id,
                    players: teamResult.team.players.map((p) => p.playerId),
                    division: tournament.format || 'M',
                    seed: teamResult.team.combinedSeed,
                    roundRobinScores: teamResult.roundRobinScores,
                    bracketScores: teamResult.bracketScores,
                    totalStats: teamResult.totalStats
                });
            }
        }
        catch (error) {
            console.error('Error creating tournament result record:', error);
        }
    }
    async updateIndividualPlayerStats(player, teamResult, tournament) {
        try {
            const existingPlayer = await Player_1.Player.findById(player.playerId);
            if (!existingPlayer) {
                console.log(`Player not found: ${player.playerId}`);
                return;
            }
            const updatedStats = {
                bodsPlayed: existingPlayer.bodsPlayed + 1,
                gamesPlayed: existingPlayer.gamesPlayed + teamResult.totalStats.totalPlayed,
                gamesWon: existingPlayer.gamesWon + teamResult.totalStats.totalWon,
                bestResult: Math.min(existingPlayer.bestResult || 999, teamResult.totalStats.bodFinish),
                totalChampionships: existingPlayer.totalChampionships + (teamResult.totalStats.bodFinish === 1 ? 1 : 0),
                winningPercentage: 0,
                avgFinish: 0,
                divisionChampionships: existingPlayer.divisionChampionships || 0,
                individualChampionships: existingPlayer.individualChampionships || 0
            };
            updatedStats.winningPercentage = updatedStats.gamesPlayed > 0
                ? updatedStats.gamesWon / updatedStats.gamesPlayed
                : 0;
            const previousFinishTotal = (existingPlayer.avgFinish || 0) * (existingPlayer.bodsPlayed || 0);
            const newFinishTotal = previousFinishTotal + teamResult.totalStats.bodFinish;
            updatedStats.avgFinish = newFinishTotal / updatedStats.bodsPlayed;
            if (teamResult.totalStats.bodFinish === 1) {
                if (tournament.format === 'M' || tournament.format === 'W') {
                    updatedStats.divisionChampionships = existingPlayer.divisionChampionships + 1;
                }
                else {
                    updatedStats.individualChampionships = existingPlayer.individualChampionships + 1;
                }
            }
            await Player_1.Player.findByIdAndUpdate(player.playerId, updatedStats);
            console.log(`Updated career stats for player ${player.playerName}`);
        }
        catch (error) {
            console.error(`Error updating player stats for ${player.playerName}:`, error);
        }
    }
    async startBracket(tournament) {
        await this.createMatchesForRound(tournament, 'quarterfinal');
        return tournament;
    }
    async completeTournament(tournament) {
        try {
            tournament.status = 'completed';
            await this.setTournamentChampion(tournament);
            await this.updatePlayerCareerStats(tournament);
        }
        catch (err) {
            console.error('Error finalizing tournament stats on completion:', err);
        }
        return await tournament.save();
    }
    async resetTournament(tournament) {
        await Match_1.Match.deleteMany({ tournamentId: tournament._id });
        tournament.status = 'scheduled';
        return await tournament.save();
    }
    async createMatchesForRound(tournament, round) {
        try {
            await Match_1.Match.deleteMany({
                tournamentId: tournament._id,
                round: round
            });
            const teams = tournament.generatedTeams || [];
            if (teams.length === 0) {
                throw new Error('No teams found in tournament setup data');
            }
            let matches = [];
            let matchNumber = 1;
            if ((0, match_1.isRoundRobinRound)(round)) {
                matches = await this.generateRoundRobinMatches(tournament, teams, round, matchNumber);
            }
            else {
                matches = await this.generateBracketMatches(tournament, teams, round, matchNumber);
            }
            const createdMatches = await Match_1.Match.insertMany(matches);
            console.log(`Created ${createdMatches.length} matches for ${round}`);
            return createdMatches;
        }
        catch (error) {
            console.error(`Error creating matches for round ${round}:`, error);
            throw error;
        }
    }
    async generateRoundRobinMatches(tournament, teams, round, startMatchNumber) {
        const matches = [];
        let matchNumber = startMatchNumber;
        console.log('Team structure sample:', JSON.stringify(teams[0], null, 2));
        for (let i = 0; i < teams.length; i++) {
            for (let j = i + 1; j < teams.length; j++) {
                const team1 = teams[i];
                const team2 = teams[j];
                const team1PlayerNames = team1.players.map((p) => {
                    return p.playerName || p.name || `Player ${p.playerId || p._id || p.id}`;
                });
                const team2PlayerNames = team2.players.map((p) => {
                    return p.playerName || p.name || `Player ${p.playerId || p._id || p.id}`;
                });
                const match = {
                    tournamentId: tournament._id,
                    matchNumber: matchNumber++,
                    round: round,
                    roundNumber: (0, match_1.getRoundNumber)(round),
                    team1: {
                        players: team1.players.map((p) => p.playerId || p._id || p.id),
                        playerNames: team1PlayerNames,
                        score: 0,
                        seed: team1.combinedSeed
                    },
                    team2: {
                        players: team2.players.map((p) => p.playerId || p._id || p.id),
                        playerNames: team2PlayerNames,
                        score: 0,
                        seed: team2.combinedSeed
                    },
                    status: 'scheduled',
                    scheduledDate: new Date()
                };
                console.log(`Match ${matchNumber - 1}: ${team1PlayerNames.join(' & ')} vs ${team2PlayerNames.join(' & ')}`);
                matches.push(match);
            }
        }
        console.log(`Generated ${matches.length} round-robin matches`);
        return matches;
    }
    async generateBracketMatches(tournament, teams, round, startMatchNumber) {
        const matches = [];
        let matchNumber = startMatchNumber;
        let bracketTeams = teams;
        bracketTeams.sort((a, b) => a.combinedSeed - b.combinedSeed);
        const roundTeamCounts = {
            'quarterfinal': 8,
            'semifinal': 4,
            'final': 2,
            'third-place': 4
        };
        const requiredTeams = roundTeamCounts[round] || bracketTeams.length;
        const activeTeams = bracketTeams.slice(0, requiredTeams);
        if (round === 'quarterfinal') {
            const pairings = [
                [0, 7], [3, 4], [2, 5], [1, 6]
            ];
            for (const [i, j] of pairings) {
                if (activeTeams[i] && activeTeams[j]) {
                    matches.push(this.createBracketMatch(tournament, activeTeams[i], activeTeams[j], matchNumber++, round, 1));
                }
            }
        }
        else if (round === 'semifinal') {
            for (let i = 0; i < activeTeams.length; i += 2) {
                if (activeTeams[i] && activeTeams[i + 1]) {
                    matches.push(this.createBracketMatch(tournament, activeTeams[i], activeTeams[i + 1], matchNumber++, round, 2));
                }
            }
        }
        else if (round === 'final') {
            if (activeTeams.length >= 2) {
                matches.push(this.createBracketMatch(tournament, activeTeams[0], activeTeams[1], matchNumber++, round, 3));
            }
        }
        console.log(`Generated ${matches.length} ${round} matches`);
        return matches;
    }
    createBracketMatch(tournament, team1, team2, matchNumber, round, roundNumber) {
        return {
            tournamentId: tournament._id,
            matchNumber,
            round,
            roundNumber,
            team1: {
                players: team1.players.map((p) => p.playerId),
                playerNames: team1.players.map((p) => p.playerName),
                score: 0,
                seed: team1.combinedSeed
            },
            team2: {
                players: team2.players.map((p) => p.playerId),
                playerNames: team2.players.map((p) => p.playerName),
                score: 0,
                seed: team2.combinedSeed
            },
            status: 'scheduled',
            scheduledDate: new Date()
        };
    }
    async updateTournamentStatistics(match) {
        try {
            console.log(`Updating tournament statistics for match ${match.matchNumber}`);
            const tournament = await Tournament_1.Tournament.findById(match.tournamentId);
            if (!tournament) {
                console.error('Tournament not found for statistics update');
                return;
            }
            if (!match.winner || match.team1.score === undefined || match.team2.score === undefined) {
                console.log('Match does not have winner or scores, skipping statistics update');
                return;
            }
            const winningTeam = match.winner === 'team1' ? match.team1 : match.team2;
            const losingTeam = match.winner === 'team1' ? match.team2 : match.team1;
            await this.updateTeamTournamentResult(tournament, winningTeam, match, true);
            await this.updateTeamTournamentResult(tournament, losingTeam, match, false);
            if (['quarterfinal', 'semifinal', 'final'].includes(match.round)) {
                await this.updateBracketProgression(tournament, match);
            }
            console.log(`Statistics updated successfully for match ${match.matchNumber}`);
        }
        catch (error) {
            console.error('Error updating tournament statistics:', error);
        }
    }
    async updateTeamTournamentResult(tournament, team, match, won) {
        try {
            let result = await TournamentResult_1.TournamentResult.findOne({
                tournamentId: tournament._id,
                $or: [
                    { 'players': { $in: team.players } },
                    { teamName: team.playerNames.join(' & ') }
                ]
            });
            if (!result) {
                result = new TournamentResult_1.TournamentResult({
                    tournamentId: tournament._id,
                    players: team.players,
                    teamName: team.playerNames.join(' & '),
                    seed: team.seed || 0,
                    division: tournament.format,
                    roundRobinScores: {
                        round1: 0, round2: 0, round3: 0,
                        rrWon: 0, rrLost: 0, rrPlayed: 0, rrWinPercentage: 0
                    },
                    bracketScores: {
                        r16Won: 0, r16Lost: 0, qfWon: 0, qfLost: 0,
                        sfWon: 0, sfLost: 0, finalsWon: 0, finalsLost: 0,
                        bracketWon: 0, bracketLost: 0, bracketPlayed: 0
                    },
                    totalStats: {
                        totalWon: 0, totalLost: 0, totalPlayed: 0,
                        winPercentage: 0, bodFinish: 0
                    }
                });
            }
            if ((0, match_1.isRoundRobinRound)(match.round)) {
                result.roundRobinScores.rrPlayed += 1;
                if (won) {
                    result.roundRobinScores.rrWon += 1;
                }
                else {
                    result.roundRobinScores.rrLost += 1;
                }
                result.roundRobinScores.rrWinPercentage =
                    result.roundRobinScores.rrPlayed > 0 ?
                        result.roundRobinScores.rrWon / result.roundRobinScores.rrPlayed : 0;
            }
            else {
                result.bracketScores.bracketPlayed += 1;
                if (won) {
                    result.bracketScores.bracketWon += 1;
                    this.updateBracketRoundScore(result, match.round, 'won');
                }
                else {
                    result.bracketScores.bracketLost += 1;
                    this.updateBracketRoundScore(result, match.round, 'lost');
                }
            }
            result.totalStats.totalPlayed =
                result.roundRobinScores.rrPlayed + result.bracketScores.bracketPlayed;
            result.totalStats.totalWon =
                result.roundRobinScores.rrWon + result.bracketScores.bracketWon;
            result.totalStats.totalLost =
                result.roundRobinScores.rrLost + result.bracketScores.bracketLost;
            result.totalStats.winPercentage =
                result.totalStats.totalPlayed > 0 ?
                    result.totalStats.totalWon / result.totalStats.totalPlayed : 0;
            await result.save();
            const teamName = result.populated('players') ?
                result.players.map((p) => p.name || p.toString()).join(' & ') :
                result.players.map((p) => p.toString()).join(' & ');
            console.log(`Updated tournament result for team: ${teamName}`);
        }
        catch (error) {
            console.error('Error updating team tournament result:', error);
        }
    }
    updateBracketRoundScore(result, round, outcome) {
        const roundMapping = {
            'round-of-16': 'r16',
            'quarterfinal': 'qf',
            'semifinal': 'sf',
            'final': 'finals'
        };
        const roundPrefix = roundMapping[round];
        if (roundPrefix) {
            const field = `${roundPrefix}${outcome === 'won' ? 'Won' : 'Lost'}`;
            if (result.bracketScores[field] !== undefined) {
                result.bracketScores[field] += 1;
            }
        }
    }
    async updateBracketProgression(tournament, match) {
        console.log(`Bracket progression: ${match.round} winner is team ${match.winner}`);
    }
}
exports.LiveTournamentController = LiveTournamentController;
exports.liveTournamentController = new LiveTournamentController();
//# sourceMappingURL=LiveTournamentController.js.map