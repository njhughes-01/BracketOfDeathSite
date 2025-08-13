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
  // Individual player scores for detailed tracking
  playerScores?: Array<{
    playerId: Types.ObjectId;
    playerName: string;
    score: number;
  }>;
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
  // Individual player scores for detailed tracking
  playerScores?: Array<{
    playerId: Types.ObjectId | string;
    playerName: string;
    score: number;
  }>;
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
  'RR_R1',
  'RR_R2', 
  'RR_R3',
  'round-of-64',
  'round-of-32',
  'round-of-16',
  'quarterfinal',
  'semifinal',
  'final',
  'third-place',
] as const;

// Backward compatibility - deprecated
export const LegacyMatchRounds = [
  'round-robin',
  ...MatchRounds
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

// Round Robin helper functions
export const RoundRobinRounds = ['RR_R1', 'RR_R2', 'RR_R3'] as const;
export type RoundRobinRound = typeof RoundRobinRounds[number];

export const isRoundRobinRound = (round: string): round is RoundRobinRound => {
  return RoundRobinRounds.includes(round as RoundRobinRound);
};

export const getNextRoundRobinRound = (currentRound: RoundRobinRound): RoundRobinRound | 'bracket' => {
  const currentIndex = RoundRobinRounds.indexOf(currentRound);
  if (currentIndex === -1) return 'RR_R1';
  if (currentIndex >= RoundRobinRounds.length - 1) return 'bracket';
  return RoundRobinRounds[currentIndex + 1];
};

export const getRoundNumber = (round: MatchRound): number => {
  if (round === 'RR_R1') return 1;
  if (round === 'RR_R2') return 2;
  if (round === 'RR_R3') return 3;
  if (round === 'quarterfinal') return 4;
  if (round === 'semifinal') return 5;
  if (round === 'final') return 6;
  return 1; // default
};

// Helper function to determine the next round
export const getNextRound = (currentRound: MatchRound): MatchRound | null => {
  const roundOrder = [
    'RR_R1',
    'RR_R2',
    'RR_R3',
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