import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import PlayerCreate from "../PlayerCreate";

// Mock dependencies
vi.mock("../../hooks/useApi", () => ({
    useApi: vi.fn().mockReturnValue({
        data: null,
        loading: false,
        error: null,
    }),
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
        createPlayer: vi.fn().mockResolvedValue({ success: true }),
    },
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe("PlayerCreate", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderWithRouter = (component: React.ReactElement) => {
        return render(<BrowserRouter>{component}</BrowserRouter>);
    };

    it("should render create player form", () => {
        renderWithRouter(<PlayerCreate />);

        expect(screen.getByText(/create|new|add/i)).toBeInTheDocument();
    });

    it("should have first name input", () => {
        renderWithRouter(<PlayerCreate />);

        const firstNameInput = screen.getByLabelText(/first name/i) ||
            screen.getByPlaceholderText(/first name/i);
        expect(firstNameInput).toBeInTheDocument();
    });

    it("should have last name input", () => {
        renderWithRouter(<PlayerCreate />);

        const lastNameInput = screen.getByLabelText(/last name/i) ||
            screen.getByPlaceholderText(/last name/i);
        expect(lastNameInput).toBeInTheDocument();
    });

    it("should have gender select", () => {
        renderWithRouter(<PlayerCreate />);

        expect(screen.getByText(/gender/i)).toBeInTheDocument();
    });

    it("should have submit button", () => {
        renderWithRouter(<PlayerCreate />);

        const submitButton = screen.getByRole("button", { name: /create|save|submit/i });
        expect(submitButton).toBeInTheDocument();
    });

    it("should have cancel button", () => {
        renderWithRouter(<PlayerCreate />);

        const cancelButton = screen.getByRole("button", { name: /cancel|back/i }) ||
            screen.getByRole("link", { name: /cancel|back/i });
        expect(cancelButton).toBeInTheDocument();
    });
});
