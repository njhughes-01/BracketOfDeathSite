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

// Tournament types
export interface Tournament {
  _id: string;
  id: string;
  name: string;
  date: string;
  bodNumber: number;
  format: string;
  location: string;
  advancementCriteria: string;
  notes?: string;
  photoAlbums?: string;
  status: 'scheduled' | 'open' | 'active' | 'completed' | 'cancelled';
  players?: Array<{ _id: string; name: string; }>;
  maxPlayers?: number;
  currentPlayerCount?: number;
  champion?: {
    playerId: string;
    playerName: string;
    tournamentResult?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TournamentInput {
  date: string;
  bodNumber: number;
  format: string;
  location: string;
  advancementCriteria: string;
  notes?: string;
  photoAlbums?: string;
}

// Tournament Result types
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
  id: string;
  tournamentId: Tournament;
  players: Player[];
  division?: string;
  seed?: number;
  roundRobinScores?: RoundRobinScores;
  bracketScores?: BracketScores;
  totalStats: TotalStats;
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