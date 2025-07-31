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
  round?: MatchRound | { $in?: MatchRound[] };
  roundNumber?: number | { $gte?: number; $lte?: number };
  status?: MatchStatus | { $in?: MatchStatus[] };
  'team1.players'?: { $in?: Types.ObjectId[] };
  'team2.players'?: { $in?: Types.ObjectId[] };
  winner?: 'team1' | 'team2';
  scheduledDate?: { $gte?: Date; $lte?: Date };
}

export const MatchRounds = [
  'round-robin',
  'round-of-64',
  'round-of-32',
  'round-of-16',
  'quarterfinal',
  'semifinal',
  'final',
  'third-place',
] as const;

export type MatchRound = typeof MatchRounds[number];

export const MatchStatuses = [
  'scheduled',
  'in-progress',
  'completed',
  'cancelled',
  'postponed',
] as const;

export type MatchStatus = typeof MatchStatuses[number];

// Helper function to determine the next round
export const getNextRound = (currentRound: MatchRound): MatchRound | null => {
  const roundOrder = [
    'round-robin',
    'round-of-64',
    'round-of-32', 
    'round-of-16',
    'quarterfinal',
    'semifinal',
    'final'
  ];
  
  const currentIndex = roundOrder.indexOf(currentRound);
  if (currentIndex === -1 || currentIndex === roundOrder.length - 1) {
    return null;
  }
  
  return roundOrder[currentIndex + 1] as MatchRound;
};

// Helper function to calculate required matches for bracket size
export const calculateBracketMatches = (playerCount: number): number => {
  if (playerCount < 2) return 0;
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(playerCount)));
  return bracketSize - 1; // Single elimination bracket
};