import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import PlayerLeaderboard from "../PlayerLeaderboard";
import apiClient from "../../../services/api";

// Mock API
vi.mock("../../../services/api", () => ({
    default: {
        getTournamentPlayerStats: vi.fn(),
    },
}));

describe("PlayerLeaderboard", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render leaderboard header", () => {
        // Mock to never resolve so we only see initial render
        vi.mocked(apiClient.getTournamentPlayerStats).mockReturnValue(new Promise(() => { }));
        render(<PlayerLeaderboard tournamentId="t1" />);
        expect(screen.getByText("Player Leaderboard")).toBeInTheDocument();
    });

    it("should display player names", async () => {
        vi.mocked(apiClient.getTournamentPlayerStats).mockResolvedValue({
            success: true,
            data: [
                { playerId: "p1", playerName: "Alice", totalPoints: 10, matchesWithPoints: 2, wins: 2, losses: 0 },
                { playerId: "p2", playerName: "Bob", totalPoints: 5, matchesWithPoints: 1, wins: 1, losses: 0 },
            ],
        } as any);

        render(<PlayerLeaderboard tournamentId="t1" />);

        await waitFor(() => {
            expect(screen.getByText("Alice")).toBeInTheDocument();
            expect(screen.getByText("Bob")).toBeInTheDocument();
        });
    });

    it("should display wins", async () => {
        vi.mocked(apiClient.getTournamentPlayerStats).mockResolvedValue({
            success: true,
            data: [
                { playerId: "p1", playerName: "Alice", totalPoints: 10, matchesWithPoints: 2, wins: 5, losses: 0 },
            ],
        } as any);

        render(<PlayerLeaderboard tournamentId="t1" />);

        await waitFor(() => {
            expect(screen.getByText("5")).toBeInTheDocument(); // Wins column
        });
    });

    it("should show empty state when no players", async () => {
        vi.mocked(apiClient.getTournamentPlayerStats).mockResolvedValue({
            success: true,
            data: [],
        } as any);

        render(<PlayerLeaderboard tournamentId="t1" />);

        await waitFor(() => {
            expect(screen.getByText(/No stats available/i)).toBeInTheDocument();
        });
    });
});
