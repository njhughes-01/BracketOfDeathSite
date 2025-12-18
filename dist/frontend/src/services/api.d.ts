import type { ApiResponse, PaginatedResponse, Player, PlayerInput, PlayerFilters, Tournament, TournamentInput, TournamentFilters, TournamentResult, TournamentResultInput, TournamentResultFilters, PaginationOptions, SeedingConfig, TeamFormationConfig, TournamentSetup, PlayerSeed, TeamSeed, LiveTournamentStats } from '../types/api';
import type { User, CreateUserInput, UpdateUserInput, UserFilters, ResetPasswordInput, UserRole } from '../types/user';
export declare const setTokenGetter: (getter: () => string | undefined) => void;
declare class ApiClient {
    private client;
    constructor();
    private get;
    private post;
    private put;
    private delete;
    getPlayers(filters?: PlayerFilters & PaginationOptions): Promise<PaginatedResponse<Player>>;
    getPlayer(id: string): Promise<ApiResponse<Player>>;
    createPlayer(data: PlayerInput): Promise<ApiResponse<Player>>;
    updatePlayer(id: string, data: Partial<PlayerInput>): Promise<ApiResponse<Player>>;
    deletePlayer(id: string): Promise<ApiResponse>;
    getPlayerStats(): Promise<ApiResponse>;
    getChampions(minChampionships?: number): Promise<ApiResponse<Player[]>>;
    searchPlayers(query: string, options?: PaginationOptions): Promise<PaginatedResponse<Player>>;
    getTournaments(filters?: TournamentFilters & PaginationOptions): Promise<PaginatedResponse<Tournament>>;
    getTournament(id: string): Promise<ApiResponse<Tournament>>;
    createTournament(data: TournamentInput): Promise<ApiResponse<Tournament>>;
    updateTournament(id: string, data: Partial<TournamentInput>): Promise<ApiResponse<Tournament>>;
    deleteTournament(id: string, cascade?: boolean): Promise<ApiResponse>;
    getTournamentStats(): Promise<ApiResponse>;
    getTournamentsByYear(year: number): Promise<ApiResponse<Tournament[]>>;
    getTournamentsByFormat(format: string): Promise<ApiResponse<Tournament[]>>;
    getUpcomingTournaments(limit?: number): Promise<ApiResponse<Tournament[]>>;
    getRecentTournaments(limit?: number): Promise<ApiResponse<Tournament[]>>;
    getNextBodNumber(): Promise<ApiResponse<{
        nextBodNumber: number;
    }>>;
    generatePlayerSeeds(config: SeedingConfig): Promise<ApiResponse<PlayerSeed[]>>;
    generateTeams(playerIds: string[], config: TeamFormationConfig): Promise<ApiResponse<TeamSeed[]>>;
    setupTournament(setup: TournamentSetup): Promise<ApiResponse<Tournament>>;
    getLiveTournament(tournamentId: string): Promise<ApiResponse<LiveTournament>>;
    executeTournamentAction(tournamentId: string, action: TournamentAction): Promise<ApiResponse<LiveTournament>>;
    updateMatch(matchUpdate: MatchUpdate): Promise<ApiResponse<Match>>;
    getTournamentMatches(tournamentId: string, round?: string): Promise<ApiResponse<Match[]>>;
    checkInTeam(tournamentId: string, teamId: string, present?: boolean): Promise<ApiResponse<LiveTournament>>;
    generateMatches(tournamentId: string, round: string): Promise<ApiResponse<Match[]>>;
    calculateStandings(tournamentId: string): Promise<ApiResponse<TournamentResult[]>>;
    getLiveStats(tournamentId: string): Promise<ApiResponse<LiveTournamentStats>>;
    getTournamentResults(filters?: TournamentResultFilters & PaginationOptions): Promise<PaginatedResponse<TournamentResult>>;
    getTournamentResult(id: string): Promise<ApiResponse<TournamentResult>>;
    createTournamentResult(data: TournamentResultInput): Promise<ApiResponse<TournamentResult>>;
    updateTournamentResult(id: string, data: Partial<TournamentResultInput>): Promise<ApiResponse<TournamentResult>>;
    deleteTournamentResult(id: string): Promise<ApiResponse>;
    getTournamentResultStats(): Promise<ApiResponse>;
    getResultsByTournament(tournamentId: string): Promise<ApiResponse>;
    getResultsByPlayer(playerId: string): Promise<ApiResponse<{
        player: Player;
        results: (TournamentResult & {
            tournamentId: Tournament;
        })[];
        stats: any;
    }>>;
    getLeaderboard(filters?: {
        tournamentId?: string;
        format?: string;
        year?: number;
        limit?: number;
    }): Promise<ApiResponse>;
    updateTournamentStatus(id: string, status: string): Promise<ApiResponse<Tournament>>;
    addPlayersToTournament(id: string, playerIds: string[]): Promise<ApiResponse<Tournament>>;
    removePlayerFromTournament(id: string, playerId: string): Promise<ApiResponse<Tournament>>;
    generateTournamentMatches(id: string, bracketType?: string): Promise<ApiResponse<{
        tournament: Tournament;
        matches: any[];
    }>>;
    updateMatchScore(matchId: string, team1Score?: number, team2Score?: number, notes?: string): Promise<ApiResponse<any>>;
    finalizeTournament(id: string): Promise<ApiResponse<Tournament>>;
    getTournamentWithMatches(id: string): Promise<ApiResponse<{
        tournament: Tournament;
        matches: any[];
        results: any[];
    }>>;
    getUsers(filters?: UserFilters): Promise<ApiResponse<User[]>>;
    getUser(id: string): Promise<ApiResponse<User>>;
    createUser(data: CreateUserInput): Promise<ApiResponse<User>>;
    updateUser(id: string, data: UpdateUserInput): Promise<ApiResponse<User>>;
    deleteUser(id: string): Promise<ApiResponse>;
    resetUserPassword(id: string, data: ResetPasswordInput): Promise<ApiResponse>;
    updateUserRoles(id: string, roles: string[]): Promise<ApiResponse>;
    getAvailableRoles(): Promise<ApiResponse<UserRole[]>>;
    healthCheck(): Promise<ApiResponse>;
}
export declare const apiClient: ApiClient;
export default apiClient;
//# sourceMappingURL=api.d.ts.map