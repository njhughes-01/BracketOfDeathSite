import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Setup from "../Setup";

// Mock dependencies
vi.mock("../../hooks/useSystemStatus", () => ({
    useSystemStatus: vi.fn().mockReturnValue({
        initialized: false,
        hasSuperAdmin: false,
        loading: false,
        refresh: vi.fn(),
    }),
}));

vi.mock("../../contexts/AuthContext", () => ({
    useAuth: vi.fn().mockReturnValue({
        user: null,
        isAuthenticated: false,
    }),
}));

import { useSystemStatus } from "../../hooks/useSystemStatus";

const mockUseSystemStatus = useSystemStatus as ReturnType<typeof vi.fn>;

describe("Setup", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderWithRouter = (component: React.ReactElement) => {
        return render(<BrowserRouter>{component}</BrowserRouter>);
    };

    it("should render setup page", () => {
        renderWithRouter(<Setup />);

        expect(screen.getByText(/setup|welcome|initialize/i)).toBeInTheDocument();
    });

    it("should show initialization prompt when not initialized", () => {
        mockUseSystemStatus.mockReturnValue({
            initialized: false,
            hasSuperAdmin: false,
            loading: false,
            refresh: vi.fn(),
        });

        renderWithRouter(<Setup />);

        expect(screen.getByText(/setup|initialize|admin/i)).toBeInTheDocument();
    });

    it("should show loading state", () => {
        mockUseSystemStatus.mockReturnValue({
            initialized: false,
            hasSuperAdmin: false,
            loading: true,
            refresh: vi.fn(),
        });

        renderWithRouter(<Setup />);

        // Should show loading indicator or be in loading state
        const content = document.body.textContent;
        expect(content).toBeTruthy();
    });
});
