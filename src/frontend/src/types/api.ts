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
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  firstName?: string;
  lastName?: string;
  nickname?: string;
  email?: string;
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
  isActive?: boolean;
}

// Tournament types - matching backend schema exactly
export interface Tournament {
  _id: string;
  id: string;
  date: string;
  bodNumber: number;
  format:
  | "M"
  | "W"
  | "Mixed"
  | "Men's Singles"
  | "Men's Doubles"
  | "Women's Doubles"
  | "Mixed Doubles";
  // Bracket/play structure selected during setup. Optional for legacy data.
  bracketType?:
  | "single_elimination"
  | "double_elimination"
  | "round_robin_playoff";
  location: string;
  advancementCriteria: string;
  notes?: string;
  photoAlbums?: string;
  // Historical tournament statistics
  tiebreakers?: number;
  avgRRGames?: number;
  avgGames?: number;
  championSufferingScore?: number;
  finalistSufferingScore?: number;
  status: "scheduled" | "open" | "active" | "completed" | "cancelled";
  players?: Array<{ _id: string; name: string }>;
  maxPlayers?: number;
  registrationType: "open" | "preselected";
  registrationOpensAt?: string;
  registrationDeadline?: string;
  allowSelfRegistration: boolean;
  registeredPlayers?: Array<{ _id: string; name: string }>;
  waitlistPlayers?: Array<{ _id: string; name: string }>;
  currentPlayerCount?: number;
  champion?: {
    playerId: string;
    playerName: string;
    tournamentResult?: string;
  };
  // Configuration fields
  seedingConfig?: {
    method: "historical" | "recent_form" | "elo" | "manual";
    parameters?: {
      recentTournamentCount?: number;
      championshipWeight?: number;
      winPercentageWeight?: number;
      avgFinishWeight?: number;
    };
  };
  teamFormationConfig?: {
    method: "preformed" | "draft" | "statistical_pairing" | "random" | "manual";
    parameters?: {
      skillBalancing?: boolean;
      avoidRecentPartners?: boolean;
      maxTimesPartnered?: number;
    };
  };
  // Generated tournament data
  generatedSeeds?: Array<{
    playerId: string;
    playerName: string;
    seed: number;
    statistics?: {
      avgFinish?: number;
      winningPercentage?: number;
      totalChampionships?: number;
      bodsPlayed?: number;
      recentForm?: number;
    };
  }>;
  generatedTeams?: Array<{
    teamId: string;
    players: Array<{
      playerId: string;
      playerName: string;
      seed?: number;
      statistics?: {
        avgFinish?: number;
        winningPercentage?: number;
        totalChampionships?: number;
        bodsPlayed?: number;
        recentForm?: number;
      };
    }>;
    combinedSeed?: number;
    teamName: string;
    combinedStatistics?: {
      avgFinish?: number;
      combinedWinPercentage?: number;
      totalChampionships?: number;
      combinedBodsPlayed?: number;
    };
  }>;
  managementState?: {
    currentRound?: string;
  };
  // Virtuals from backend
  formattedDate?: string;
  year?: number;
  month?: number;
  season?: string;
  isFull?: boolean;
  canStart?: boolean;
  registrationStatus?: "pending" | "open" | "closed" | "full";
  registeredPlayerCount?: number;
  waitlistCount?: number;
  isRegistrationOpen?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TournamentInput {
  date: string | Date;
  bodNumber?: number; // Now optional, will auto-generate
  format:
  | "M"
  | "W"
  | "Mixed"
  | "Men's Singles"
  | "Men's Doubles"
  | "Women's Doubles"
  | "Mixed Doubles";
  location: string;
  advancementCriteria: string;
  notes?: string;
  photoAlbums?: string;
  status?: "scheduled" | "open" | "active" | "completed" | "cancelled";
  maxPlayers?: number;
  registrationType: "open" | "preselected";
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
  registrationStatus: "pending" | "open" | "closed" | "full";
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
  performanceGrade?: "A" | "B" | "C" | "D" | "F";
  createdAt: string;
  updatedAt: string;
}

export interface LeaderboardEntry {
  _id: string;
  name: string;
  points: number;
  totalWins: number;
  totalLosses: number;
  winningPercentage: number;
  totalChampionships: number;
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

// Tournament Management Types
export interface SeedingConfig {
  method: "historical" | "recent_form" | "elo" | "manual";
  parameters?: {
    recentTournamentCount?: number;
    championshipWeight?: number;
    winPercentageWeight?: number;
    avgFinishWeight?: number;
  };
}

export interface TeamFormationConfig {
  method: "preformed" | "draft" | "statistical_pairing" | "random" | "manual";
  parameters?: {
    skillBalancing?: boolean;
    avoidRecentPartners?: boolean;
    maxTimesPartnered?: number;
  };
}

export interface TournamentSetup {
  basicInfo: TournamentInput;
  seedingConfig: SeedingConfig;
  teamFormationConfig: TeamFormationConfig;
  bracketType:
  | "single_elimination"
  | "double_elimination"
  | "round_robin_playoff";
  registrationDeadline?: string;
  maxPlayers: number;
}

export interface PlayerSeed {
  playerId: string;
  playerName: string;
  seed: number;
  statistics: {
    avgFinish: number;
    winningPercentage: number;
    totalChampionships: number;
    bodsPlayed: number;
    recentForm?: number;
  };
}

export interface TeamSeed {
  teamId: string;
  players: PlayerSeed[];
  combinedSeed: number;
  teamName: string;
  combinedStatistics: {
    avgFinish: number;
    combinedWinPercentage: number;
    totalChampionships: number;
    combinedBodsPlayed: number;
  };
}

// Live Tournament Management Types
export interface Match {
  _id: string;
  id: string;
  tournamentId: string;
  round: "RR_R1" | "RR_R2" | "RR_R3" | "quarterfinal" | "semifinal" | "final";
  matchNumber: number;
  team1: {
    teamId: string;
    teamName: string;
    players: Player[];
    score?: number;
    // Individual player scores for detailed tracking
    playerScores?: Array<{
      playerId: string;
      playerName: string;
      score: number;
    }>;
  };
  team2: {
    teamId: string;
    teamName: string;
    players: Player[];
    score?: number;
    // Individual player scores for detailed tracking
    playerScores?: Array<{
      playerId: string;
      playerName: string;
      score: number;
    }>;
  };
  status:
  | "scheduled"
  | "in-progress"
  | "in_progress"
  | "completed"
  | "confirmed";
  startTime?: string;
  endTime?: string;
  court?: string;
  notes?: string;
  adminOverride?: {
    reason: string;
    authorizedBy: string;
    timestamp: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TournamentPhase {
  phase:
  | "setup"
  | "registration"
  | "check_in"
  | "round_robin"
  | "bracket"
  | "completed";
  currentRound?:
  | "RR_R1"
  | "RR_R2"
  | "RR_R3"
  | "quarterfinal"
  | "semifinal"
  | "final"
  | "lbr-round-1"
  | "lbr-semifinal"
  | "lbr-final"
  | "grand-final";
  roundStatus: "not_started" | "in_progress" | "in-progress" | "completed";
  totalMatches: number;
  completedMatches: number;
  canAdvance: boolean;
}

export interface LiveTournament extends Tournament {
  phase: TournamentPhase;
  teams: TeamSeed[];
  matches: Match[];
  currentStandings: TournamentResult[];
  managementState?: {
    currentRound?: string;
  };
  bracketProgression: {
    quarterFinalists: string[];
    semiFinalists: string[];
    finalists: string[];
    champion?: string;
  };
  checkInStatus: {
    [teamId: string]: {
      checkedIn: boolean;
      checkInTime?: string;
      present: boolean;
    };
  };
}

export interface MatchUpdate {
  matchId: string;
  team1Score?: number;
  team2Score?: number;
  // Individual player scores for detailed tracking
  team1PlayerScores?: Array<{
    playerId: string;
    playerName: string;
    score: number;
  }>;
  team2PlayerScores?: Array<{
    playerId: string;
    playerName: string;
    score: number;
  }>;
  status?: Match["status"];
  court?: string;
  notes?: string;
  startTime?: string;
  endTime?: string;
  adminOverride?: {
    reason: string;
    authorizedBy: string;
  };
}

export interface TournamentAction {
  action:
  | "start_registration"
  | "close_registration"
  | "start_checkin"
  | "start_round_robin"
  | "advance_round"
  | "start_bracket"
  | "complete_tournament"
  | "reset_tournament"
  | "set_round";
  parameters?: {
    targetRound?: string;
    resetToPhase?: string;
  };
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

// Live Tournament Statistics types
export interface LiveTeamStats {
  teamId: string;
  teamName: string;
  players: Array<{
    playerId: string;
    playerName: string;
  }>;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  winPercentage: number;
  pointsScored: number;
  pointsAllowed: number;
  pointDifferential: number;
  currentRank: number;
  roundRobinRecord: {
    played: number;
    won: number;
    lost: number;
    winPercentage: number;
  };
  bracketRecord: {
    played: number;
    won: number;
    lost: number;
    eliminated: boolean;
    advancedTo?: string;
  };
  performanceGrade: string;
}

export interface LiveTournamentStats {
  tournamentId: string;
  totalTeams: number;
  totalMatches: number;
  completedMatches: number;
  inProgressMatches: number;
  currentPhase: string;
  currentRound?: string;
  teamStandings: LiveTeamStats[];
  matchSummary: {
    roundRobin: {
      total: number;
      completed: number;
      inProgress: number;
    };
    bracket: {
      total: number;
      completed: number;
      inProgress: number;
    };
  };
  lastUpdated: string;
}
