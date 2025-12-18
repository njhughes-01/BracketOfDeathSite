"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiClient = exports.setTokenGetter = void 0;
const axios_1 = __importDefault(require("axios"));
let getKeycloakToken = null;
const setTokenGetter = (getter) => {
    getKeycloakToken = getter;
};
exports.setTokenGetter = setTokenGetter;
class ApiClient {
    client;
    constructor() {
        this.client = axios_1.default.create({
            baseURL: import.meta.env.VITE_API_URL || '/api',
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
        this.client.interceptors.request.use((config) => {
            const token = getKeycloakToken?.();
            console.log('API Request:', {
                url: config.url,
                hasTokenGetter: !!getKeycloakToken,
                hasToken: !!token,
                tokenStart: token ? token.substring(0, 20) : 'none'
            });
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        }, (error) => Promise.reject(error));
        this.client.interceptors.response.use((response) => response, async (error) => {
            if (error.response?.status === 401) {
                console.warn('Authentication failed - redirecting to login');
            }
            if (error.response?.status === 429) {
                const retryAfter = error.response.headers['retry-after'] || 1;
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                return this.client.request(error.config);
            }
            return Promise.reject(error);
        });
    }
    async get(url, config) {
        const response = await this.client.get(url, config);
        return response.data;
    }
    async post(url, data, config) {
        const response = await this.client.post(url, data, config);
        return response.data;
    }
    async put(url, data, config) {
        const response = await this.client.put(url, data, config);
        return response.data;
    }
    async delete(url, config) {
        const response = await this.client.delete(url, config);
        return response.data;
    }
    async getPlayers(filters) {
        const params = new URLSearchParams();
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    params.append(key, value.toString());
                }
            });
        }
        return this.get(`/players?${params.toString()}`);
    }
    async getPlayer(id) {
        return this.get(`/players/${id}`);
    }
    async createPlayer(data) {
        return this.post('/players', data);
    }
    async updatePlayer(id, data) {
        return this.put(`/players/${id}`, data);
    }
    async deletePlayer(id) {
        return this.delete(`/players/${id}`);
    }
    async getPlayerStats() {
        return this.get('/players/stats');
    }
    async getChampions(minChampionships = 1) {
        return this.get(`/players/champions?min=${minChampionships}`);
    }
    async searchPlayers(query, options) {
        const params = new URLSearchParams({ q: query });
        if (options) {
            Object.entries(options).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    params.append(key, value.toString());
                }
            });
        }
        return this.get(`/players/search?${params.toString()}`);
    }
    async getTournaments(filters) {
        const params = new URLSearchParams();
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    params.append(key, value.toString());
                }
            });
        }
        return this.get(`/tournaments?${params.toString()}`);
    }
    async getTournament(id) {
        return this.get(`/tournaments/${id}`);
    }
    async createTournament(data) {
        return this.post('/tournaments', data);
    }
    async updateTournament(id, data) {
        return this.put(`/tournaments/${id}`, data);
    }
    async deleteTournament(id, cascade = false) {
        return this.delete(`/tournaments/${id}?cascade=${cascade}`);
    }
    async getTournamentStats() {
        return this.get('/tournaments/stats');
    }
    async getTournamentsByYear(year) {
        return this.get(`/tournaments/year/${year}`);
    }
    async getTournamentsByFormat(format) {
        return this.get(`/tournaments/format/${format}`);
    }
    async getUpcomingTournaments(limit = 10) {
        return this.get(`/tournaments/upcoming?limit=${limit}`);
    }
    async getRecentTournaments(limit = 10) {
        return this.get(`/tournaments/recent?limit=${limit}`);
    }
    async getNextBodNumber() {
        return this.get('/tournaments/next-bod-number');
    }
    async generatePlayerSeeds(config) {
        return this.post('/tournaments/generate-seeds', config);
    }
    async generateTeams(playerIds, config) {
        return this.post('/tournaments/generate-teams', { playerIds, config });
    }
    async setupTournament(setup) {
        return this.post('/tournaments/setup', setup);
    }
    async getLiveTournament(tournamentId) {
        return this.get(`/tournaments/${tournamentId}/live`);
    }
    async executeTournamentAction(tournamentId, action) {
        return this.post(`/tournaments/${tournamentId}/action`, action);
    }
    async updateMatch(matchUpdate) {
        return this.put(`/matches/${matchUpdate.matchId}`, matchUpdate);
    }
    async getTournamentMatches(tournamentId, round) {
        const params = round ? `?round=${round}` : '';
        return this.get(`/tournaments/${tournamentId}/matches${params}`);
    }
    async checkInTeam(tournamentId, teamId, present = true) {
        return this.post(`/tournaments/${tournamentId}/checkin`, { teamId, present });
    }
    async generateMatches(tournamentId, round) {
        return this.post(`/tournaments/${tournamentId}/generate-matches`, { round });
    }
    async calculateStandings(tournamentId) {
        return this.get(`/tournaments/${tournamentId}/standings`);
    }
    async getLiveStats(tournamentId) {
        return this.get(`/tournaments/${tournamentId}/live-stats`);
    }
    async getTournamentResults(filters) {
        const params = new URLSearchParams();
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    params.append(key, value.toString());
                }
            });
        }
        return this.get(`/tournament-results?${params.toString()}`);
    }
    async getTournamentResult(id) {
        return this.get(`/tournament-results/${id}`);
    }
    async createTournamentResult(data) {
        return this.post('/tournament-results', data);
    }
    async updateTournamentResult(id, data) {
        return this.put(`/tournament-results/${id}`, data);
    }
    async deleteTournamentResult(id) {
        return this.delete(`/tournament-results/${id}`);
    }
    async getTournamentResultStats() {
        return this.get('/tournament-results/stats');
    }
    async getResultsByTournament(tournamentId) {
        return this.get(`/tournament-results/tournament/${tournamentId}`);
    }
    async getResultsByPlayer(playerId) {
        return this.get(`/tournament-results/player/${playerId}`);
    }
    async getLeaderboard(filters) {
        const params = new URLSearchParams();
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    params.append(key, value.toString());
                }
            });
        }
        return this.get(`/tournament-results/leaderboard?${params.toString()}`);
    }
    async updateTournamentStatus(id, status) {
        return this.put(`/admin/tournaments/${id}/status`, { status });
    }
    async addPlayersToTournament(id, playerIds) {
        return this.post(`/admin/tournaments/${id}/players`, { playerIds });
    }
    async removePlayerFromTournament(id, playerId) {
        return this.delete(`/admin/tournaments/${id}/players/${playerId}`);
    }
    async generateTournamentMatches(id, bracketType = 'single-elimination') {
        return this.post(`/admin/tournaments/${id}/generate-matches`, { bracketType });
    }
    async updateMatchScore(matchId, team1Score, team2Score, notes) {
        return this.put(`/admin/tournaments/matches/${matchId}`, { team1Score, team2Score, notes });
    }
    async finalizeTournament(id) {
        return this.put(`/admin/tournaments/${id}/finalize`);
    }
    async getTournamentWithMatches(id) {
        return this.get(`/admin/tournaments/${id}/details`);
    }
    async getUsers(filters) {
        const params = new URLSearchParams();
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    params.append(key, value.toString());
                }
            });
        }
        return this.get(`/admin/users?${params.toString()}`);
    }
    async getUser(id) {
        return this.get(`/admin/users/${id}`);
    }
    async createUser(data) {
        return this.post('/admin/users', data);
    }
    async updateUser(id, data) {
        return this.put(`/admin/users/${id}`, data);
    }
    async deleteUser(id) {
        return this.delete(`/admin/users/${id}`);
    }
    async resetUserPassword(id, data) {
        return this.post(`/admin/users/${id}/password`, data);
    }
    async updateUserRoles(id, roles) {
        return this.put(`/admin/users/${id}/roles`, { roles });
    }
    async getAvailableRoles() {
        return this.get('/admin/users/roles');
    }
    async healthCheck() {
        return this.get('/health');
    }
}
exports.apiClient = new ApiClient();
exports.default = exports.apiClient;
//# sourceMappingURL=api.js.map