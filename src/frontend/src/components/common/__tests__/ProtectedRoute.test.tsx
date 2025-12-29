import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ProtectedRoute from "../ProtectedRoute";

// Mock AuthContext and usePermissions
vi.mock("../../../contexts/AuthContext", () => ({
    useAuth: vi.fn(),
}));

vi.mock("../../../hooks/usePermissions", () => ({
    usePermissions: vi.fn(),
}));

import { useAuth } from "../../../contexts/AuthContext";
import { usePermissions } from "../../../hooks/usePermissions";

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockUsePermissions = usePermissions as ReturnType<typeof vi.fn>;

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
        mockUsePermissions.mockReturnValue({
            isAdmin: false,
            hasPermission: vi.fn().mockReturnValue(true),
            hasAnyPermission: vi.fn().mockReturnValue(true),
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
        mockUsePermissions.mockReturnValue({
            isAdmin: false,
            hasPermission: vi.fn().mockReturnValue(false),
            hasAnyPermission: vi.fn().mockReturnValue(false),
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
        mockUsePermissions.mockReturnValue({
            isAdmin: false,
            hasPermission: vi.fn().mockReturnValue(false),
            hasAnyPermission: vi.fn().mockReturnValue(false),
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

        // Component renders LoadingSpinner (which might contain "Loading...")
        expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });

    it("should enforce requireAdmin", () => {
        mockUseAuth.mockReturnValue({
            isAuthenticated: true,
            loading: false,
            user: { username: "testUser", roles: ["user"] },
        });
        mockUsePermissions.mockReturnValue({
            isAdmin: false,
            hasPermission: vi.fn().mockReturnValue(false),
            hasAnyPermission: vi.fn().mockReturnValue(false),
        });

        render(
            <MemoryRouter initialEntries={["/admin"]}>
                <Routes>
                    <Route
                        path="/admin"
                        element={
                            <ProtectedRoute requireAdmin={true}>
                                <TestChild />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="/" element={<div>Home Page</div>} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });

    it("should allow access when requireAdmin is met", () => {
        mockUseAuth.mockReturnValue({
            isAuthenticated: true,
            loading: false,
            user: { username: "admin", roles: ["admin"] },
        });
        mockUsePermissions.mockReturnValue({
            isAdmin: true,
            hasPermission: vi.fn().mockReturnValue(true),
            hasAnyPermission: vi.fn().mockReturnValue(true),
        });

        render(
            <MemoryRouter initialEntries={["/admin"]}>
                <Routes>
                    <Route
                        path="/admin"
                        element={
                            <ProtectedRoute requireAdmin={true}>
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
