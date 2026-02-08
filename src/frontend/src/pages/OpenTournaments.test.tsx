import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import OpenTournaments from "./OpenTournaments";
import { useAuth } from "../contexts/AuthContext";
import { apiClient } from "../services/api";

// Mock dependencies
vi.mock("../services/api", () => ({
  apiClient: {
    getOpenTournaments: vi.fn(),
    getProfile: vi.fn(),
    joinTournament: vi.fn(),
  },
}));
vi.mock("../contexts/AuthContext");
vi.mock("../components/ui/LoadingSpinner", () => ({
  default: () => <div data-testid="loading">Loading...</div>,
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("OpenTournaments Page", () => {
  const mockTournaments = [
    {
      id: "1",
      bodNumber: 202401,
      date: "2024-05-15T00:00:00.000Z",
      location: "Test Location",
      format: "Format A",
      status: "scheduled",
      maxPlayers: 10,
      registeredPlayers: new Array(5).fill("p"),
      waitlistPlayers: [],
    },
    {
      id: "2",
      bodNumber: 202402,
      date: "2024-06-15T00:00:00.000Z",
      location: "Full Tournament",
      format: "Format B",
      status: "scheduled",
      maxPlayers: 2,
      registeredPlayers: ["p1", "p2"],
      waitlistPlayers: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (apiClient.getOpenTournaments as any).mockResolvedValue({ data: mockTournaments });
    (apiClient.getProfile as any).mockResolvedValue({ data: { user: { playerId: "p1" } } });

    (useAuth as any).mockReturnValue({
      isAuthenticated: true,
      user: { id: "u1", name: "User", playerId: "p1" },
    });
  });

  it("renders loading state initially", () => {
    // Make promise not resolve immediately
    (apiClient.getOpenTournaments as any).mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <OpenTournaments />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("loading")).toBeInTheDocument();
  });

  it("renders tournaments list after fetch", async () => {
    render(
      <MemoryRouter>
        <OpenTournaments />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Test Location/i)).toBeInTheDocument();

    // Debug if needed
    // screen.debug();

    expect(screen.getByText("Open Tournaments")).toBeInTheDocument();
    expect(screen.getByText(/Full Tournament/i)).toBeInTheDocument();
    expect(screen.getByText(/Format A/i)).toBeInTheDocument();
  });

  it("displays correct registration status", async () => {
    render(
      <MemoryRouter>
        <OpenTournaments />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("5 / 10")).toBeInTheDocument();
    });

    // Check Full tournament button and label
    // Note: The text might be split or styled
    const joinButtons = screen.getAllByRole("button");
    expect(joinButtons[0]).toHaveTextContent(/Register Now/i);
    expect(joinButtons[1]).toHaveTextContent(/Join Waitlist/i);
    expect(screen.getByText("WAITLIST")).toBeInTheDocument();
  });

  it("redirects to login if not authenticated", async () => {
    (useAuth as any).mockReturnValue({ isAuthenticated: false });

    render(
      <MemoryRouter>
        <OpenTournaments />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.getByText("Test Location")).toBeInTheDocument(),
    );

    const registerBtn = screen.getAllByRole("button")[0];
    fireEvent.click(registerBtn);

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining("/login?returnUrl="),
    );
  });

  it("redirects to tournament detail if no profile (onboarding handled there)", async () => {
    (useAuth as any).mockReturnValue({
      isAuthenticated: true,
    });
    (apiClient.getProfile as any).mockResolvedValue({ data: { user: {} } });

    render(
      <MemoryRouter>
        <OpenTournaments />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.getByText("Test Location")).toBeInTheDocument(),
    );

    const registerBtn = screen.getAllByRole("button")[0];
    fireEvent.click(registerBtn);

    expect(mockNavigate).toHaveBeenCalledWith("/tournaments/1");
  });

  it("navigates to tournament detail when clicking register (happy path)", async () => {
    render(
      <MemoryRouter>
        <OpenTournaments />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.getByText("Test Location")).toBeInTheDocument(),
    );

    const registerBtn = screen.getAllByRole("button")[0];
    fireEvent.click(registerBtn);

    expect(mockNavigate).toHaveBeenCalledWith("/tournaments/1");
  });
});
