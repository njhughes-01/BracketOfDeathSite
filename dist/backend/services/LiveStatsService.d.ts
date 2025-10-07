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
    lastUpdated: Date;
}
export declare class LiveStatsService {
    static calculateLiveTournamentStats(tournamentId: string): Promise<LiveTournamentStats | null>;
    private static calculateTeamStandings;
    private static isTeamInMatch;
    private static isTeamInMatchByName;
    private static isTeamWinner;
    private static calculateTeamPoints;
    private static getTeamAdvancement;
    private static calculatePerformanceGrade;
    private static calculateMatchSummary;
    private static determineCurrentPhase;
    static updateLiveStats(matchId: string): Promise<void>;
    static calculatePlayerStatsForTournament(tournamentId: string): Promise<Array<{
        playerId: string;
        playerName?: string;
        totalPoints: number;
        matchesWithPoints: number;
        wins: number;
        losses: number;
    }>>;
}
//# sourceMappingURL=LiveStatsService.d.ts.map