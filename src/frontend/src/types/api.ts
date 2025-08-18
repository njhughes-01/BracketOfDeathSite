// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    current: number;
    pages: number;
    count: number;
    total: number;
  };
}

// Player types
export interface Player {
  _id: string;
  id: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface PlayerInput {
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
}

// Tournament types - matching backend schema exactly
export interface Tournament {
  _id: string;
  id: string;
  date: string;
  bodNumber: number;
  format: 'M' | 'W' | 'Mixed' | "Men's Singles" | "Men's Doubles" | "Women's Doubles" | "Mixed Doubles";
  location: string;
  advancementCriteria: string;
  notes?: string;
  photoAlbums?: string;
  status: 'scheduled' | 'open' | 'active' | 'completed' | 'cancelled';
  players?: Array<{ _id: string; name: string; }>;
  maxPlayers?: number;
  registrationType: 'open' | 'preselected';
  registrationOpensAt?: string;
  registrationDeadline?: string;
  allowSelfRegistration: boolean;
  registeredPlayers?: Array<{ _id: string; name: string; }>;
  waitlistPlayers?: Array<{ _id: string; name: string; }>;
  currentPlayerCount?: number;
  champion?: {
    playerId: string;
    playerName: string;
    tournamentResult?: string;
  };
  // Virtuals from backend
  formattedDate?: string;
  year?: number;
  month?: number;
  season?: string;
  isFull?: boolean;
  canStart?: boolean;
  registrationStatus?: 'pending' | 'open' | 'closed' | 'full';
  registeredPlayerCount?: number;
  waitlistCount?: number;
  isRegistrationOpen?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TournamentInput {
  date: string | Date;
  bodNumber?: number; // Now optional, will auto-generate
  format: 'M' | 'W' | 'Mixed' | "Men's Singles" | "Men's Doubles" | "Women's Doubles" | "Mixed Doubles";
  location: string;
  advancementCriteria: string;
  notes?: string;
  photoAlbums?: string;
  status?: 'scheduled' | 'open' | 'active' | 'completed' | 'cancelled';
  maxPlayers?: number;
  registrationType: 'open' | 'preselected';
  registrationOpensAt?: string | Date;
  registrationDeadline?: string | Date;
  allowSelfRegistration?: boolean;
}

export interface TournamentUpdate extends Partial<TournamentInput> {
  _id?: never;
  players?: string[];
  registeredPlayers?: string[];
  waitlistPlayers?: string[];
  champion?: {
    playerId: string;
    playerName: string;
    tournamentResult?: string;
  };
}

// Registration types
export interface RegistrationInfo {
  tournament: Tournament;
  registrationStatus: 'pending' | 'open' | 'closed' | 'full';
  registeredCount: number;
  waitlistCount: number;
  maxPlayers?: number;
  isRegistrationOpen: boolean;
  canRegister: boolean;
}

export interface PlayerSeed {
  playerId: string;
  player: Player;
  seed: number;
  score: number;
  reasoning: string;
}

export interface SeedingPreview {
  totalPlayers: number;
  bracketSize: number;
  seeds: PlayerSeed[];
  needsByes: boolean;
  byeCount: number;
}

// Tournament Result types - matching backend schema exactly
export interface RoundRobinScores {
  round1?: number;
  round2?: number;
  round3?: number;
  rrWon?: number;
  rrLost?: number;
  rrPlayed?: number;
  rrWinPercentage?: number;
  rrRank?: number;
}

export interface BracketScores {
  r16Won?: number;
  r16Lost?: number;
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

export interface TotalStats {
  totalWon: number;
  totalLost: number;
  totalPlayed: number;
  winPercentage: number;
  finalRank?: number;
  bodFinish?: number;
  home?: boolean;
}

export interface TournamentResult {
  _id: string;
  id: string;
  tournamentId: Tournament | string;
  players: Player[] | string[];
  division?: string;
  seed?: number;
  roundRobinScores?: RoundRobinScores;
  bracketScores?: BracketScores;
  totalStats: TotalStats;
  // Virtuals from backend
  teamName?: string;
  performanceGrade?: 'A' | 'B' | 'C' | 'D' | 'F';
  createdAt: string;
  updatedAt: string;
}

export interface TournamentResultInput {
  tournamentId: string;
  players: string[];
  division?: string;
  seed?: number;
  roundRobinScores?: RoundRobinScores;
  bracketScores?: BracketScores;
  totalStats: TotalStats;
}

export interface TournamentResultUpdate extends Partial<TournamentResultInput> {
  _id?: never;
  tournamentId?: never; // Prevent tournament ID updates
}

// Filter types
export interface PlayerFilters {
  name?: string;
  bodsPlayed_min?: number;
  bodsPlayed_max?: number;
  winningPercentage_min?: number;
  winningPercentage_max?: number;
  totalChampionships_min?: number;
  totalChampionships_max?: number;
}

export interface TournamentFilters {
  startDate?: string;
  endDate?: string;
  year?: number;
  format?: string;
  location?: string;
}

export interface TournamentResultFilters {
  tournamentId?: string;
  playerId?: string;
  division?: string;
  finalRank_min?: number;
  finalRank_max?: number;
  winPercentage_min?: number;
  winPercentage_max?: number;
}

// Pagination options
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sort?: string;
  select?: string;
}