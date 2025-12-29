import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TournamentManage from "../TournamentManage";
import { useAuth } from "../../contexts/AuthContext";
import apiClient from "../../services/api";

// Mock dependencies
vi.mock("../../contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../services/api", () => ({
  default: {
    getLiveTournament: vi.fn(),
    getTournamentMatches: vi.fn(),
    executeTournamentAction: vi.fn(),
    updateMatch: vi.fn(),
    generateMatches: vi.fn(),
    confirmCompletedMatches: vi.fn(),
    checkInTeam: vi.fn(),
  },
}));

// Mock child components to simplify testing
vi.mock("../../components/tournament/BracketView", () => ({ default: () => <div data-testid="bracket-view">BracketView</div> }));
vi.mock("../../components/tournament/LiveStats", () => ({ default: () => <div data-testid="live-stats">LiveStats</div> }));
vi.mock("../../components/tournament/PlayerLeaderboard", () => ({ default: () => <div data-testid="player-leaderboard">PlayerLeaderboard</div> }));

// Interactive mocks
vi.mock("../../components/tournament/MatchScoring", () => ({
  default: ({ onUpdateMatch }: any) => (
    <button data-testid="update-score-btn" onClick={() => onUpdateMatch({ id: "m1", scores: [1, 0] })}>
      Update Score
    </button>
  )
}));

vi.mock("../../components/tournament/MatchesToolbar", () => ({
  default: ({ onConfirmAll }: any) => (
    <div data-testid="matches-toolbar">
      MatchesToolbar
      <button onClick={onConfirmAll}>Confirm All</button>
    </div>
  )
}));

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

const mockTournamentData = {
  _id: "tourney-1",
  bodNumber: 42,
  date: new Date().toISOString(),
  location: "Test Location",
  bracketType: "double_elimination",
  phase: {
    phase: "server_setup",
    currentRound: "quarterfinal",
    completedMatches: 0,
    totalMatches: 8,
  },
  matches: [],
  teams: [],
  checkInStatus: {},
};

describe("TournamentManage", () => {
  let mockEventSource: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAdmin: true });
    (apiClient.getLiveTournament as any).mockResolvedValue({ success: true, data: mockTournamentData });
    (apiClient.getTournamentMatches as any).mockResolvedValue({ success: true, data: [] });

    // Mock EventSource with a class and capture instance
    global.EventSource = class EventSourceMock {
      url: string;
      listeners: Record<string, Function[]> = {};
      constructor(url: string) {
        this.url = url;
        mockEventSource = this;
      }
      addEventListener = vi.fn((event, callback) => {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
      });
      removeEventListener = vi.fn();
      close = vi.fn();

      // Helper to trigger event
      emit(event: string, data: any) {
        if (this.listeners[event]) {
          this.listeners[event].forEach(cb => cb(data));
        }
      }
    } as any;
  });

  const renderComponent = () => {
    render(
      <MemoryRouter initialEntries={["/tournaments/tourney-1"]}>
        <Routes>
          <Route path="/tournaments/:id" element={<TournamentManage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it("should redirect if not admin", () => {
    mockUseAuth.mockReturnValue({ isAdmin: false });
    renderComponent();
    expect(screen.getByText("Access Denied")).toBeInTheDocument();
    expect(screen.queryByText("BOD #42")).not.toBeInTheDocument();
  });

  it("should load and display tournament data", async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText("BOD #42")).toBeInTheDocument();
      expect(screen.getByText("Test Location")).toBeInTheDocument();
    });
    expect(apiClient.getLiveTournament).toHaveBeenCalledWith("tourney-1");
  });

  it("should display setup actions when in setup phase", async () => {
    (apiClient.getLiveTournament as any).mockResolvedValue({
      success: true,
      data: { ...mockTournamentData, phase: { phase: "setup" } },
    });

    renderComponent();
    await waitFor(() => {
      expect(screen.getByText("Open Registration")).toBeInTheDocument();
    });

    // Click Open Registration
    (apiClient.executeTournamentAction as any).mockResolvedValue({ success: true, data: { ...mockTournamentData, phase: { phase: "registration" } } });
    fireEvent.click(screen.getByText("Open Registration"));

    await waitFor(() => {
      expect(apiClient.executeTournamentAction).toHaveBeenCalledWith("tourney-1", { action: "start_registration" });
    });
  });

  it("should handle error states", async () => {
    (apiClient.getLiveTournament as any).mockRejectedValue(new Error("Network Error"));
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText("Tournament Not Found")).toBeInTheDocument();
    });
  });

  it("should update match score", async () => {
    const mockMatches = [{ id: "m1", round: "quarterfinal", matchNumber: 1, status: "pending" }];
    (apiClient.getLiveTournament as any).mockResolvedValue({
      success: true,
      data: { ...mockTournamentData, phase: { phase: "bracket", currentRound: "quarterfinal" } },
    });
    (apiClient.getTournamentMatches as any).mockResolvedValue({ success: true, data: mockMatches });
    (apiClient.updateMatch as any).mockResolvedValue({ success: true });

    renderComponent();
    await waitFor(() => {
      expect(screen.getByTestId("update-score-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("update-score-btn"));

    expect(apiClient.updateMatch).toHaveBeenCalledWith({ id: "m1", scores: [1, 0] });
  });

  it("should confirm all completed matches", async () => {
    const mockMatches = [{ id: "m1", round: "quarterfinal", matchNumber: 1, status: "completed" }];
    (apiClient.getLiveTournament as any).mockResolvedValue({
      success: true,
      data: { ...mockTournamentData, phase: { phase: "bracket" } },
    });
    (apiClient.getTournamentMatches as any).mockResolvedValue({ success: true, data: mockMatches });
    (apiClient.confirmCompletedMatches as any).mockResolvedValue({ success: true, data: {} });

    renderComponent();
    await waitFor(() => {
      expect(screen.getByText("Confirm All")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Confirm All"));

    expect(apiClient.confirmCompletedMatches).toHaveBeenCalledWith("tourney-1");
  });

  it("should handle SSE updates", async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText("BOD #42")).toBeInTheDocument();
    });

    expect(mockEventSource).toBeDefined();

    const updatedData = { ...mockTournamentData, phase: { ...mockTournamentData.phase, completedMatches: 5 } };

    act(() => {
      mockEventSource.emit("update", {
        data: JSON.stringify({ payload: { live: updatedData } })
      } as MessageEvent);
    });

    // Verification might be tricky if UI doesn't visually change distinctively without more mock logic
    // But we can check if setLiveTournament was called ... wait, it's internal state.
    // We can check if "5/8 Matches" appears in progress bar (if we mock progress bar content?)

    // Progress bar: {liveTournament.phase.completedMatches}/{liveTournament.phase.totalMatches} Matches
    await waitFor(() => {
      expect(screen.getByText("5/8 Matches")).toBeInTheDocument();
    });
  });

  it("should trigger force reset", async () => {
    // Spy on window.confirm
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    (apiClient.executeTournamentAction as any).mockResolvedValue({ success: true, data: { ...mockTournamentData } });

    renderComponent();
    await waitFor(() => {
      expect(screen.getByText("Force Reset")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Force Reset"));

    expect(window.confirm).toHaveBeenCalled();
    expect(apiClient.executeTournamentAction).toHaveBeenCalledWith("tourney-1", { action: "reset_tournament" });
  });
});
