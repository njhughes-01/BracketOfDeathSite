import { render, screen } from "@testing-library/react";
import { BrowserRouter, MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ProtectedRoute from "../ProtectedRoute";

// Mock AuthContext
vi.mock("../../contexts/AuthContext", () => ({
    useAuth: vi.fn(),
}));

import { useAuth } from "../../contexts/AuthContext";

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

const TestChild = () => <div data-testid="protected-content">Protected Content</div>;

describe("ProtectedRoute", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render children when authenticated", () => {
        mockUseAuth.mockReturnValue({
            isAuthenticated: true,
            loading: false,
            user: { username: "testUser", roles: ["user"] },
        });

        render(
            <MemoryRouter initialEntries={["/protected"]}>
                <Routes>
                    <Route
                        path="/protected"
                        element={
                            <ProtectedRoute>
                                <TestChild />
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByTestId("protected-content")).toBeInTheDocument();
    });

    it("should redirect to login when not authenticated", () => {
        mockUseAuth.mockReturnValue({
            isAuthenticated: false,
            loading: false,
            user: null,
        });

        render(
            <MemoryRouter initialEntries={["/protected"]}>
                <Routes>
                    <Route
                        path="/protected"
                        element={
                            <ProtectedRoute>
                                <TestChild />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="/login" element={<div>Login Page</div>} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
        expect(screen.getByText("Login Page")).toBeInTheDocument();
    });

    it("should show loading state while checking auth", () => {
        mockUseAuth.mockReturnValue({
            isAuthenticated: false,
            loading: true,
            user: null,
        });

        render(
            <MemoryRouter initialEntries={["/protected"]}>
                <Routes>
                    <Route
                        path="/protected"
                        element={
                            <ProtectedRoute>
                                <TestChild />
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </MemoryRouter>
        );

        // Should not show content while loading
        expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });

    it("should enforce required roles", () => {
        mockUseAuth.mockReturnValue({
            isAuthenticated: true,
            loading: false,
            user: { username: "testUser", roles: ["user"] },
        });

        render(
            <MemoryRouter initialEntries={["/admin"]}>
                <Routes>
                    <Route
                        path="/admin"
                        element={
                            <ProtectedRoute requiredRoles={["admin"]}>
                                <TestChild />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="/" element={<div>Home Page</div>} />
                </Routes>
            </MemoryRouter>
        );

        // User without admin role should not see content
        expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });

    it("should allow access with matching roles", () => {
        mockUseAuth.mockReturnValue({
            isAuthenticated: true,
            loading: false,
            user: { username: "admin", roles: ["admin", "user"] },
        });

        render(
            <MemoryRouter initialEntries={["/admin"]}>
                <Routes>
                    <Route
                        path="/admin"
                        element={
                            <ProtectedRoute requiredRoles={["admin"]}>
                                <TestChild />
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByTestId("protected-content")).toBeInTheDocument();
    });
});
