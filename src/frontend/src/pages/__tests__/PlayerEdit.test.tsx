import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import PlayerEdit from "../PlayerEdit";

// Mock dependencies
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return {
        ...actual,
        useParams: () => ({ id: "player-123" }),
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
        getPlayer: vi.fn().mockResolvedValue({ success: true, data: {} }),
        updatePlayer: vi.fn().mockResolvedValue({ success: true }),
    },
}));

import { useApi } from "../../hooks/useApi";

const mockUseApi = useApi as ReturnType<typeof vi.fn>;

describe("PlayerEdit", () => {
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

        renderWithRouter(<PlayerEdit />);

        expect(document.querySelector(".animate-spin, .animate-pulse")).toBeInTheDocument();
    });

    it("should show error state", () => {
        mockUseApi.mockReturnValue({
            data: null,
            loading: false,
            error: "Player not found",
        });

        renderWithRouter(<PlayerEdit />);

        expect(screen.getByText(/error|not found/i)).toBeInTheDocument();
    });

    it("should render edit form with player data", () => {
        const mockPlayer = {
            id: "player-123",
            firstName: "John",
            lastName: "Doe",
            gender: "male",
        };

        mockUseApi.mockReturnValue({
            data: { data: mockPlayer },
            loading: false,
            error: null,
        });

        renderWithRouter(<PlayerEdit />);

        expect(screen.getByText(/edit|update/i)).toBeInTheDocument();
    });

    it("should have save button", () => {
        mockUseApi.mockReturnValue({
            data: { data: { firstName: "Test", lastName: "User" } },
            loading: false,
            error: null,
        });

        renderWithRouter(<PlayerEdit />);

        const saveButton = screen.getByRole("button", { name: /save|update|submit/i });
        expect(saveButton).toBeInTheDocument();
    });
});
