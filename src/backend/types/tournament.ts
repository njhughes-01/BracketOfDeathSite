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
  // Virtual properties
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
}

export interface ITournamentInput {
  date: Date | string;
  bodNumber?: number; // Now optional, will auto-generate
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
  date?: { $gte?: Date; $lte?: Date };
  bodNumber?: number | { $gte?: number; $lte?: number };
  format?: string | RegExp;
  location?: string | RegExp;
  advancementCriteria?: string | RegExp;
  status?: TournamentStatus | { $in?: TournamentStatus[] };
  players?: { $in?: Types.ObjectId[]; $size?: number };
  registrationType?: RegistrationType;
  registrationDeadline?: { $gte?: Date; $lte?: Date };
  allowSelfRegistration?: boolean;
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

export const RegistrationTypes = [
  'open',
  'preselected',
] as const;

export type RegistrationType = typeof RegistrationTypes[number];