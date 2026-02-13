import { render, screen, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AuthProvider, useAuth } from "../AuthContext";
import React from "react";

// Mock Keycloak
const mockLogin = vi.fn();
const mockLogout = vi.fn();
const mockUpdateToken = vi.fn();
const mockInit = vi.fn().mockResolvedValue(false);
const mockLoadUserProfile = vi.fn().mockResolvedValue({});

vi.mock("keycloak-js", () => {
    return {
        default: class MockKeycloak {
            init = mockInit;
            login = mockLogin;
            logout = mockLogout;
            updateToken = mockUpdateToken;
            loadUserProfile = mockLoadUserProfile;
            authenticated = false;
            token = "mock-token";
            tokenParsed = {
                sub: "user-123",
                exp: Date.now() / 1000 + 3600,
                realm_access: { roles: ["user"] },
                email: "test@example.com",
                preferred_username: "testuser",
            };

            constructor(config: any) { }
        },
    };
});

// Mock API services
vi.mock("../../services/api", () => ({
    setTokenGetter: vi.fn(),
    setTokenRefresher: vi.fn(),
    setLogoutHandler: vi.fn(),
    apiClient: {
        getProfile: vi.fn().mockResolvedValue({ success: true, data: { user: {} } }),
    },
}));

// Test component to consume context
const TestComponent = () => {
    const { isAuthenticated, user, login, logout, loading } = useAuth();
    return (
        <div>
            <div data-testid="auth-status">
                {loading ? "Loading..." : isAuthenticated ? "Authenticated" : "Not Authenticated"}
            </div>
            {user && <div data-testid="user-name">{user.username}</div>}
            <button onClick={login}>Login</button>
            <button onClick={logout}>Logout</button>
        </div>
    );
};

// Mock window.location
const originalLocation = window.location;

describe("AuthContext", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        delete (window as any).location;
        (window as any).location = {
            ...originalLocation,
            assign: vi.fn(),
            href: "http://localhost:3000/",
        };
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        window.location = originalLocation;
    });

    it("should render children", async () => {
        render(
            <AuthProvider>
                <div data-testid="child">Child Content</div>
            </AuthProvider>
        );
        await waitFor(() => {
            expect(screen.getByTestId("child")).toBeInTheDocument();
        });
    });

    it("should throw error when useAuth is used outside AuthProvider", () => {
        // Suppress console.error for this test as React logs the error
        const spy = vi.spyOn(console, "error").mockImplementation(() => { });

        expect(() => render(<TestComponent />)).toThrow(
            "useAuth must be used within an AuthProvider"
        );

        spy.mockRestore();
    });

    it("should initialize and attempt silent sso check", async () => {
        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        // Should start with loading or check
        await waitFor(() => {
            expect(mockInit).toHaveBeenCalledWith(expect.objectContaining({
                onLoad: "check-sso",
                silentCheckSsoFallback: true
            }));
        });
    });

    it("should handle login request", async () => {
        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        await waitFor(() => expect(screen.getByText("Login")).toBeInTheDocument());

        await act(async () => {
            screen.getByText("Login").click();
        });

        expect(mockLogin).toHaveBeenCalled();
    });

    it("should handle logout request", async () => {
        // Setup a scenario where user is authenticated for testing logout
        mockInit.mockResolvedValueOnce(true);

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId("auth-status")).toHaveTextContent("Authenticated");
        });

        await act(async () => {
            screen.getByText("Logout").click();
        });

        expect(mockLogout).toHaveBeenCalledWith(
            expect.objectContaining({
                redirectUri: expect.stringContaining("/login"),
            }),
        );
    });
});
