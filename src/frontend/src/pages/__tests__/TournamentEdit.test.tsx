import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TournamentEdit from "../TournamentEdit";

// Mock dependencies
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return {
        ...actual,
        useParams: () => ({ id: "tournament-123" }),
        useNavigate: () => vi.fn(),
    };
});

vi.mock("../../hooks/useApi", () => ({
    useApi: vi.fn(),
    useMutation: vi.fn().mockReturnValue({
        mutate: vi.fn(),
        loading: false,
        error: null,
    }),
}));

vi.mock("../../contexts/AuthContext", () => ({
    useAuth: vi.fn().mockReturnValue({
        user: { username: "Admin", roles: ["admin"] },
        isAdmin: true,
    }),
}));

vi.mock("../../services/api", () => ({
    default: {
        getTournament: vi.fn().mockResolvedValue({ success: true, data: {} }),
        updateTournament: vi.fn().mockResolvedValue({ success: true }),
    },
}));

import { useApi } from "../../hooks/useApi";

const mockUseApi = useApi as ReturnType<typeof vi.fn>;

describe("TournamentEdit", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderWithRouter = (component: React.ReactElement) => {
        return render(<BrowserRouter>{component}</BrowserRouter>);
    };

    it("should show loading state", () => {
        mockUseApi.mockReturnValue({
            data: null,
            loading: true,
            error: null,
        });

        renderWithRouter(<TournamentEdit />);

        expect(document.querySelector(".animate-spin, .animate-pulse")).toBeInTheDocument();
    });

    it("should show error state", () => {
        mockUseApi.mockReturnValue({
            data: null,
            loading: false,
            error: "Tournament not found",
        });

        renderWithRouter(<TournamentEdit />);

        expect(screen.getByText(/error|not found/i)).toBeInTheDocument();
    });

    it("should render edit form with tournament data", () => {
        const mockTournament = {
            id: "tournament-123",
            name: "Summer Championship",
            bodNumber: 202507,
        };

        mockUseApi.mockReturnValue({
            data: { data: mockTournament },
            loading: false,
            error: null,
        });

        renderWithRouter(<TournamentEdit />);

        expect(screen.getByText(/edit|update/i)).toBeInTheDocument();
    });

    it("should have save button", () => {
        mockUseApi.mockReturnValue({
            data: { data: { name: "Test Tournament" } },
            loading: false,
            error: null,
        });

        renderWithRouter(<TournamentEdit />);

        const saveButton = screen.getByRole("button", { name: /save|update|submit/i });
        expect(saveButton).toBeInTheDocument();
    });
});
