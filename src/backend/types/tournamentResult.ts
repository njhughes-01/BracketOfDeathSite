import { Types } from "mongoose";
import { BaseDocument } from "./common";

export interface IRoundRobinScores {
  round1?: number;
  round2?: number;
  round3?: number;
  rrWon?: number;
  rrLost?: number;
  rrPlayed?: number;
  rrWinPercentage?: number;
  rrRank?: number;
}

export interface IBracketScores {
  r16Won?: number;
  r16Lost?: number;
  r16Matchup?: string;
  qfWon?: number;
  qfLost?: number;
  sfWon?: number;
  sfLost?: number;
  finalsWon?: number;
  finalsLost?: number;
  bracketWon?: number;
  bracketLost?: number;
  bracketPlayed?: number;
}

export interface ITotalStats {
  totalWon: number;
  totalLost: number;
  totalPlayed: number;
  winPercentage: number;
  finalRank?: number;
  bodFinish?: number;
  home?: boolean;
}

export interface ITournamentResult extends BaseDocument {
  tournamentId: Types.ObjectId;
  players: Types.ObjectId[];
  division?: string;
  seed?: number;
  roundRobinScores?: IRoundRobinScores;
  bracketScores?: IBracketScores;
  totalStats: ITotalStats;
}

export interface ITournamentResultInput {
  tournamentId: string | Types.ObjectId;
  players: string[] | Types.ObjectId[];
  division?: string;
  seed?: number;
  roundRobinScores?: IRoundRobinScores;
  bracketScores?: IBracketScores;
  totalStats: ITotalStats;
}

export interface ITournamentResultUpdate extends Partial<ITournamentResultInput> {
  _id?: never;
  tournamentId?: never; // Prevent tournament ID updates
}

export interface ITournamentResultFilter {
  tournamentId?: Types.ObjectId | string;
  players?: { $in: Types.ObjectId[] | string[] };
  division?: string | RegExp;
  seed?: number | { $gte?: number; $lte?: number };
  "totalStats.finalRank"?: number | { $gte?: number; $lte?: number };
  "totalStats.bodFinish"?: number | { $gte?: number; $lte?: number };
  "totalStats.winPercentage"?: { $gte?: number; $lte?: number };
  "tournament.date"?: any;
  [key: string]: any; // Allow dynamic fields for aggregation
}
