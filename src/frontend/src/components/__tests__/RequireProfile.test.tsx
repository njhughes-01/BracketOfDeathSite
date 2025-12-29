import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import RequireProfile from "../RequireProfile";

// Mock AuthContext
vi.mock("../../contexts/AuthContext", () => ({
    useAuth: vi.fn(),
}));

// Mock API
vi.mock("../../services/api", () => ({
    apiClient: {
        getProfile: vi.fn(),
    },
}));

import { useAuth } from "../../contexts/AuthContext";
import { apiClient } from "../../services/api";

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockGetProfile = apiClient.getProfile as ReturnType<typeof vi.fn>;

describe("RequireProfile", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderWithRouter = (component: React.ReactElement) => {
        return render(<BrowserRouter>{component}</BrowserRouter>);
    };

    it("should render children when profile is complete", async () => {
        mockUseAuth.mockReturnValue({
            user: { username: "testUser" },
            isAuthenticated: true,
        });
        mockGetProfile.mockResolvedValue({ success: true, data: { isComplete: true } });

        renderWithRouter(
            <RequireProfile>
                <div data-testid="protected">Protected Content</div>
            </RequireProfile>
        );

        await waitFor(() => {
            expect(screen.getByTestId("protected")).toBeInTheDocument();
        });
    });

    it("should redirect when profile is incomplete", async () => {
        mockUseAuth.mockReturnValue({
            user: { username: "testUser" },
            isAuthenticated: true,
        });
        // Mock API returning incomplete
        mockGetProfile.mockResolvedValue({ success: true, data: { isComplete: false } });

        renderWithRouter(
            <RequireProfile>
                <div data-testid="protected">Protected Content</div>
            </RequireProfile>
        );

        await waitFor(() => {
            expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
        });
    });

    it("should handle null user / initialization", async () => {
        mockUseAuth.mockReturnValue({
            user: null,
            isAuthenticated: false,
        });

        renderWithRouter(
            <RequireProfile>
                <div data-testid="protected">Protected Content</div>
            </RequireProfile>
        );

        await waitFor(() => {
            expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
        });
    });
});
