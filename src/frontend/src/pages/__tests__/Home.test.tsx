import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Home from "../Home";

// Mock dependencies
vi.mock("../../hooks/useApi", () => ({
    useApi: vi.fn().mockReturnValue({
        data: [],
        loading: false,
        error: null,
    }),
}));

vi.mock("../../contexts/AuthContext", () => ({
    useAuth: vi.fn().mockReturnValue({
        user: { username: "TestUser", roles: ["user"] },
        isAdmin: false,
    }),
}));

vi.mock("../../services/api", () => ({
    default: {
        getSystemStatus: vi.fn().mockResolvedValue({ data: { initialized: true } }),
        getRecentTournaments: vi.fn().mockResolvedValue({ success: true, data: [] }),
        getUpcomingTournaments: vi.fn().mockResolvedValue({ success: true, data: [] }),
        getTournamentMatches: vi.fn().mockResolvedValue({ success: true, data: [] }),
    },
}));

import { useApi } from "../../hooks/useApi";
import { useAuth } from "../../contexts/AuthContext";

const mockUseApi = useApi as ReturnType<typeof vi.fn>;
const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

describe("Home", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseAuth.mockReturnValue({
            user: { username: "TestUser", roles: ["user"] },
            isAdmin: false,
        });
    });

    const renderWithRouter = (component: React.ReactElement) => {
        return render(<BrowserRouter>{component}</BrowserRouter>);
    };

    it("should render welcome message with username", async () => {
        mockUseApi.mockReturnValue({
            data: [],
            loading: false,
            error: null,
        });

        renderWithRouter(<Home />);

        expect(screen.getByText("Welcome back")).toBeInTheDocument();
        expect(screen.getByText("TestUser")).toBeInTheDocument();
    });

    it("should render Guest when no user", async () => {
        mockUseAuth.mockReturnValue({
            user: null,
            isAdmin: false,
        });
        mockUseApi.mockReturnValue({
            data: [],
            loading: false,
            error: null,
        });

        renderWithRouter(<Home />);

        expect(screen.getByText("Guest")).toBeInTheDocument();
    });

    it("should render quick action links", () => {
        mockUseApi.mockReturnValue({
            data: [],
            loading: false,
            error: null,
        });

        renderWithRouter(<Home />);

        expect(screen.getByText("Register")).toBeInTheDocument();
        expect(screen.getByText("Schedule")).toBeInTheDocument();
        expect(screen.getByText("Rankings")).toBeInTheDocument();
        expect(screen.getByText("News")).toBeInTheDocument();
    });

    it("should show loading state", () => {
        mockUseApi.mockReturnValue({
            data: null,
            loading: true,
            error: null,
        });

        renderWithRouter(<Home />);

        // Should show loading placeholder
        expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
    });

    it("should show no upcoming message when list is empty", () => {
        mockUseApi.mockReturnValue({
            data: [],
            loading: false,
            error: null,
        });

        renderWithRouter(<Home />);

        expect(screen.getByText("No Upcoming Events")).toBeInTheDocument();
    });

    it("should render upcoming tournaments section", () => {
        const mockTournaments = [
            {
                id: "t1",
                name: "Summer Open",
                format: "Mixed",
                date: "2025-07-15",
                location: "Central Court",
                bodNumber: 202507,
            },
        ];

        mockUseApi
            .mockReturnValueOnce({ data: [], loading: false, error: null }) // recent
            .mockReturnValueOnce({ data: mockTournaments, loading: false, error: null }) // upcoming
            .mockReturnValueOnce({ data: [], loading: false, error: null }); // finals

        renderWithRouter(<Home />);

        expect(screen.getByText("Upcoming Tournaments")).toBeInTheDocument();
    });
});
