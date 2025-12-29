import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Results from "../Results";

// Mock dependencies
vi.mock("../../hooks/useApi", () => ({
    useApi: vi.fn(),
}));

vi.mock("../../services/api", () => ({
    default: {
        getTournamentResults: vi.fn().mockResolvedValue({ success: true, data: [] }),
        getTournaments: vi.fn().mockResolvedValue({ success: true, data: [] }),
    },
}));

import { useApi } from "../../hooks/useApi";

const mockUseApi = useApi as ReturnType<typeof vi.fn>;

describe("Results", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderWithRouter = (component: React.ReactElement) => {
        return render(<BrowserRouter>{component}</BrowserRouter>);
    };

    it("should render page title", () => {
        mockUseApi.mockReturnValue({
            data: null,
            loading: false,
            error: null,
        });

        renderWithRouter(<Results />);

        expect(screen.getByText("Tournament Results")).toBeInTheDocument();
    });

    it("should render filter controls", () => {
        mockUseApi.mockReturnValue({
            data: null,
            loading: false,
            error: null,
        });

        renderWithRouter(<Results />);

        expect(screen.getByText("Tournament")).toBeInTheDocument();
        expect(screen.getByText("Year")).toBeInTheDocument();
        expect(screen.getByText("Division")).toBeInTheDocument();
        expect(screen.getByText("Sort By")).toBeInTheDocument();
    });

    it("should show loading state", () => {
        mockUseApi.mockReturnValue({
            data: null,
            loading: true,
            error: null,
        });

        renderWithRouter(<Results />);

        expect(screen.getByText("Loading results...")).toBeInTheDocument();
    });

    it("should show error state", () => {
        mockUseApi.mockReturnValue({
            data: null,
            loading: false,
            error: "Failed to load results",
        });

        renderWithRouter(<Results />);

        expect(screen.getByText("Error loading results")).toBeInTheDocument();
        expect(screen.getByText("Failed to load results")).toBeInTheDocument();
    });

    it("should show empty state when no results", () => {
        mockUseApi.mockReturnValue({
            data: { data: [], pagination: { pages: 1 } },
            loading: false,
            error: null,
        });

        renderWithRouter(<Results />);

        expect(screen.getByText("No results found")).toBeInTheDocument();
        expect(screen.getByText("Clear all filters")).toBeInTheDocument();
    });

    it("should render results when data available", () => {
        const mockResults = {
            data: [
                {
                    id: "r1",
                    teamName: "Alpha Team",
                    tournament: { bodNumber: 202501, location: "Main Court", date: "2025-01-15" },
                    totalStats: { bodFinish: 1, totalWon: 5, totalPlayed: 7 },
                    division: "Open",
                },
            ],
            pagination: { pages: 1 },
        };

        mockUseApi.mockReturnValue({
            data: mockResults,
            loading: false,
            error: null,
        });

        renderWithRouter(<Results />);

        expect(screen.getByText("Alpha Team")).toBeInTheDocument();
        expect(screen.getByText("Champion")).toBeInTheDocument();
    });

    it("should show correct placement icons", () => {
        const results = {
            data: [
                {
                    id: "r1",
                    teamName: "Gold Team",
                    tournament: { bodNumber: 1, location: "Court", date: "2025-01-01" },
                    totalStats: { bodFinish: 1, totalWon: 5, totalPlayed: 6 },
                },
                {
                    id: "r2",
                    teamName: "Silver Team",
                    tournament: { bodNumber: 1, location: "Court", date: "2025-01-01" },
                    totalStats: { bodFinish: 2, totalWon: 4, totalPlayed: 6 },
                },
            ],
            pagination: { pages: 1 },
        };

        mockUseApi.mockReturnValue({
            data: results,
            loading: false,
            error: null,
        });

        renderWithRouter(<Results />);

        expect(screen.getByText("🥇")).toBeInTheDocument();
        expect(screen.getByText("🥈")).toBeInTheDocument();
    });

    it("should have View Tournaments link", () => {
        mockUseApi.mockReturnValue({
            data: null,
            loading: false,
            error: null,
        });

        renderWithRouter(<Results />);

        expect(screen.getByText("View Tournaments")).toBeInTheDocument();
    });
});
