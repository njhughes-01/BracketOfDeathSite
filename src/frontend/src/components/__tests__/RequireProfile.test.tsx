import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import RequireProfile from "../RequireProfile";

// Mock AuthContext
vi.mock("../../contexts/AuthContext", () => ({
    useAuth: vi.fn(),
}));

import { useAuth } from "../../contexts/AuthContext";

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

describe("RequireProfile", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderWithRouter = (component: React.ReactElement) => {
        return render(<BrowserRouter>{component}</BrowserRouter>);
    };

    it("should render children when profile is complete", () => {
        mockUseAuth.mockReturnValue({
            user: {
                username: "testUser",
                profileComplete: true,
                gender: "male",
            },
            isAuthenticated: true,
        });

        renderWithRouter(
            <RequireProfile>
                <div data-testid="protected">Protected Content</div>
            </RequireProfile>
        );

        expect(screen.getByTestId("protected")).toBeInTheDocument();
    });

    it("should redirect when profile is incomplete", () => {
        mockUseAuth.mockReturnValue({
            user: {
                username: "testUser",
                profileComplete: false,
            },
            isAuthenticated: true,
        });

        renderWithRouter(
            <RequireProfile>
                <div data-testid="protected">Protected Content</div>
            </RequireProfile>
        );

        expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
    });

    it("should handle null user", () => {
        mockUseAuth.mockReturnValue({
            user: null,
            isAuthenticated: false,
        });

        renderWithRouter(
            <RequireProfile>
                <div data-testid="protected">Protected Content</div>
            </RequireProfile>
        );

        expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
    });
});
