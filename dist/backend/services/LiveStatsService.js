"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveStatsService = void 0;
const Tournament_1 = require("../models/Tournament");
const Match_1 = require("../models/Match");
const match_1 = require("../types/match");
class LiveStatsService {
    static async calculateLiveTournamentStats(tournamentId) {
        try {
            const tournament = await Tournament_1.Tournament.findById(tournamentId);
            if (!tournament)
                return null;
            const matches = await Match_1.Match.find({ tournamentId });
            const teams = tournament.generatedTeams || [];
            const teamStandings = await this.calculateTeamStandings(teams, matches, tournamentId);
            const matchSummary = this.calculateMatchSummary(matches);
            const { currentPhase, currentRound } = this.determineCurrentPhase(matches, tournament.status);
            return {
                tournamentId,
                totalTeams: teams.length,
                totalMatches: matches.length,
                completedMatches: matches.filter(m => m.status === 'completed').length,
                inProgressMatches: matches.filter(m => m.status === 'in-progress').length,
                currentPhase,
                currentRound,
                teamStandings: teamStandings.sort((a, b) => {
                    if (a.winPercentage !== b.winPercentage) {
                        return b.winPercentage - a.winPercentage;
                    }
                    return b.pointDifferential - a.pointDifferential;
                }).map((team, index) => ({ ...team, currentRank: index + 1 })),
                matchSummary,
                lastUpdated: new Date()
            };
        }
        catch (error) {
            console.error('Error calculating live tournament stats:', error);
            return null;
        }
    }
    static async calculateTeamStandings(teams, matches, tournamentId) {
        const teamStats = [];
        for (const team of teams) {
            const teamMatches = matches.filter(match => this.isTeamInMatch(team.teamId, match) ||
                this.isTeamInMatchByName(team.teamName, match));
            const completedMatches = teamMatches.filter(m => m.status === 'completed');
            const wonMatches = completedMatches.filter(m => this.isTeamWinner(team, m));
            const rrMatches = completedMatches.filter(m => (0, match_1.isRoundRobinRound)(m.round));
            const bracketMatches = completedMatches.filter(m => ['quarterfinal', 'semifinal', 'final'].includes(m.round));
            const rrWon = rrMatches.filter(m => this.isTeamWinner(team, m)).length;
            const bracketWon = bracketMatches.filter(m => this.isTeamWinner(team, m)).length;
            const { pointsScored, pointsAllowed } = this.calculateTeamPoints(team, completedMatches);
            const pointDifferential = pointsScored - pointsAllowed;
            const eliminated = bracketMatches.some(m => m.status === 'completed' && !this.isTeamWinner(team, m));
            const advancedTo = this.getTeamAdvancement(team, bracketMatches);
            const performanceGrade = this.calculatePerformanceGrade(completedMatches.length > 0 ? wonMatches.length / completedMatches.length : 0, pointDifferential, completedMatches.length);
            teamStats.push({
                teamId: team.teamId,
                teamName: team.teamName,
                players: team.players.map((p) => ({
                    playerId: p.playerId,
                    playerName: p.playerName
                })),
                matchesPlayed: completedMatches.length,
                matchesWon: wonMatches.length,
                matchesLost: completedMatches.length - wonMatches.length,
                winPercentage: completedMatches.length > 0 ? wonMatches.length / completedMatches.length : 0,
                pointsScored,
                pointsAllowed,
                pointDifferential,
                currentRank: 0,
                roundRobinRecord: {
                    played: rrMatches.length,
                    won: rrWon,
                    lost: rrMatches.length - rrWon,
                    winPercentage: rrMatches.length > 0 ? rrWon / rrMatches.length : 0
                },
                bracketRecord: {
                    played: bracketMatches.length,
                    won: bracketWon,
                    lost: bracketMatches.length - bracketWon,
                    eliminated,
                    advancedTo
                },
                performanceGrade
            });
        }
        return teamStats;
    }
    static isTeamInMatch(teamId, match) {
        return match.team1?.players?.some((p) => p.toString().includes(teamId)) ||
            match.team2?.players?.some((p) => p.toString().includes(teamId));
    }
    static isTeamInMatchByName(teamName, match) {
        return match.team1?.playerNames?.join(' & ') === teamName ||
            match.team2?.playerNames?.join(' & ') === teamName;
    }
    static isTeamWinner(team, match) {
        if (!match.winner)
            return false;
        const winningTeam = match.winner === 'team1' ? match.team1 : match.team2;
        return winningTeam.playerNames?.join(' & ') === team.teamName;
    }
    static calculateTeamPoints(team, matches) {
        let pointsScored = 0;
        let pointsAllowed = 0;
        matches.forEach(match => {
            if (match.team1.playerNames?.join(' & ') === team.teamName) {
                pointsScored += match.team1.score || 0;
                pointsAllowed += match.team2.score || 0;
            }
            else if (match.team2.playerNames?.join(' & ') === team.teamName) {
                pointsScored += match.team2.score || 0;
                pointsAllowed += match.team1.score || 0;
            }
        });
        return { pointsScored, pointsAllowed };
    }
    static getTeamAdvancement(team, bracketMatches) {
        if (bracketMatches.length === 0)
            return undefined;
        const lastMatch = bracketMatches
            .filter(m => m.status === 'completed' && this.isTeamWinner(team, m))
            .sort((a, b) => new Date(b.completedDate || 0).getTime() - new Date(a.completedDate || 0).getTime())[0];
        if (!lastMatch)
            return undefined;
        const advancementMap = {
            'quarterfinal': 'Semi Finals',
            'semifinal': 'Championship',
            'final': 'Champion'
        };
        return advancementMap[lastMatch.round];
    }
    static calculatePerformanceGrade(winPercentage, pointDiff, gamesPlayed) {
        if (gamesPlayed === 0)
            return 'N/A';
        let score = winPercentage * 100;
        if (pointDiff > 0)
            score += Math.min(pointDiff / gamesPlayed, 10);
        if (score >= 80)
            return 'A';
        if (score >= 70)
            return 'B';
        if (score >= 60)
            return 'C';
        if (score >= 50)
            return 'D';
        return 'F';
    }
    static calculateMatchSummary(matches) {
        const roundRobinMatches = matches.filter(m => m.round === 'round-robin');
        const bracketMatches = matches.filter(m => ['quarterfinal', 'semifinal', 'final'].includes(m.round));
        return {
            roundRobin: {
                total: roundRobinMatches.length,
                completed: roundRobinMatches.filter(m => m.status === 'completed').length,
                inProgress: roundRobinMatches.filter(m => m.status === 'in_progress').length
            },
            bracket: {
                total: bracketMatches.length,
                completed: bracketMatches.filter(m => m.status === 'completed').length,
                inProgress: bracketMatches.filter(m => m.status === 'in_progress').length
            }
        };
    }
    static determineCurrentPhase(matches, tournamentStatus) {
        if (tournamentStatus === 'completed') {
            return { currentPhase: 'completed' };
        }
        const rrMatches = matches.filter(m => m.round === 'round-robin');
        const bracketMatches = matches.filter(m => ['quarterfinal', 'semifinal', 'final'].includes(m.round));
        if (bracketMatches.length > 0) {
            const activeRound = bracketMatches.find(m => m.status === 'in_progress')?.round ||
                bracketMatches.filter(m => m.status === 'scheduled')[0]?.round ||
                'final';
            return { currentPhase: 'bracket', currentRound: activeRound };
        }
        if (rrMatches.length > 0) {
            return { currentPhase: 'round_robin', currentRound: 'round-robin' };
        }
        return { currentPhase: 'setup' };
    }
    static async updateLiveStats(matchId) {
        try {
            const match = await Match_1.Match.findById(matchId);
            if (!match || match.status !== 'completed')
                return;
            console.log(`Updating live stats for tournament ${match.tournamentId}`);
            try {
                const { eventBus } = await Promise.resolve().then(() => __importStar(require('./EventBus')));
                eventBus.emitTournament(match.tournamentId.toString(), 'stats:update', { matchId });
            }
            catch { }
        }
        catch (error) {
            console.error('Error updating live stats:', error);
        }
    }
    static async calculatePlayerStatsForTournament(tournamentId) {
        const mongoose = await Promise.resolve().then(() => __importStar(require('mongoose')));
        const tid = new mongoose.Types.ObjectId(tournamentId);
        const matches = await Match_1.Match.aggregate([
            { $match: { tournamentId: tid } },
            {
                $project: {
                    winner: 1,
                    team1: 1,
                    team2: 1,
                    playerScoresCombined: { $concatArrays: [
                            { $ifNull: ['$team1.playerScores', []] },
                            { $ifNull: ['$team2.playerScores', []] }
                        ] }
                }
            },
            { $unwind: '$playerScoresCombined' },
            {
                $addFields: {
                    scoredOnTeam: {
                        $cond: [
                            { $in: ['$playerScoresCombined.playerId', { $ifNull: ['$team1.playerScores.playerId', []] }] },
                            'team1',
                            'team2'
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: '$playerScoresCombined.playerId',
                    playerName: { $last: '$playerScoresCombined.playerName' },
                    totalPoints: { $sum: { $ifNull: ['$playerScoresCombined.score', 0] } },
                    matchesWithPoints: { $sum: 1 },
                    wins: { $sum: { $cond: [{ $eq: ['$winner', '$scoredOnTeam'] }, 1, 0] } },
                    losses: { $sum: { $cond: [{ $and: [{ $ne: ['$winner', null] }, { $ne: ['$winner', '$scoredOnTeam'] }] }, 1, 0] } }
                }
            },
            { $sort: { totalPoints: -1, wins: -1 } }
        ]);
        return matches.map((m) => ({
            playerId: m._id.toString(),
            playerName: m.playerName,
            totalPoints: m.totalPoints || 0,
            matchesWithPoints: m.matchesWithPoints || 0,
            wins: m.wins || 0,
            losses: m.losses || 0,
        }));
    }
}
exports.LiveStatsService = LiveStatsService;
//# sourceMappingURL=LiveStatsService.js.map