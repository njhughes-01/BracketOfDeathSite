import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import LiveStats from "../LiveStats";

// Mock API client
vi.mock("../../../services/api", () => ({
    default: {
        getLiveStats: vi.fn(),
    },
}));

// Mock LoadingSpinner
vi.mock("../../ui/LoadingSpinner", () => ({
    default: () => <div data-testid="loading-spinner">Loading...</div>,
}));

// Mock Card
vi.mock("../../ui/Card", () => ({
    default: ({ children, className }: { children: React.ReactNode; className?: string }) => (
        <div data-testid="card" className={className}>{children}</div>
    ),
}));

import apiClient from "../../../services/api";

const mockApiClient = apiClient as { getLiveStats: ReturnType<typeof vi.fn> };

describe("LiveStats", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderWithRouter = (component: React.ReactElement) => {
        return render(<BrowserRouter>{component}</BrowserRouter>);
    };

    it("should show loading state initially", () => {
        mockApiClient.getLiveStats.mockReturnValue(new Promise(() => { }));

        renderWithRouter(<LiveStats tournamentId="t1" />);

        expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    });

    it("should show error state on API failure", async () => {
        mockApiClient.getLiveStats.mockResolvedValue({
            success: false,
            error: "Failed to fetch",
        });

        renderWithRouter(<LiveStats tournamentId="t1" />);

        await waitFor(() => {
            expect(screen.getByText(/Failed to fetch/)).toBeInTheDocument();
        });
    });

    it("should render stats when API succeeds", async () => {
        mockApiClient.getLiveStats.mockResolvedValue({
            success: true,
            data: {
                currentPhase: "round_robin",
                currentRound: "Round 1",
                totalTeams: 8,
                totalMatches: 12,
                completedMatches: 4,
                inProgressMatches: 2,
                matchSummary: {
                    roundRobin: { total: 12, completed: 4, inProgress: 2 },
                    bracket: { total: 0, completed: 0, inProgress: 0 },
                },
                teamStandings: [],
            },
        });

        renderWithRouter(<LiveStats tournamentId="t1" />);

        await waitFor(() => {
            expect(screen.getByText("Live Tournament Status")).toBeInTheDocument();
        });
    });

    it("should display team count in compact mode", async () => {
        mockApiClient.getLiveStats.mockResolvedValue({
            success: true,
            data: {
                currentPhase: "bracket",
                totalTeams: 16,
                totalMatches: 15,
                completedMatches: 10,
                inProgressMatches: 1,
                matchSummary: {
                    roundRobin: { total: 0, completed: 0, inProgress: 0 },
                    bracket: { total: 15, completed: 10, inProgress: 1 },
                },
                teamStandings: [],
            },
        });

        renderWithRouter(<LiveStats tournamentId="t1" compact />);

        await waitFor(() => {
            expect(screen.getByText("Teams")).toBeInTheDocument();
        });
    });

    it("should have retry button on error", async () => {
        mockApiClient.getLiveStats.mockResolvedValue({
            success: false,
            error: "Network error",
        });

        renderWithRouter(<LiveStats tournamentId="t1" />);

        await waitFor(() => {
            expect(screen.getByText("Retry")).toBeInTheDocument();
        });
    });
});
