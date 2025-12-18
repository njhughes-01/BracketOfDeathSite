import { BaseDocument } from './common';

export interface IPlayer extends BaseDocument {
  name: string;
  bodsPlayed: number;
  bestResult: number;
  avgFinish: number;
  gamesPlayed: number;
  gamesWon: number;
  winningPercentage: number;
  individualChampionships: number;
  divisionChampionships: number;
  totalChampionships: number;
  drawingSequence?: number;
  pairing?: string;
  isActive: boolean;
  gender?: 'male' | 'female' | 'other';
  bracketPreference?: 'mens' | 'womens' | 'mixed';
}

export interface IPlayerInput {
  name: string;
  bodsPlayed?: number;
  bestResult?: number;
  avgFinish?: number;
  gamesPlayed?: number;
  gamesWon?: number;
  winningPercentage?: number;
  individualChampionships?: number;
  divisionChampionships?: number;
  totalChampionships?: number;
  drawingSequence?: number;
  pairing?: string;
  isActive?: boolean;
  gender?: 'male' | 'female' | 'other';
  bracketPreference?: 'mens' | 'womens' | 'mixed';
}

export interface IPlayerUpdate extends Partial<IPlayerInput> {
  _id?: never; // Prevent ID updates
}

export interface IPlayerFilter {
  name?: string | RegExp;
  bodsPlayed?: number | { $gte?: number; $lte?: number };
  bestResult?: number | { $gte?: number; $lte?: number };
  avgFinish?: number | { $gte?: number; $lte?: number };
  winningPercentage?: number | { $gte?: number; $lte?: number };
  totalChampionships?: number | { $gte?: number; $lte?: number };
  gamesPlayed?: number | { $gte?: number; $lte?: number };
  gamesWon?: number | { $gte?: number; $lte?: number };
  division?: string | RegExp;
  city?: string | RegExp;
  state?: string | RegExp;
}