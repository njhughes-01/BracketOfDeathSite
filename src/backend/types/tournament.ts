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
  champion?: {
    playerId: Types.ObjectId;
    playerName: string;
    tournamentResult?: Types.ObjectId;
  };
}

export interface ITournamentInput {
  date: Date | string;
  bodNumber: number;
  format: string;
  location: string;
  advancementCriteria: string;
  notes?: string;
  photoAlbums?: string;
  status?: TournamentStatus;
  maxPlayers?: number;
}

export interface ITournamentUpdate extends Partial<ITournamentInput> {
  _id?: never;
  players?: Types.ObjectId[];
  champion?: {
    playerId: Types.ObjectId;
    playerName: string;
    tournamentResult?: Types.ObjectId;
  };
}

export interface ITournamentFilter {
  date?: { $gte?: Date; $lte?: Date };
  bodNumber?: number | { $gte?: number; $lte?: number };
  format?: string | RegExp;
  location?: string | RegExp;
  advancementCriteria?: string | RegExp;
  status?: TournamentStatus | { $in?: TournamentStatus[] };
  players?: { $in?: Types.ObjectId[]; $size?: number };
  'champion.playerId'?: Types.ObjectId;
}

export const TournamentFormats = [
  'M',
  'W', 
  'Mixed',
  'Men\'s Singles',
  'Men\'s Doubles',
  'Women\'s Doubles',
  'Mixed Doubles',
] as const;

export type TournamentFormat = typeof TournamentFormats[number];

export const TournamentStatuses = [
  'scheduled',
  'open',
  'active',
  'completed',
  'cancelled',
] as const;

export type TournamentStatus = typeof TournamentStatuses[number];