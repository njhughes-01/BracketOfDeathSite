import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Setup from "../Setup";

// Mock API
vi.mock("../../services/api", () => ({
    apiClient: {
        getSystemStatus: vi.fn(),
    },
}));

// Mock AuthContext
vi.mock("../../contexts/AuthContext", () => ({
    useAuth: vi.fn().mockReturnValue({
        user: null,
        isAuthenticated: false,
    }),
}));

import { apiClient } from "../../services/api";

const mockGetSystemStatus = apiClient.getSystemStatus as ReturnType<
    typeof vi.fn
>;

describe("Setup", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderWithRouter = (component: React.ReactElement) => {
        return render(<MemoryRouter>{component}</MemoryRouter>);
    };

    it("should render setup page", async () => {
        mockGetSystemStatus.mockResolvedValue({
            success: true,
            data: { initialized: false },
        });

        renderWithRouter(<Setup />);

        await waitFor(() => {
            expect(
                screen.getByText(/System Not Initialized/i)
            ).toBeInTheDocument();
        });
    });

    it("should show initialization prompt when not initialized", async () => {
        mockGetSystemStatus.mockResolvedValue({
            success: true,
            data: { initialized: false },
        });

        renderWithRouter(<Setup />);

        await waitFor(() => {
            expect(screen.getByText(/Setup Required/i)).toBeInTheDocument();
        });
    });

    it("should show loading spinner initially", () => {
        mockGetSystemStatus.mockReturnValue(new Promise(() => { })); // Never resolves

        renderWithRouter(<Setup />);

        // Use role="status" as defined in LoadingSpinner.tsx
        expect(screen.getByRole("status")).toBeInTheDocument();
    });
});
