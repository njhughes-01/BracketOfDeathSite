import { Types } from 'mongoose';
import { Player } from '../models/Player';
import { TournamentResult } from '../models/TournamentResult';
import { IPlayer } from '../types/player';

export interface PlayerSeed {
  playerId: Types.ObjectId;
  player: IPlayer;
  seed: number;
  score: number;
  reasoning: string;
}

export interface SeedingResult {
  success: boolean;
  message: string;
  seeds?: PlayerSeed[];
}

export class TournamentSeedingService {
  /**
   * Calculate seeding for tournament players based on historical performance
   */
  static async calculateSeeding(
    playerIds: string[],
    tournamentFormat: string
  ): Promise<SeedingResult> {
    try {
      const objectIds = playerIds.map(id => new Types.ObjectId(id));
      
      // Get players with their statistics
      const players = await Player.find({ _id: { $in: objectIds } });
      
      if (players.length !== playerIds.length) {
        return { success: false, message: 'Some players not found' };
      }

      // Calculate seeds for each player
      const playerSeeds: PlayerSeed[] = [];

      for (const player of players) {
        const score = await this.calculatePlayerScore(player, tournamentFormat);
        playerSeeds.push({
          playerId: player._id,
          player,
          seed: 0, // Will be assigned after sorting
          score,
          reasoning: this.generateReasoningText(player, score),
        });
      }

      // Sort by score (highest first) and assign seeds
      playerSeeds.sort((a, b) => b.score - a.score);
      playerSeeds.forEach((seed, index) => {
        seed.seed = index + 1;
      });

      return {
        success: true,
        message: `Seeding calculated for ${players.length} players`,
        seeds: playerSeeds,
      };
    } catch (error) {
      console.error('Seeding calculation error:', error);
      return { success: false, message: 'Failed to calculate seeding' };
    }
  }

  /**
   * Calculate a score for a player based on their historical performance
   */
  private static async calculatePlayerScore(
    player: IPlayer, 
    tournamentFormat: string
  ): Promise<number> {
    let score = 0;

    // Base score from win percentage (0-100 points)
    const winPercentage = player.winningPercentage || 0;
    score += winPercentage * 100;

    // Championship bonus (25 points per championship)
    const championships = player.totalChampionships || 0;
    score += championships * 25;

    // Recent performance bonus (based on average finish)
    const avgFinish = player.avgFinish || 99; // Default to poor finish if unknown
    const finishBonus = Math.max(0, (10 - avgFinish) * 5); // Better finish = higher bonus
    score += finishBonus;

    // Experience bonus (1 point per tournament played, max 50)
    const experience = Math.min(50, player.bodsPlayed || 0);
    score += experience;

    // Format-specific adjustments
    score = this.applyFormatAdjustments(score, player, tournamentFormat);

    // New player handling (if very low stats, give neutral score)
    if ((player.bodsPlayed || 0) < 2) {
      score = 50; // Neutral score for new players
    }

    return Math.round(score);
  }

  /**
   * Apply format-specific adjustments to the base score
   */
  private static applyFormatAdjustments(
    baseScore: number,
    player: IPlayer,
    format: string
  ): number {
    let adjustedScore = baseScore;

    // Format-specific bonuses could be added here
    // For now, we'll use the general statistics
    // In the future, we could track format-specific performance

    switch (format) {
      case 'M':
      case "Men's Singles":
        // Men's format adjustments
        break;
      case 'W':
      case "Women's Doubles":
        // Women's format adjustments
        break;
      case 'Mixed':
      case 'Mixed Doubles':
        // Mixed format adjustments - maybe favor players with good partnership history
        break;
      default:
        // No adjustment for other formats
        break;
    }

    return adjustedScore;
  }

  /**
   * Generate human-readable reasoning for seeding position
   */
  private static generateReasoningText(player: IPlayer, score: number): string {
    const parts: string[] = [];

    const winPct = player.winningPercentage || 0;
    const championships = player.totalChampionships || 0;
    const avgFinish = player.avgFinish || 99;
    const tournamentsPlayed = player.bodsPlayed || 0;

    if (tournamentsPlayed < 2) {
      return 'New player - neutral seeding';
    }

    if (winPct > 70) {
      parts.push('excellent win rate');
    } else if (winPct > 50) {
      parts.push('good win rate');
    } else if (winPct > 30) {
      parts.push('moderate win rate');
    }

    if (championships > 0) {
      parts.push(`${championships} championship${championships > 1 ? 's' : ''}`);
    }

    if (avgFinish <= 3) {
      parts.push('consistently high finishes');
    } else if (avgFinish <= 6) {
      parts.push('solid tournament finishes');
    }

    if (tournamentsPlayed >= 10) {
      parts.push('extensive experience');
    } else if (tournamentsPlayed >= 5) {
      parts.push('good experience');
    }

    return parts.length > 0 
      ? parts.join(', ') 
      : 'based on available statistics';
  }

  /**
   * Create balanced bracket pairing suggestions
   */
  static async generateBracketPairings(seeds: PlayerSeed[]): Promise<{
    success: boolean;
    message: string;
    pairings?: Array<{ team1: PlayerSeed; team2: PlayerSeed; round: string }>;
  }> {
    try {
      if (seeds.length < 2) {
        return { success: false, message: 'Need at least 2 players for bracket' };
      }

      // Ensure we have a power of 2 number of players
      const bracketSize = Math.pow(2, Math.ceil(Math.log2(seeds.length)));
      const pairings = [];

      // Create first round pairings using traditional seeding
      // Seed 1 vs lowest seed, seed 2 vs second lowest, etc.
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

      // Handle odd number of players (bye for highest seed)
      if (sortedSeeds.length % 2 === 1) {
        // Top seed gets a bye - will be handled in bracket generation
      }

      return {
        success: true,
        message: `Generated ${pairings.length} bracket pairings`,
        pairings,
      };
    } catch (error) {
      console.error('Bracket pairing error:', error);
      return { success: false, message: 'Failed to generate bracket pairings' };
    }
  }

  /**
   * Get seeding preview for tournament
   */
  static async getSeedingPreview(
    playerIds: string[],
    tournamentFormat: string
  ): Promise<{
    success: boolean;
    message: string;
    preview?: {
      totalPlayers: number;
      bracketSize: number;
      seeds: PlayerSeed[];
      needsByes: boolean;
      byeCount: number;
    };
  }> {
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
    } catch (error) {
      console.error('Seeding preview error:', error);
      return { success: false, message: 'Failed to generate seeding preview' };
    }
  }
}

export default TournamentSeedingService;