import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Settings from "../admin/Settings";

// Mock dependencies
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
        user: { username: "Admin", roles: ["admin", "superadmin"] },
        isAdmin: true,
    }),
}));

vi.mock("../../services/api", () => ({
    default: {
        getSettings: vi.fn().mockResolvedValue({ success: true, data: {} }),
        updateSettings: vi.fn().mockResolvedValue({ success: true }),
    },
}));

import { useApi } from "../../hooks/useApi";

const mockUseApi = useApi as ReturnType<typeof vi.fn>;

describe("Settings", () => {
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

        renderWithRouter(<Settings />);

        expect(document.querySelector(".animate-spin, .animate-pulse")).toBeInTheDocument();
    });

    it("should render settings page", () => {
        mockUseApi.mockReturnValue({
            data: { data: {} },
            loading: false,
            error: null,
        });

        renderWithRouter(<Settings />);

        expect(screen.getByText(/settings/i)).toBeInTheDocument();
    });

    it("should have email settings section", () => {
        mockUseApi.mockReturnValue({
            data: { data: { emailProvider: "mailjet" } },
            loading: false,
            error: null,
        });

        renderWithRouter(<Settings />);

        expect(screen.getByText(/email/i)).toBeInTheDocument();
    });

    it("should have save button", () => {
        mockUseApi.mockReturnValue({
            data: { data: {} },
            loading: false,
            error: null,
        });

        renderWithRouter(<Settings />);

        const saveButton = screen.getByRole("button", { name: /save|update|apply/i });
        expect(saveButton).toBeInTheDocument();
    });
});
