import axios from "axios";
import type { AxiosInstance, AxiosRequestConfig } from "axios";
import type {
  ApiResponse,
  PaginatedResponse,
  Player,
  PlayerInput,
  PlayerFilters,
  Tournament,
  TournamentInput,
  TournamentFilters,
  TournamentResult,
  TournamentResultInput,
  TournamentResultFilters,
  PaginationOptions,
  SeedingConfig,
  TeamFormationConfig,
  TournamentSetup,
  PlayerSeed,
  TeamSeed,
  LiveTournamentStats,
  LiveTournament,
  TournamentAction,
  Match,
  MatchUpdate,
} from "../types/api";
import type {
  User,
  CreateUserInput,
  UpdateUserInput,
  UserFilters,
  ResetPasswordInput,
  UserRole,
} from "../types/user";

export interface SystemSettings {
  // Email Provider
  activeProvider: "mailjet" | "mailgun";

  // Mailjet config
  mailjetConfigured: boolean;
  mailjetSenderEmail: string;
  hasApiKey: boolean;
  hasApiSecret: boolean;

  // Mailgun config
  mailgunConfigured: boolean;
  mailgunDomain: string;
  hasMailgunApiKey: boolean;

  // Branding config
  siteLogo: string;
  siteLogoUrl: string;
  favicon: string;
  brandName: string;
  brandPrimaryColor: string;
  brandSecondaryColor: string;
}

// ... existing code ...



// Global token getter function - will be set by AuthContext
let getKeycloakToken: (() => string | undefined) | null = null;
let refreshKeycloakToken: (() => Promise<boolean>) | null = null;

export const setTokenGetter = (getter: () => string | undefined) => {
  getKeycloakToken = getter;
};

export const setTokenRefresher = (refresher: () => Promise<boolean>) => {
  refreshKeycloakToken = refresher;
};

// Helper: ensure token is fresh before protected calls
// Increased leeway to 300 seconds (5 minutes) to account for network latency and processing time
const tokenExpiringSoon = (token?: string, leewayMs = 300000): boolean => {
  if (!token) return true;
  try {
    const body = JSON.parse(atob(token.split(".")[1]));
    const expMs = (body?.exp || 0) * 1000;
    const willExpire = Date.now() + leewayMs >= expMs;
    if (willExpire) {
      console.log("Token expiring soon, will attempt refresh");
    }
    return willExpire;
  } catch {
    return true;
  }
};

const ensureFreshToken = async (): Promise<void> => {
  const token = getKeycloakToken?.();
  if (!tokenExpiringSoon(token)) {
    console.log("Token still valid, no refresh needed");
    return;
  }
  if (refreshKeycloakToken) {
    try {
      console.log("Proactively refreshing token before API call...");
      const refreshed = await refreshKeycloakToken();
      if (refreshed) {
        console.log("Token proactively refreshed successfully");
      } else {
        console.warn(
          "Token refresh returned false, proceeding with current token",
        );
      }
    } catch (e) {
      console.warn(
        "Proactive token refresh failed, letting interceptor handle it:",
        e,
      );
      // Let interceptor handle 401s if refresh fails
    }
  }
};

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_URL || "/api",
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = getKeycloakToken?.();
        console.log("API Request:", {
          url: config.url,
          hasTokenGetter: !!getKeycloakToken,
          hasToken: !!token,
          tokenStart: token ? token.substring(0, 20) : "none",
        });
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const original = error.config || {};

        // Attempt one silent refresh on 401 then retry once
        if (
          error.response?.status === 401 &&
          !original.__isRetryRequest &&
          refreshKeycloakToken
        ) {
          try {
            const refreshed = await refreshKeycloakToken();
            if (refreshed) {
              original.__isRetryRequest = true;
              const token = getKeycloakToken?.();
              if (token) {
                original.headers = original.headers || {};
                original.headers["Authorization"] = `Bearer ${token}`;
              }
              return this.client.request(original);
            }
          } catch (e) {
            console.warn("Token refresh failed on 401");
          }
          console.warn("Authentication failed - redirecting to login");
        }

        // Handle rate limiting (429 errors)
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers["retry-after"] || 1;
          await new Promise((resolve) =>
            setTimeout(resolve, retryAfter * 1000),
          );
          return this.client.request(error.config);
        }

        return Promise.reject(error);
      },
    );
  }

  // Generic methods
  private async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  private async post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  private async put<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  private async delete<T>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  // Player API methods
  async getPlayers(
    filters?: PlayerFilters & PaginationOptions,
  ): Promise<PaginatedResponse<Player>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    return this.get<PaginatedResponse<Player>>(`/players?${params.toString()}`);
  }

  async getPlayer(id: string): Promise<ApiResponse<Player>> {
    return this.get<ApiResponse<Player>>(`/players/${id}`);
  }

  async getPlayerScoring(
    id: string,
  ): Promise<ApiResponse<{ matchesWithPoints: number; totalPoints: number }>> {
    return this.get<
      ApiResponse<{ matchesWithPoints: number; totalPoints: number }>
    >(`/players/${id}/scoring`);
  }

  async createPlayer(data: PlayerInput): Promise<ApiResponse<Player>> {
    return this.post<ApiResponse<Player>>("/players", data);
  }

  async updatePlayer(
    id: string,
    data: Partial<PlayerInput>,
  ): Promise<ApiResponse<Player>> {
    return this.put<ApiResponse<Player>>(`/players/${id}`, data);
  }

  async deletePlayer(id: string): Promise<ApiResponse> {
    return this.delete<ApiResponse>(`/players/${id}`);
  }

  async getPlayerStats(): Promise<ApiResponse> {
    return this.get<ApiResponse>("/players/stats");
  }

  async getChampions(minChampionships = 1): Promise<ApiResponse<Player[]>> {
    return this.get<ApiResponse<Player[]>>(
      `/players/champions?min=${minChampionships}`,
    );
  }

  async searchPlayers(
    query: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResponse<Player>> {
    const params = new URLSearchParams({ q: query });
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    return this.get<PaginatedResponse<Player>>(
      `/players/search?${params.toString()}`,
    );
  }

  // Tournament API methods
  async getTournaments(
    filters?: TournamentFilters & PaginationOptions,
  ): Promise<PaginatedResponse<Tournament>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    return this.get<PaginatedResponse<Tournament>>(
      `/tournaments?${params.toString()}`,
    );
  }

  async getTournament(id: string): Promise<ApiResponse<Tournament>> {
    return this.get<ApiResponse<Tournament>>(`/tournaments/${id}`);
  }

  async createTournament(
    data: TournamentInput,
  ): Promise<ApiResponse<Tournament>> {
    return this.post<ApiResponse<Tournament>>("/tournaments", data);
  }

  async updateTournament(
    id: string,
    data: Partial<TournamentInput>,
  ): Promise<ApiResponse<Tournament>> {
    return this.put<ApiResponse<Tournament>>(`/tournaments/${id}`, data);
  }

  async deleteTournament(id: string, cascade = false): Promise<ApiResponse> {
    return this.delete<ApiResponse>(`/tournaments/${id}?cascade=${cascade}`);
  }

  async getTournamentStats(): Promise<ApiResponse> {
    return this.get<ApiResponse>("/tournaments/stats");
  }

  async getTournamentsByYear(year: number): Promise<ApiResponse<Tournament[]>> {
    return this.get<ApiResponse<Tournament[]>>(`/tournaments/year/${year}`);
  }

  async getTournamentsByFormat(
    format: string,
  ): Promise<ApiResponse<Tournament[]>> {
    return this.get<ApiResponse<Tournament[]>>(`/tournaments/format/${format}`);
  }

  async getUpcomingTournaments(limit = 10): Promise<ApiResponse<Tournament[]>> {
    return this.get<ApiResponse<Tournament[]>>(
      `/tournaments/upcoming?limit=${limit}`,
    );
  }

  async getRecentTournaments(limit = 10): Promise<ApiResponse<Tournament[]>> {
    return this.get<ApiResponse<Tournament[]>>(
      `/tournaments/recent?limit=${limit}`,
    );
  }

  async getNextBodNumber(): Promise<ApiResponse<{ nextBodNumber: number }>> {
    return this.get<ApiResponse<{ nextBodNumber: number }>>(
      "/tournaments/next-bod-number",
    );
  }

  // Tournament Management API methods
  async generatePlayerSeeds(
    config: SeedingConfig,
  ): Promise<ApiResponse<PlayerSeed[]>> {
    await ensureFreshToken();
    return this.post<ApiResponse<PlayerSeed[]>>(
      "/tournaments/generate-seeds",
      config,
    );
  }

  async generateTeams(
    playerIds: string[],
    config: TeamFormationConfig,
  ): Promise<ApiResponse<TeamSeed[]>> {
    await ensureFreshToken();
    return this.post<ApiResponse<TeamSeed[]>>("/tournaments/generate-teams", {
      playerIds,
      config,
    });
  }

  async setupTournament(
    setup: TournamentSetup,
  ): Promise<ApiResponse<Tournament>> {
    await ensureFreshToken();
    return this.post<ApiResponse<Tournament>>("/tournaments/setup", setup);
  }

  // Live Tournament Management API methods
  async getLiveTournament(
    tournamentId: string,
  ): Promise<ApiResponse<LiveTournament>> {
    return this.get<ApiResponse<LiveTournament>>(
      `/tournaments/${tournamentId}/live`,
    );
  }

  async executeTournamentAction(
    tournamentId: string,
    action: TournamentAction,
  ): Promise<ApiResponse<LiveTournament>> {
    await ensureFreshToken();
    return this.post<ApiResponse<LiveTournament>>(
      `/tournaments/${tournamentId}/action`,
      action,
    );
  }

  async updateMatch(matchUpdate: MatchUpdate): Promise<ApiResponse<Match>> {
    // Backend route is mounted under /tournaments
    return this.put<ApiResponse<Match>>(
      `/tournaments/matches/${matchUpdate.matchId}`,
      matchUpdate,
    );
  }

  async getTournamentMatches(
    tournamentId: string,
    round?: string,
  ): Promise<ApiResponse<Match[]>> {
    const params = round ? `?round=${round}` : "";
    return this.get<ApiResponse<Match[]>>(
      `/tournaments/${tournamentId}/matches${params}`,
    );
  }

  async checkInTeam(
    tournamentId: string,
    teamId: string,
    present: boolean = true,
  ): Promise<ApiResponse<LiveTournament>> {
    return this.post<ApiResponse<LiveTournament>>(
      `/tournaments/${tournamentId}/checkin`,
      { teamId, present },
    );
  }

  async generateMatches(
    tournamentId: string,
    round: string,
  ): Promise<ApiResponse<Match[]>> {
    await ensureFreshToken();
    return this.post<ApiResponse<Match[]>>(
      `/tournaments/${tournamentId}/generate-matches`,
      { round },
    );
  }

  async confirmCompletedMatches(
    tournamentId: string,
  ): Promise<ApiResponse<{ updated: number }>> {
    await ensureFreshToken();
    return this.post<ApiResponse<{ updated: number }>>(
      `/tournaments/${tournamentId}/matches/confirm-completed`,
      {},
    );
  }

  async calculateStandings(
    tournamentId: string,
  ): Promise<ApiResponse<TournamentResult[]>> {
    return this.get<ApiResponse<TournamentResult[]>>(
      `/tournaments/${tournamentId}/standings`,
    );
  }

  async getLiveStats(
    tournamentId: string,
  ): Promise<ApiResponse<LiveTournamentStats>> {
    return this.get<ApiResponse<LiveTournamentStats>>(
      `/tournaments/${tournamentId}/live-stats`,
    );
  }

  async getTournamentPlayerStats(
    tournamentId: string,
  ): Promise<ApiResponse<any>> {
    return this.get<ApiResponse<any>>(
      `/tournaments/${tournamentId}/player-stats`,
    );
  }

  // Tournament Result API methods
  async getTournamentResults(
    filters?: TournamentResultFilters & PaginationOptions,
  ): Promise<PaginatedResponse<TournamentResult>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    return this.get<PaginatedResponse<TournamentResult>>(
      `/tournament-results?${params.toString()}`,
    );
  }

  async getTournamentResult(
    id: string,
  ): Promise<ApiResponse<TournamentResult>> {
    return this.get<ApiResponse<TournamentResult>>(`/tournament-results/${id}`);
  }

  async createTournamentResult(
    data: TournamentResultInput,
  ): Promise<ApiResponse<TournamentResult>> {
    return this.post<ApiResponse<TournamentResult>>(
      "/tournament-results",
      data,
    );
  }

  async updateTournamentResult(
    id: string,
    data: Partial<TournamentResultInput>,
  ): Promise<ApiResponse<TournamentResult>> {
    return this.put<ApiResponse<TournamentResult>>(
      `/tournament-results/${id}`,
      data,
    );
  }

  async deleteTournamentResult(id: string): Promise<ApiResponse> {
    return this.delete<ApiResponse>(`/tournament-results/${id}`);
  }

  async getTournamentResultStats(): Promise<ApiResponse> {
    return this.get<ApiResponse>("/tournament-results/stats");
  }

  async getResultsByTournament(tournamentId: string): Promise<ApiResponse> {
    return this.get<ApiResponse>(
      `/tournament-results/tournament/${tournamentId}`,
    );
  }

  async getResultsByPlayer(playerId: string): Promise<
    ApiResponse<{
      player: Player;
      results: (TournamentResult & { tournamentId: Tournament })[];
      stats: any;
    }>
  > {
    return this.get<
      ApiResponse<{
        player: Player;
        results: (TournamentResult & { tournamentId: Tournament })[];
        stats: any;
      }>
    >(`/tournament-results/player/${playerId}`);
  }

  async getLeaderboard(filters?: {
    tournamentId?: string;
    format?: string;
    year?: number | string;
    limit?: number;
    sort?: string;
  }): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    return this.get<ApiResponse>(
      `/tournament-results/leaderboard?${params.toString()}`,
    );
  }

  async getAvailableYears(): Promise<
    ApiResponse<{ min: number; max: number }>
  > {
    return this.get<ApiResponse<{ min: number; max: number }>>(
      "/tournament-results/years",
    );
  }

  // Admin API methods
  async updateTournamentStatus(
    id: string,
    status: string,
  ): Promise<ApiResponse<Tournament>> {
    return this.put<ApiResponse<Tournament>>(
      `/admin/tournaments/${id}/status`,
      { status },
    );
  }

  async addPlayersToTournament(
    id: string,
    playerIds: string[],
  ): Promise<ApiResponse<Tournament>> {
    return this.post<ApiResponse<Tournament>>(
      `/admin/tournaments/${id}/players`,
      { playerIds },
    );
  }

  async removePlayerFromTournament(
    id: string,
    playerId: string,
  ): Promise<ApiResponse<Tournament>> {
    return this.delete<ApiResponse<Tournament>>(
      `/admin/tournaments/${id}/players/${playerId}`,
    );
  }

  async generateTournamentMatches(
    id: string,
    bracketType = "single-elimination",
  ): Promise<ApiResponse<{ tournament: Tournament; matches: any[] }>> {
    return this.post<ApiResponse<{ tournament: Tournament; matches: any[] }>>(
      `/admin/tournaments/${id}/generate-matches`,
      { bracketType },
    );
  }

  async updateMatchScore(
    matchId: string,
    team1Score?: number,
    team2Score?: number,
    notes?: string,
  ): Promise<ApiResponse<any>> {
    return this.put<ApiResponse<any>>(`/admin/tournaments/matches/${matchId}`, {
      team1Score,
      team2Score,
      notes,
    });
  }

  async finalizeTournament(id: string): Promise<ApiResponse<Tournament>> {
    return this.put<ApiResponse<Tournament>>(
      `/admin/tournaments/${id}/finalize`,
    );
  }

  async getTournamentWithMatches(
    id: string,
  ): Promise<
    ApiResponse<{ tournament: Tournament; matches: any[]; results: any[] }>
  > {
    return this.get<
      ApiResponse<{ tournament: Tournament; matches: any[]; results: any[] }>
    >(`/admin/tournaments/${id}/details`);
  }

  async deleteTournamentAdmin(id: string): Promise<ApiResponse<null>> {
    return this.delete<ApiResponse<null>>(`/admin/tournaments/${id}`);
  }

  // User Management API methods
  async getUsers(filters?: UserFilters): Promise<ApiResponse<User[]>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    return this.get<ApiResponse<User[]>>(`/admin/users?${params.toString()}`);
  }

  async getUser(id: string): Promise<ApiResponse<User>> {
    return this.get<ApiResponse<User>>(`/admin/users/${id}`);
  }

  async createUser(data: CreateUserInput): Promise<ApiResponse<User>> {
    return this.post<ApiResponse<User>>("/admin/users", data);
  }

  async updateUser(
    id: string,
    data: UpdateUserInput,
  ): Promise<ApiResponse<User>> {
    return this.put<ApiResponse<User>>(`/admin/users/${id}`, data);
  }

  async deleteUser(id: string): Promise<ApiResponse> {
    return this.delete<ApiResponse>(`/admin/users/${id}`);
  }

  async resetUserPassword(
    id: string,
    data: ResetPasswordInput,
  ): Promise<ApiResponse> {
    return this.post<ApiResponse>(`/admin/users/${id}/password`, data);
  }

  async updateUserRoles(id: string, roles: string[]): Promise<ApiResponse> {
    return this.put<ApiResponse>(`/admin/users/${id}/roles`, { roles });
  }

  async getAvailableRoles(): Promise<ApiResponse<UserRole[]>> {
    return this.get<ApiResponse<UserRole[]>>("/admin/users/roles");
  }

  async claimUser(email: string, playerId: string): Promise<ApiResponse> {
    return this.post<ApiResponse>("/admin/users/claim", { email, playerId });
  }

  async requestPasswordReset(email: string): Promise<ApiResponse> {
    return this.post<ApiResponse>("/auth/forgot-password", { email });
  }

  // System Settings API methods
  async getSystemStatus(): Promise<ApiResponse<{ initialized: boolean }>> {
    return this.get<ApiResponse<{ initialized: boolean }>>("/system/status");
  }

  async claimSuperAdmin(): Promise<ApiResponse> {
    await ensureFreshToken();
    return this.post<ApiResponse>("/system/claim-admin", {});
  }

  async getSystemSettings(): Promise<SystemSettings> {
    return this.get<SystemSettings>("/settings");
  }

  async updateSystemSettings(settings: {
    activeProvider?: "mailjet" | "mailgun";
    mailjetApiKey?: string;
    mailjetApiSecret?: string;
    mailjetSenderEmail?: string;
    mailgunApiKey?: string;
    mailgunDomain?: string;
    siteLogo?: string;
    siteLogoUrl?: string;
    favicon?: string;
    brandName?: string;
    brandPrimaryColor?: string;
    brandSecondaryColor?: string;
  }): Promise<ApiResponse> {
    return this.put<ApiResponse>("/settings", settings);
  }

  async testEmail(email: string): Promise<ApiResponse> {
    return this.post<ApiResponse>("/settings/email/test", { testEmail: email });
  }

  async isEmailConfigured(): Promise<{ configured: boolean }> {
    const response = await this.get<ApiResponse<{ configured: boolean }>>(
      "/settings/email/status",
    );
    return response.data || { configured: false };
  }

  // Health check
  async healthCheck(): Promise<ApiResponse> {
    return this.get<ApiResponse>("/health");
  }

  // Profile API methods
  async getProfile(): Promise<
    ApiResponse<{ user: User; player: Player | null; isComplete: boolean }>
  > {
    return this.get<
      ApiResponse<{ user: User; player: Player | null; isComplete: boolean }>
    >("/profile");
  }

  async updateProfile(data: {
    gender: string;
    bracketPreference: string;
  }): Promise<ApiResponse<Player>> {
    return this.put<ApiResponse<Player>>("/profile", data);
  }

  async linkPlayerToProfile(playerId: string): Promise<ApiResponse<User>> {
    return this.post<ApiResponse<User>>("/profile/link-player", { playerId });
  }

  async changePassword(data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<ApiResponse> {
    return this.post<ApiResponse>("/profile/password", data);
  }

  async sendVerificationEmail(): Promise<ApiResponse> {
    return this.post<ApiResponse>("/auth/verify-email-request", {});
  }
}

export const apiClient = new ApiClient();
export default apiClient;
