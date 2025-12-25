import { Types } from "mongoose";
import { IPlayer } from "../types/player";
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
export declare class TournamentSeedingService {
    /**
     * Calculate seeding for tournament players based on historical performance
     */
    static calculateSeeding(playerIds: string[], tournamentFormat: string): Promise<SeedingResult>;
    /**
     * Calculate a score for a player based on their historical performance
     */
    private static calculatePlayerScore;
    /**
     * Apply format-specific adjustments to the base score
     */
    private static applyFormatAdjustments;
    /**
     * Generate human-readable reasoning for seeding position
     */
    private static generateReasoningText;
    /**
     * Create balanced bracket pairing suggestions
     */
    static generateBracketPairings(seeds: PlayerSeed[]): Promise<{
        success: boolean;
        message: string;
        pairings?: Array<{
            team1: PlayerSeed;
            team2: PlayerSeed;
            round: string;
        }>;
    }>;
    /**
     * Get seeding preview for tournament
     */
    static getSeedingPreview(playerIds: string[], tournamentFormat: string): Promise<{
        success: boolean;
        message: string;
        preview?: {
            totalPlayers: number;
            bracketSize: number;
            seeds: PlayerSeed[];
            needsByes: boolean;
            byeCount: number;
        };
    }>;
}
export default TournamentSeedingService;
//# sourceMappingURL=TournamentSeedingService.d.ts.map