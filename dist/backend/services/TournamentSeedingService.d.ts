import { Types } from 'mongoose';
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
export declare class TournamentSeedingService {
    static calculateSeeding(playerIds: string[], tournamentFormat: string): Promise<SeedingResult>;
    private static calculatePlayerScore;
    private static applyFormatAdjustments;
    private static generateReasoningText;
    static generateBracketPairings(seeds: PlayerSeed[]): Promise<{
        success: boolean;
        message: string;
        pairings?: Array<{
            team1: PlayerSeed;
            team2: PlayerSeed;
            round: string;
        }>;
    }>;
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