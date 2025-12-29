import type { Player, Tournament, Match, TournamentResult, LiveTournament } from "../types/api";
import type { User } from "../types/user";

export const mockUser: User = {
    id: "user-123",
    username: "jdoe",
    email: "jdoe@example.com",
    firstName: "John",
    lastName: "Doe",
    fullName: "John Doe",
    roles: ["player"],
    isAdmin: false,
    isSuperAdmin: false,
    enabled: true,
    createdAt: new Date("2023-01-01T00:00:00Z"),
    lastLogin: new Date("2023-01-01T00:00:00Z"),
};

export const mockAdmin: User = {
    ...mockUser,
    id: "admin-456",
    username: "admin",
    roles: ["superadmin"],
    isAdmin: true,
    isSuperAdmin: true,
};

export const mockPlayer: Player = {
    _id: "player-123",
    id: "player-123",
    name: "John Doe",
    email: "jdoe@example.com",
    isActive: true,
    createdAt: "2023-01-01T00:00:00Z",
    updatedAt: "2023-01-01T00:00:00Z",
    bodsPlayed: 5,
    bestResult: 1,
    avgFinish: 2.5,
    gamesPlayed: 25,
    gamesWon: 18,
    winningPercentage: 0.72,
    individualChampionships: 1,
    divisionChampionships: 2,
    totalChampionships: 3,
};

export const mockTournament: Tournament = {
    _id: "tourney-001",
    id: "tourney-001",
    bodNumber: 42,
    date: "2023-12-01T09:00:00Z",
    location: "Main Courts",
    format: "Mixed",
    bracketType: "single_elimination",
    advancementCriteria: "Round Robin wins",
    status: "active",
    players: [
        { _id: "player-123", name: "John Doe" },
        { _id: "player-456", name: "Jane Smith" }
    ],
    maxPlayers: 16,
    registrationType: "open",
    allowSelfRegistration: true,
    createdAt: "2023-11-01T00:00:00Z",
    updatedAt: "2023-11-01T00:00:00Z",
};

export const mockLiveTournament: LiveTournament = {
    ...mockTournament,
    phase: {
        phase: "setup",
        currentRound: "quarterfinal",
        roundStatus: "not_started",
        totalMatches: 0,
        completedMatches: 0,
        canAdvance: false,
    },
    teams: [
        {
            teamId: "team-1",
            teamName: "Doe/Smith",
            players: [], // Not really used in this context
            combinedSeed: 1,
            combinedStatistics: {
                avgFinish: 1,
                combinedWinPercentage: 0.9,
                totalChampionships: 2,
                combinedBodsPlayed: 10
            }
        }
    ],
    matches: [],
    currentStandings: [],
    bracketProgression: {
        quarterFinalists: [],
        semiFinalists: [],
        finalists: [],
    },
    checkInStatus: {}
};

export const mockMatch: Match = {
    _id: "match-001",
    id: "match-001",
    tournamentId: "tourney-001",
    round: "semifinal",
    matchNumber: 1,
    team1: {
        teamId: "team-1",
        teamName: "Doe/Smith",
        score: 6,
        players: [mockPlayer],
    },
    team2: {
        teamId: "team-2",
        teamName: "Brown/Wilson",
        score: 4,
        players: [],
    },
    status: "completed",
    createdAt: "2023-12-01T10:00:00Z",
    updatedAt: "2023-12-01T11:00:00Z",
};

export const mockTournamentResult: TournamentResult = {
    _id: "res-001",
    id: "res-001",
    tournamentId: "tourney-001",
    players: [mockPlayer],
    seed: 1,
    totalStats: {
        totalPlayed: 5,
        totalWon: 4,
        totalLost: 1,
        winPercentage: 0.8,
        bodFinish: 1,
        finalRank: 1,
    },
    roundRobinScores: {
        rrPlayed: 3,
        rrWon: 3,
        rrLost: 0,
    },
    bracketScores: {
        bracketPlayed: 2,
        bracketWon: 1,
        bracketLost: 1,
        qfWon: 1,
        sfWon: 0,
        finalsWon: 0,
    },
    createdAt: "2023-12-01T12:00:00Z",
    updatedAt: "2023-12-01T12:00:00Z",
};
