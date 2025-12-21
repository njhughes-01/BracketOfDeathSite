"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TournamentSeedingService = void 0;
const mongoose_1 = require("mongoose");
const Player_1 = require("../models/Player");
class TournamentSeedingService {
    static async calculateSeeding(playerIds, tournamentFormat) {
        try {
            const objectIds = playerIds.map(id => new mongoose_1.Types.ObjectId(id));
            const players = await Player_1.Player.find({ _id: { $in: objectIds } });
            if (players.length !== playerIds.length) {
                return { success: false, message: 'Some players not found' };
            }
            const playerSeeds = [];
            for (const player of players) {
                const score = await this.calculatePlayerScore(player, tournamentFormat);
                playerSeeds.push({
                    playerId: player._id,
                    player,
                    seed: 0,
                    score,
                    reasoning: this.generateReasoningText(player, score),
                });
            }
            playerSeeds.sort((a, b) => b.score - a.score);
            playerSeeds.forEach((seed, index) => {
                seed.seed = index + 1;
            });
            return {
                success: true,
                message: `Seeding calculated for ${players.length} players`,
                seeds: playerSeeds,
            };
        }
        catch (error) {
            console.error('Seeding calculation error:', error);
            return { success: false, message: 'Failed to calculate seeding' };
        }
    }
    static async calculatePlayerScore(player, tournamentFormat) {
        let score = 0;
        const winPercentage = player.winningPercentage || 0;
        score += winPercentage * 100;
        const championships = player.totalChampionships || 0;
        score += championships * 25;
        const avgFinish = player.avgFinish || 99;
        const finishBonus = Math.max(0, (10 - avgFinish) * 5);
        score += finishBonus;
        const experience = Math.min(50, player.bodsPlayed || 0);
        score += experience;
        score = this.applyFormatAdjustments(score, player, tournamentFormat);
        if ((player.bodsPlayed || 0) < 2) {
            score = 50;
        }
        return Math.round(score);
    }
    static applyFormatAdjustments(baseScore, player, format) {
        let adjustedScore = baseScore;
        switch (format) {
            case 'M':
            case "Men's Singles":
                break;
            case 'W':
            case "Women's Doubles":
                break;
            case 'Mixed':
            case 'Mixed Doubles':
                break;
            default:
                break;
        }
        return adjustedScore;
    }
    static generateReasoningText(player, score) {
        const parts = [];
        const winPct = player.winningPercentage || 0;
        const championships = player.totalChampionships || 0;
        const avgFinish = player.avgFinish || 99;
        const tournamentsPlayed = player.bodsPlayed || 0;
        if (tournamentsPlayed < 2) {
            return 'New player - neutral seeding';
        }
        if (winPct > 70) {
            parts.push('excellent win rate');
        }
        else if (winPct > 50) {
            parts.push('good win rate');
        }
        else if (winPct > 30) {
            parts.push('moderate win rate');
        }
        if (championships > 0) {
            parts.push(`${championships} championship${championships > 1 ? 's' : ''}`);
        }
        if (avgFinish <= 3) {
            parts.push('consistently high finishes');
        }
        else if (avgFinish <= 6) {
            parts.push('solid tournament finishes');
        }
        if (tournamentsPlayed >= 10) {
            parts.push('extensive experience');
        }
        else if (tournamentsPlayed >= 5) {
            parts.push('good experience');
        }
        return parts.length > 0
            ? parts.join(', ')
            : 'based on available statistics';
    }
    static async generateBracketPairings(seeds) {
        try {
            if (seeds.length < 2) {
                return { success: false, message: 'Need at least 2 players for bracket' };
            }
            const bracketSize = Math.pow(2, Math.ceil(Math.log2(seeds.length)));
            const pairings = [];
            const sortedSeeds = [...seeds].sort((a, b) => a.seed - b.seed);
            for (let i = 0; i < Math.floor(sortedSeeds.length / 2); i++) {
                const highSeed = sortedSeeds[i];
                const lowSeed = sortedSeeds[sortedSeeds.length - 1 - i];
                if (highSeed && lowSeed) {
                    pairings.push({
                        team1: highSeed,
                        team2: lowSeed,
                        round: 'first',
                    });
                }
            }
            if (sortedSeeds.length % 2 === 1) {
            }
            return {
                success: true,
                message: `Generated ${pairings.length} bracket pairings`,
                pairings,
            };
        }
        catch (error) {
            console.error('Bracket pairing error:', error);
            return { success: false, message: 'Failed to generate bracket pairings' };
        }
    }
    static async getSeedingPreview(playerIds, tournamentFormat) {
        try {
            const seedingResult = await this.calculateSeeding(playerIds, tournamentFormat);
            if (!seedingResult.success || !seedingResult.seeds) {
                return { success: false, message: seedingResult.message };
            }
            const totalPlayers = seedingResult.seeds.length;
            const bracketSize = Math.pow(2, Math.ceil(Math.log2(totalPlayers)));
            const byeCount = bracketSize - totalPlayers;
            return {
                success: true,
                message: 'Seeding preview generated',
                preview: {
                    totalPlayers,
                    bracketSize,
                    seeds: seedingResult.seeds,
                    needsByes: byeCount > 0,
                    byeCount,
                },
            };
        }
        catch (error) {
            console.error('Seeding preview error:', error);
            return { success: false, message: 'Failed to generate seeding preview' };
        }
    }
}
exports.TournamentSeedingService = TournamentSeedingService;
exports.default = TournamentSeedingService;
//# sourceMappingURL=TournamentSeedingService.js.map