import { BaseDocument } from './common';
import { Types } from 'mongoose';
export interface IMatch extends BaseDocument {
    tournamentId: Types.ObjectId;
    matchNumber: number;
    round: MatchRound;
    roundNumber: number;
    team1: IMatchTeam;
    team2: IMatchTeam;
    winner?: 'team1' | 'team2';
    status: MatchStatus;
    scheduledDate?: Date;
    completedDate?: Date;
    notes?: string;
}
export interface IMatchTeam {
    players: Types.ObjectId[];
    playerNames: string[];
    score: number;
    seed?: number;
}
export interface IMatchInput {
    tournamentId: Types.ObjectId | string;
    matchNumber: number;
    round: MatchRound;
    roundNumber: number;
    team1: IMatchTeamInput;
    team2: IMatchTeamInput;
    scheduledDate?: Date | string;
    notes?: string;
}
export interface IMatchTeamInput {
    players: Types.ObjectId[] | string[];
    playerNames: string[];
    score?: number;
    seed?: number;
}
export interface IMatchUpdate extends Partial<IMatchInput> {
    _id?: never;
    winner?: 'team1' | 'team2';
    status?: MatchStatus;
    completedDate?: Date;
}
export interface IMatchFilter {
    tournamentId?: Types.ObjectId;
    round?: MatchRound | {
        $in?: MatchRound[];
    };
    roundNumber?: number | {
        $gte?: number;
        $lte?: number;
    };
    status?: MatchStatus | {
        $in?: MatchStatus[];
    };
    'team1.players'?: {
        $in?: Types.ObjectId[];
    };
    'team2.players'?: {
        $in?: Types.ObjectId[];
    };
    winner?: 'team1' | 'team2';
    scheduledDate?: {
        $gte?: Date;
        $lte?: Date;
    };
}
export declare const MatchRounds: readonly ["round-robin", "round-of-64", "round-of-32", "round-of-16", "quarterfinal", "semifinal", "final", "third-place"];
export type MatchRound = typeof MatchRounds[number];
export declare const MatchStatuses: readonly ["scheduled", "in-progress", "completed", "cancelled", "postponed"];
export type MatchStatus = typeof MatchStatuses[number];
export declare const getNextRound: (currentRound: MatchRound) => MatchRound | null;
export declare const calculateBracketMatches: (playerCount: number) => number;
//# sourceMappingURL=match.d.ts.map