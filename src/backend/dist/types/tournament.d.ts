import { BaseDocument } from './common';
import { Types } from 'mongoose';
export interface ITournament extends BaseDocument {
    date: Date;
    bodNumber: number;
    format: string;
    location: string;
    advancementCriteria: string;
    notes?: string;
    photoAlbums?: string;
    status: TournamentStatus;
    players?: Types.ObjectId[];
    maxPlayers?: number;
    registrationType: RegistrationType;
    registrationOpensAt?: Date;
    registrationDeadline?: Date;
    allowSelfRegistration: boolean;
    registeredPlayers?: Types.ObjectId[];
    waitlistPlayers?: Types.ObjectId[];
    champion?: {
        playerId: Types.ObjectId;
        playerName: string;
        tournamentResult?: Types.ObjectId;
    };
<<<<<<< HEAD
    formattedDate?: string;
    year?: number;
    month?: number;
    season?: string;
    currentPlayerCount?: number;
    isFull?: boolean;
    canStart?: boolean;
    registrationStatus?: 'pending' | 'open' | 'closed' | 'full';
    registeredPlayerCount?: number;
    waitlistCount?: number;
    isRegistrationOpen?: boolean;
=======
    seedingConfig?: {
        method: 'historical' | 'recent_form' | 'elo' | 'manual';
        parameters?: {
            recentTournamentCount?: number;
            championshipWeight?: number;
            winPercentageWeight?: number;
            avgFinishWeight?: number;
        };
    };
    teamFormationConfig?: {
        method: 'preformed' | 'draft' | 'statistical_pairing' | 'random' | 'manual';
        parameters?: {
            skillBalancing?: boolean;
            avoidRecentPartners?: boolean;
            maxTimesPartnered?: number;
        };
    };
    bracketType?: 'single_elimination' | 'double_elimination' | 'round_robin_playoff';
    registrationDeadline?: Date;
    generatedSeeds?: Array<{
        playerId: Types.ObjectId;
        playerName: string;
        seed: number;
        statistics: {
            avgFinish: number;
            winningPercentage: number;
            totalChampionships: number;
            bodsPlayed: number;
            recentForm?: number;
        };
    }>;
    generatedTeams?: Array<{
        teamId: string;
        players: Array<{
            playerId: Types.ObjectId;
            playerName: string;
            seed: number;
            statistics: {
                avgFinish: number;
                winningPercentage: number;
                totalChampionships: number;
                bodsPlayed: number;
                recentForm?: number;
            };
        }>;
        combinedSeed: number;
        teamName: string;
        combinedStatistics: {
            avgFinish: number;
            combinedWinPercentage: number;
            totalChampionships: number;
            combinedBodsPlayed: number;
        };
    }>;
    managementState?: {
        currentRound?: string;
    };
>>>>>>> new-ui
}
export interface ITournamentInput {
    date: Date | string;
    bodNumber?: number;
    format: string;
    location: string;
    advancementCriteria: string;
    notes?: string;
    photoAlbums?: string;
    status?: TournamentStatus;
    maxPlayers?: number;
    registrationType: RegistrationType;
    registrationOpensAt?: Date | string;
    registrationDeadline?: Date | string;
    allowSelfRegistration?: boolean;
}
export interface ITournamentUpdate extends Partial<ITournamentInput> {
    _id?: never;
    players?: Types.ObjectId[];
    registeredPlayers?: Types.ObjectId[];
    waitlistPlayers?: Types.ObjectId[];
    champion?: {
        playerId: Types.ObjectId;
        playerName: string;
        tournamentResult?: Types.ObjectId;
    };
}
export interface ITournamentFilter {
    date?: {
        $gte?: Date;
        $lte?: Date;
    };
    bodNumber?: number | {
        $gte?: number;
        $lte?: number;
    };
    format?: string | RegExp;
    location?: string | RegExp;
    advancementCriteria?: string | RegExp;
    status?: TournamentStatus | {
        $in?: TournamentStatus[];
    };
    players?: {
        $in?: Types.ObjectId[];
        $size?: number;
    };
    registrationType?: RegistrationType;
    registrationDeadline?: {
        $gte?: Date;
        $lte?: Date;
    };
    allowSelfRegistration?: boolean;
    'champion.playerId'?: Types.ObjectId;
}
export declare const TournamentFormats: readonly ["M", "W", "Mixed", "Men's Singles", "Men's Doubles", "Women's Doubles", "Mixed Doubles"];
export type TournamentFormat = typeof TournamentFormats[number];
export declare const TournamentStatuses: readonly ["scheduled", "open", "active", "completed", "cancelled"];
export type TournamentStatus = typeof TournamentStatuses[number];
export declare const RegistrationTypes: readonly ["open", "preselected"];
export type RegistrationType = typeof RegistrationTypes[number];
//# sourceMappingURL=tournament.d.ts.map