import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import PlayerDetail from "../PlayerDetail";
import apiClient from "../../services/api";

// Mock dependencies
vi.mock("../../hooks/useApi", () => ({
    useApi: vi.fn(),
    useMutation: vi.fn(() => ({ mutate: vi.fn(), loading: false })),
}));

vi.mock("../../contexts/AuthContext", () => ({
    useAuth: vi.fn().mockReturnValue({ isAdmin: true }),
}));

vi.mock("../../services/api", () => ({
    default: {
        getPlayer: vi.fn(),
        getResultsByPlayer: vi.fn(),
        getPlayerScoring: vi.fn(),
        deletePlayer: vi.fn(),
    },
}));

vi.mock("react-router-dom", async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual,
        useParams: () => ({ id: "p1" }),
        useNavigate: () => vi.fn(),
    };
});

import { useApi } from "../../hooks/useApi";

describe("PlayerDetail", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default mock for useApi
        vi.mocked(useApi).mockImplementation((fn: any) => {
            if (fn.name === "getPlayer") {
                return { data: { name: "John Doe", winningPercentage: 0.6 }, loading: false, error: null };
            }
            return { data: null, loading: false, error: null };
        });
    });

    const renderWithRouter = (component: React.ReactElement) => {
        return render(<BrowserRouter>{component}</BrowserRouter>);
    };

    it("should show loading state", () => {
        vi.mocked(useApi).mockReturnValue({ data: null, loading: true, error: null });
        renderWithRouter(<PlayerDetail />);
        // Look for the pulse animation container
        expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
    });

    it("should show error state", () => {
        vi.mocked(useApi).mockReturnValue({ data: null, loading: false, error: "Not Found" });
        renderWithRouter(<PlayerDetail />);
        expect(screen.getByText(/Player Not Found/i)).toBeInTheDocument();
    });

    it("should render player name when data loads", async () => {
        vi.mocked(useApi).mockImplementation((fn: any) => {
            if (fn.toString().includes("getPlayer")) {
                return { data: { name: "John Doe", winningPercentage: 0.6 }, loading: false, error: null };
            }
            return { data: null, loading: false, error: null };
        });

        renderWithRouter(<PlayerDetail />);

        await waitFor(() => {
            expect(screen.getByText("John Doe")).toBeInTheDocument();
        });
    });

    it("should display player stats", async () => {
        vi.mocked(useApi).mockImplementation((fn: any) => {
            if (fn.toString().includes("getPlayer")) {
                return {
                    data: { name: "John Doe", winningPercentage: 0.75, gamesPlayed: 20, totalChampionships: 2 },
                    loading: false, error: null
                };
            }
            return { data: null, loading: false, error: null };
        });

        renderWithRouter(<PlayerDetail />);

        await waitFor(() => {
            expect(screen.getByText("75%")).toBeInTheDocument();
            expect(screen.getByText("20")).toBeInTheDocument();
            expect(screen.getByText("2")).toBeInTheDocument();
        });
    });
});
