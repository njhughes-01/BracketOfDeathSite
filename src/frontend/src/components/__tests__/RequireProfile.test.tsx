import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
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
    getSystemStatus: vi.fn(),
  },
}));

import { useAuth } from "../../contexts/AuthContext";
import { apiClient } from "../../services/api";

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockGetProfile = apiClient.getProfile as ReturnType<typeof vi.fn>;
const mockGetSystemStatus = apiClient.getSystemStatus as ReturnType<
  typeof vi.fn
>;

describe("RequireProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default system to initialized
    mockGetSystemStatus.mockResolvedValue({
      success: true,
      data: { initialized: true },
    });
  });

  const renderWithRouter = (initialPath = "/") => {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route element={<RequireProfile />}>
            <Route
              path="/"
              element={<div data-testid="protected">Protected Content</div>}
            />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/onboarding" element={<div>Onboarding Page</div>} />
          <Route path="/setup" element={<div>Setup Page</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  it("should render children when profile is complete", async () => {
    mockUseAuth.mockReturnValue({
      user: { username: "testUser", roles: ["user"] },
      isAuthenticated: true,
      loading: false,
    });
    mockGetProfile.mockResolvedValue({
      success: true,
      data: { isComplete: true },
    });

    renderWithRouter();

    await waitFor(
      () => {
        expect(screen.getByTestId("protected")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("should redirect when profile is incomplete", async () => {
    mockUseAuth.mockReturnValue({
      user: { username: "testUser", roles: ["user"] },
      isAuthenticated: true,
      loading: false,
    });
    // Mock API returning incomplete
    mockGetProfile.mockResolvedValue({
      success: true,
      data: { isComplete: false },
    });

    renderWithRouter();

    await waitFor(
      () => {
        expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
        expect(screen.getByText("Onboarding Page")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("should handle null user / initialization", async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      loading: false,
    });

    renderWithRouter();

    await waitFor(
      () => {
        expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
        expect(screen.getByText("Login Page")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("should redirect to setup if system not initialized", async () => {
    mockGetSystemStatus.mockResolvedValue({
      success: true,
      data: { initialized: false },
    });
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      loading: false,
    });

    renderWithRouter();

    await waitFor(
      () => {
        expect(screen.getByText("Setup Page")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });
});
