import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import TournamentDetail from "../TournamentDetail";
import { useApi, useMutation } from "../../hooks/useApi";
import { mockTournament, mockMatch, mockTournamentResult } from "../../mocks/data";
import apiClient from "../../services/api";

// Mock child components
vi.mock("../../components/tournament/LiveStats", () => ({
  default: () => <div data-testid="live-stats">Live Stats Component</div>,
}));
vi.mock("../../components/tournament/BracketView", () => ({
  default: () => <div data-testid="bracket-view">Bracket Component</div>,
}));
vi.mock("../../components/checkout", () => ({
  CheckoutTimer: ({ expiresAt, onExpire }: { expiresAt: string; onExpire?: () => void }) => (
    <div data-testid="checkout-timer" data-expires={expiresAt}>
      Checkout Timer
      <button onClick={onExpire} data-testid="expire-timer">Expire</button>
    </div>
  ),
  DiscountCodeInput: ({ onApply, disabled }: { onApply: (code: string, info: any) => void; disabled?: boolean }) => (
    <div data-testid="discount-input">
      <input 
        data-testid="discount-code-field"
        disabled={disabled}
        onChange={(e) => {
          if (e.target.value === "VALID20") {
            onApply("VALID20", { valid: true, discountType: "percent", discountValue: 20 });
          }
        }}
      />
    </div>
  ),
}));

// Mock API client
vi.mock("../../services/api", () => ({
  default: {
    getTournament: vi.fn(),
    getTournamentMatches: vi.fn(),
    getResultsByTournament: vi.fn(),
    deleteTournament: vi.fn(),
    getMyTicketForTournament: vi.fn(),
    getReservationStatus: vi.fn(),
    reserveSlot: vi.fn(),
    cancelReservation: vi.fn(),
    createCheckoutSession: vi.fn(),
    completeFreeRegistration: vi.fn(),
  },
}));

// Mock hooks
vi.mock("../../hooks/useApi");
const mockUseAuth = vi.fn(() => ({ 
  isAdmin: false, 
  isAuthenticated: false,
  user: null 
}));
vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));


describe("TournamentDetail Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default API client mocks for checkout flow
    (apiClient.getMyTicketForTournament as any).mockResolvedValue({ data: null });
    (apiClient.getReservationStatus as any).mockResolvedValue({ data: null });
    (apiClient.reserveSlot as any).mockResolvedValue({ data: null });
    (apiClient.cancelReservation as any).mockResolvedValue({ success: true });
    (apiClient.createCheckoutSession as any).mockResolvedValue({ data: null });
    (apiClient.completeFreeRegistration as any).mockResolvedValue({ data: null });
  });

  const renderPage = (authOptions: { isAdmin?: boolean; isAuthenticated?: boolean; user?: any } = {}) => {
    const { isAdmin = false, isAuthenticated = false, user = null } = authOptions;
    mockUseAuth.mockReturnValue({ isAdmin, isAuthenticated, user });

    render(
      <MemoryRouter initialEntries={["/tournaments/1"]}>
        <Routes>
          <Route path="/tournaments/:id" element={<TournamentDetail />} />
          <Route path="/tournaments" element={<div>List Page</div>} />
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/tickets/:id" element={<div>Ticket Page</div>} />
        </Routes>
      </MemoryRouter>,
    );
  };

  const setupApiMock = (tournamentOverrides = {}) => {
    const tournament = { ...mockTournament, ...tournamentOverrides };
    let callCount = 0;
    (useApi as any).mockImplementation(() => {
      callCount++;
      const mode = (callCount - 1) % 3;
      if (mode === 0) return { data: { data: tournament }, loading: false };
      if (mode === 1) return { data: { data: [mockMatch] }, loading: false };
      return { data: { results: [mockTournamentResult] }, loading: false };
    });
    return tournament;
  };

  const setupApiMockForAdmin = (tournamentOverrides = {}) => {
    const tournament = { ...mockTournament, ...tournamentOverrides };
    let callCount = 0;
    (useApi as any).mockImplementation(() => {
      callCount++;
      const mode = (callCount - 1) % 3;
      // Use same pattern as setupApiMock - return proper data for all 3 API calls
      if (mode === 0) return { data: { data: tournament }, loading: false };
      if (mode === 1) return { data: { data: [mockMatch] }, loading: false };
      return { data: { results: [mockTournamentResult] }, loading: false };
    });
    return tournament;
  };

  it("renders loading state", () => {
    (useApi as any).mockReturnValue({ data: null, loading: true });
    (useMutation as any).mockReturnValue({ mutate: vi.fn(), loading: false });

    renderPage();

    const pulseElements = screen.getAllByText(
      (_, element) => element?.className.includes("animate-pulse") ?? false,
    );
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it("renders details and tabs", () => {
    setupApiMock();
    (useMutation as any).mockReturnValue({ mutate: vi.fn() });

    renderPage();

    expect(screen.getByText("BOD Tournament #42")).toBeInTheDocument();
    expect(screen.getAllByText("Main Courts").length).toBeGreaterThan(0);
    expect(screen.getByText("Overview")).toBeInTheDocument();

    // Players appears in stats grid label and tabs
    expect(screen.getAllByText("Players").length).toBeGreaterThan(0);

    expect(screen.getByRole("button", { name: /^Matches$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Bracket$/i })).toBeInTheDocument();
  });

  it("navigates tabs", async () => {
    setupApiMock();
    (useMutation as any).mockReturnValue({ mutate: vi.fn() });

    renderPage();

    // Matches Tab
    fireEvent.click(screen.getByRole("button", { name: /^Matches$/i }));
    expect(screen.getByText("Semi Finals")).toBeInTheDocument();
    expect(screen.getByText("Doe/Smith")).toBeInTheDocument();

    // Players Tab
    fireEvent.click(screen.getByText("Players", { selector: "button" }));
    expect(screen.getAllByText("John Doe").length).toBeGreaterThan(0);

    // Bracket Tab
    fireEvent.click(screen.getByRole("button", { name: /^Bracket$/i }));
    expect(screen.getByTestId("bracket-view")).toBeInTheDocument();
  });

  it("shows admin actions when admin", async () => {
    setupApiMockForAdmin();
    (useMutation as any).mockReturnValue({ mutate: vi.fn() });

    await act(async () => {
      renderPage({ isAdmin: true, isAuthenticated: true }); 
    });

    await waitFor(() => {
      expect(screen.getByTitle("Delete Tournament")).toBeInTheDocument();
    });
  });

  it("handles delete action", async () => {
    setupApiMockForAdmin();
    const mockDelete = vi.fn();
    (useMutation as any).mockReturnValue({ mutate: mockDelete });

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    await act(async () => {
      renderPage({ isAdmin: true, isAuthenticated: true });
    });

    const deleteBtn = screen.getByTitle("Delete Tournament");
    fireEvent.click(deleteBtn);

    expect(confirmSpy).toHaveBeenCalled();
    expect(mockDelete).toHaveBeenCalled();
  });

  describe("Players Tab - Individual Player Display", () => {
    const mockTournamentWithPlayers = {
      ...mockTournament,
      players: [
        { _id: "p1", name: "Alice Johnson" },
        { _id: "p2", name: "Bob Smith" },
      ],
    };

    const mockTournamentResults = [
      {
        _id: "r1",
        tournament: "1",
        players: [
          { _id: "p1", name: "Alice Johnson" },
          { _id: "p2", name: "Bob Smith" },
        ],
        seed: 1,
        division: "1A",
        totalStats: {
          totalWon: 45,
          totalLost: 30,
          winPercentage: 0.6,
          bodFinish: 1,
        },
      },
      {
        _id: "r2",
        tournament: "1",
        players: [
          { _id: "p3", name: "Charlie Brown" },
          { _id: "p4", name: "Diana Wilson" },
        ],
        seed: 2,
        division: "1B",
        totalStats: {
          totalWon: 38,
          totalLost: 37,
          winPercentage: 0.507,
          bodFinish: 2,
        },
      },
    ];

    it("shows individual players from results for completed tournaments", async () => {
      let callCount = 0;
      (useApi as any).mockImplementation(() => {
        callCount++;
        if (callCount === 1)
          return { data: { data: mockTournamentWithPlayers }, loading: false };
        if (callCount === 2)
          return { data: { data: [mockMatch] }, loading: false };
        // Third call returns results
        return { data: { results: mockTournamentResults }, loading: false };
      });
      (useMutation as any).mockReturnValue({ mutate: vi.fn() });

      renderPage();

      // Navigate to Players tab
      fireEvent.click(screen.getByText("Players", { selector: "button" }));

      // Should show Tournament Players heading
      expect(screen.getByText(/Tournament Players/)).toBeInTheDocument();

      // Should show individual player names
      expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
      expect(screen.getByText("Charlie Brown")).toBeInTheDocument();
    });

    it("shows player stats including W-L and win percentage", async () => {
      let callCount = 0;
      (useApi as any).mockImplementation(() => {
        callCount++;
        if (callCount === 1)
          return { data: { data: mockTournamentWithPlayers }, loading: false };
        if (callCount === 2)
          return { data: { data: [mockMatch] }, loading: false };
        return { data: { results: mockTournamentResults }, loading: false };
      });
      (useMutation as any).mockReturnValue({ mutate: vi.fn() });

      renderPage();
      fireEvent.click(screen.getByText("Players", { selector: "button" }));

      // Should show games won-lost
      // Stats appear twice (once per player in each team)
      expect(screen.getAllByText("45-30").length).toBeGreaterThan(0);
      expect(screen.getAllByText("38-37").length).toBeGreaterThan(0);

      // Win percentages appear twice (once per player in each team)
      expect(screen.getAllByText("60.0% Win").length).toBeGreaterThan(0);
      expect(screen.getAllByText("50.7% Win").length).toBeGreaterThan(0);
    });

    it("shows partner names in player cards", async () => {
      let callCount = 0;
      (useApi as any).mockImplementation(() => {
        callCount++;
        if (callCount === 1)
          return { data: { data: mockTournamentWithPlayers }, loading: false };
        if (callCount === 2)
          return { data: { data: [mockMatch] }, loading: false };
        return { data: { results: mockTournamentResults }, loading: false };
      });
      (useMutation as any).mockReturnValue({ mutate: vi.fn() });

      renderPage();
      fireEvent.click(screen.getByText("Players", { selector: "button" }));

      // Should show partner info
      expect(screen.getByText(/Partner: Bob Smith/)).toBeInTheDocument();
      expect(screen.getByText(/Partner: Diana Wilson/)).toBeInTheDocument();
    });

    it("shows empty state when no players available", async () => {
      const emptyTournament = {
        ...mockTournament,
        players: [],
      };

      let callCount = 0;
      (useApi as any).mockImplementation(() => {
        callCount++;
        if (callCount === 1)
          return { data: { data: emptyTournament }, loading: false };
        if (callCount === 2) return { data: { data: [] }, loading: false };
        return { data: { results: [] }, loading: false };
      });
      (useMutation as any).mockReturnValue({ mutate: vi.fn() });

      renderPage();
      fireEvent.click(screen.getByText("Players", { selector: "button" }));

      expect(screen.getByText("No Players Available")).toBeInTheDocument();
    });

    it("links player cards to player profiles", async () => {
      let callCount = 0;
      (useApi as any).mockImplementation(() => {
        callCount++;
        if (callCount === 1)
          return { data: { data: mockTournamentWithPlayers }, loading: false };
        if (callCount === 2)
          return { data: { data: [mockMatch] }, loading: false };
        return { data: { results: mockTournamentResults }, loading: false };
      });
      (useMutation as any).mockReturnValue({ mutate: vi.fn() });

      renderPage();
      fireEvent.click(screen.getByText("Players", { selector: "button" }));

      // Find player card link
      const aliceLink = screen.getByText("Alice Johnson").closest("a");
      expect(aliceLink).toHaveAttribute("href", "/players/p1");
    });
  });

  describe("Error States", () => {
    it("renders error message on API failure", async () => {
      (useApi as any).mockReturnValue({ data: null, loading: false, error: new Error("Failed to load") });
      (useMutation as any).mockReturnValue({ mutate: vi.fn() });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText(/Tournament not found/i)).toBeInTheDocument();
      });
    });
  });

  describe("Checkout Flow Integration", () => {
    // Use a future date so getTournamentStatus returns "scheduled" not "completed"
    const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(); // 14 days from now

    const mockPaidTournament = {
      ...mockTournament,
      date: futureDate,
      status: "open" as const,
      entryFee: 5000, // $50.00
      maxPlayers: 16,
      currentPlayerCount: 8,
    };

    const mockFreeTournament = {
      ...mockTournament,
      date: futureDate,
      status: "open" as const,
      entryFee: 0,
      maxPlayers: 16,
      currentPlayerCount: 8,
    };

    const mockEarlyBirdTournament = {
      ...mockTournament,
      date: futureDate,
      status: "open" as const,
      entryFee: 5000,
      earlyBirdFee: 4000,
      earlyBirdDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      maxPlayers: 16,
      currentPlayerCount: 8,
    };

    describe("Registration State Display", () => {
      it("shows sign in prompt when not logged in", async () => {
        setupApiMock(mockPaidTournament);
        (useMutation as any).mockReturnValue({ mutate: vi.fn() });

        await act(async () => {
          renderPage({ isAuthenticated: false });
        });

        await waitFor(() => {
          expect(screen.getByText("Sign in to register for this tournament")).toBeInTheDocument();
        }, { timeout: 3000 });
        expect(screen.getByRole("link", { name: /Sign In/i })).toBeInTheDocument();
      });

      it("shows register button when logged in and not registered", async () => {
        setupApiMock(mockFreeTournament);
        (useMutation as any).mockReturnValue({ mutate: vi.fn() });

        await act(async () => {
          renderPage({ isAuthenticated: true, user: { id: "user1", playerId: "player1" } });
        });

        await waitFor(() => {
          expect(screen.getByRole("button", { name: /Register \(Free\)/i })).toBeInTheDocument();
        }, { timeout: 3000 });
      });

      it("shows price in register button for paid tournaments", async () => {
        setupApiMock(mockPaidTournament);
        (useMutation as any).mockReturnValue({ mutate: vi.fn() });

        await act(async () => {
          renderPage({ isAuthenticated: true, user: { id: "user1", playerId: "player1" } });
        });

        await waitFor(() => {
          expect(screen.getByRole("button", { name: /Register — \$50\.00/i })).toBeInTheDocument();
        }, { timeout: 3000 });
      });

      it("shows early bird price when applicable", async () => {
        setupApiMock(mockEarlyBirdTournament);
        (useMutation as any).mockReturnValue({ mutate: vi.fn() });

        await act(async () => {
          renderPage({ isAuthenticated: true, user: { id: "user1", playerId: "player1" } });
        });

        await waitFor(() => {
          // Should show early bird price ($40) in the register button
          expect(screen.getByRole("button", { name: /Register — \$40\.00/i })).toBeInTheDocument();
          // Should show regular price as strikethrough
          expect(screen.getByText("$50.00")).toBeInTheDocument();
        }, { timeout: 3000 });
      });

      it("shows registered state with ticket info", async () => {
        setupApiMock(mockPaidTournament);
        (useMutation as any).mockReturnValue({ mutate: vi.fn() });

        // Mock user has a ticket
        (apiClient.getMyTicketForTournament as any).mockResolvedValue({
          data: {
            ticket: {
              _id: "ticket123",
              ticketCode: "BOD-ABC123",
              status: "valid",
              paymentStatus: "paid",
              amountPaid: 5000,
            },
          },
        });

        await act(async () => {
          renderPage({ isAuthenticated: true, user: { id: "user1", playerId: "player1" } });
        });

        await waitFor(() => {
          expect(screen.getByText("You're Registered!")).toBeInTheDocument();
          expect(screen.getByText("BOD-ABC123")).toBeInTheDocument();
          expect(screen.getByRole("link", { name: /View Ticket/i })).toBeInTheDocument();
        }, { timeout: 3000 });
      });

      it("shows invite only message for invite-only tournaments", async () => {
        setupApiMock({ ...mockPaidTournament, inviteOnly: true });
        (useMutation as any).mockReturnValue({ mutate: vi.fn() });

        await act(async () => {
          renderPage({ isAuthenticated: true, user: { id: "user1", playerId: "player1" } });
        });

        await waitFor(() => {
          expect(screen.getByText("Invite Only")).toBeInTheDocument();
        }, { timeout: 3000 });
      });

      it("shows spots remaining progress bar", async () => {
        setupApiMock(mockPaidTournament);
        (useMutation as any).mockReturnValue({ mutate: vi.fn() });

        await act(async () => {
          renderPage({ isAuthenticated: true, user: { id: "user1", playerId: "player1" } });
        });

        await waitFor(() => {
          expect(screen.getByText("Spots Remaining")).toBeInTheDocument();
          expect(screen.getByText("8 / 16")).toBeInTheDocument();
        }, { timeout: 3000 });
      });
    });

    describe("Discount Code", () => {
      it("shows discount input for paid tournaments", async () => {
        setupApiMock(mockPaidTournament);
        (useMutation as any).mockReturnValue({ mutate: vi.fn() });

        await act(async () => {
          renderPage({ isAuthenticated: true, user: { id: "user1", playerId: "player1" } });
        });

        await waitFor(() => {
          expect(screen.getByTestId("discount-input")).toBeInTheDocument();
        }, { timeout: 3000 });
      });

      it("does not show discount input for free tournaments", async () => {
        setupApiMock(mockFreeTournament);
        (useMutation as any).mockReturnValue({ mutate: vi.fn() });

        await act(async () => {
          renderPage({ isAuthenticated: true, user: { id: "user1", playerId: "player1" } });
        });

        await waitFor(() => {
          expect(screen.getByRole("button", { name: /Register \(Free\)/i })).toBeInTheDocument();
        }, { timeout: 3000 });
        expect(screen.queryByTestId("discount-input")).not.toBeInTheDocument();
      });

      it("applies discount and updates price display", async () => {
        setupApiMock(mockPaidTournament);
        (useMutation as any).mockReturnValue({ mutate: vi.fn() });

        await act(async () => {
          renderPage({ isAuthenticated: true, user: { id: "user1", playerId: "player1" } });
        });

        await waitFor(() => {
          expect(screen.getByTestId("discount-input")).toBeInTheDocument();
        }, { timeout: 3000 });

        // Apply 20% discount
        await act(async () => {
          const discountInput = screen.getByTestId("discount-code-field");
          fireEvent.change(discountInput, { target: { value: "VALID20" } });
        });

        await waitFor(() => {
          // Should show discounted price: $50 - 20% = $40
          expect(screen.getByRole("button", { name: /Register — \$40\.00/i })).toBeInTheDocument();
        }, { timeout: 3000 });
      });
    });

    describe("Reservation Flow", () => {
      it("reserves slot when clicking register", async () => {
        setupApiMock(mockPaidTournament);
        (useMutation as any).mockReturnValue({ mutate: vi.fn() });

        const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
        (apiClient.reserveSlot as any).mockResolvedValue({
          data: {
            reservationId: "res123",
            expiresAt,
            remainingSeconds: 1200,
            tournamentId: "1",
            spotsRemaining: 7,
          },
        });

        await act(async () => {
          renderPage({ isAuthenticated: true, user: { id: "user1", playerId: "player1" } });
        });

        await waitFor(() => {
          expect(screen.getByRole("button", { name: /Register — \$50\.00/i })).toBeInTheDocument();
        }, { timeout: 3000 });

        // Click register
        await act(async () => {
          fireEvent.click(screen.getByRole("button", { name: /Register — \$50\.00/i }));
        });

        await waitFor(() => {
          expect(apiClient.reserveSlot).toHaveBeenCalledWith("1");
          expect(screen.getByTestId("checkout-timer")).toBeInTheDocument();
          expect(screen.getByRole("button", { name: /Complete Payment/i })).toBeInTheDocument();
        }, { timeout: 3000 });
      });

      it("shows checkout timer when reservation exists", async () => {
        setupApiMock(mockPaidTournament);
        (useMutation as any).mockReturnValue({ mutate: vi.fn() });

        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        (apiClient.getReservationStatus as any).mockResolvedValue({
          data: {
            hasReservation: true,
            reservationId: "res123",
            expiresAt,
            remainingSeconds: 900,
          },
        });

        await act(async () => {
          renderPage({ isAuthenticated: true, user: { id: "user1", playerId: "player1" } });
        });

        await waitFor(() => {
          expect(screen.getByTestId("checkout-timer")).toBeInTheDocument();
        }, { timeout: 3000 });
      });

      it("resets state when timer expires", async () => {
        setupApiMock(mockPaidTournament);
        (useMutation as any).mockReturnValue({ mutate: vi.fn() });

        const expiresAt = new Date(Date.now() + 5 * 1000).toISOString();
        (apiClient.getReservationStatus as any).mockResolvedValue({
          data: {
            hasReservation: true,
            reservationId: "res123",
            expiresAt,
            remainingSeconds: 5,
          },
        });

        await act(async () => {
          renderPage({ isAuthenticated: true, user: { id: "user1", playerId: "player1" } });
        });

        await waitFor(() => {
          expect(screen.getByTestId("checkout-timer")).toBeInTheDocument();
        }, { timeout: 3000 });

        // Simulate timer expiry
        await act(async () => {
          fireEvent.click(screen.getByTestId("expire-timer"));
        });

        await waitFor(() => {
          expect(screen.getByText(/reservation has expired/i)).toBeInTheDocument();
          expect(screen.getByRole("button", { name: /Register — \$50\.00/i })).toBeInTheDocument();
        }, { timeout: 3000 });
      });

      it("allows cancelling reservation", async () => {
        setupApiMock(mockPaidTournament);
        (useMutation as any).mockReturnValue({ mutate: vi.fn() });

        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        (apiClient.getReservationStatus as any).mockResolvedValue({
          data: {
            hasReservation: true,
            reservationId: "res123",
            expiresAt,
            remainingSeconds: 900,
          },
        });
        (apiClient.cancelReservation as any).mockResolvedValue({ success: true });

        await act(async () => {
          renderPage({ isAuthenticated: true, user: { id: "user1", playerId: "player1" } });
        });

        await waitFor(() => {
          expect(screen.getByRole("button", { name: /Cancel Reservation/i })).toBeInTheDocument();
        }, { timeout: 3000 });

        await act(async () => {
          fireEvent.click(screen.getByRole("button", { name: /Cancel Reservation/i }));
        });

        await waitFor(() => {
          expect(apiClient.cancelReservation).toHaveBeenCalledWith("1");
        }, { timeout: 3000 });
      });
    });

    describe("Payment Flow", () => {
      it("redirects to Stripe for paid registration", async () => {
        setupApiMock(mockPaidTournament);
        (useMutation as any).mockReturnValue({ mutate: vi.fn() });

        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        (apiClient.getReservationStatus as any).mockResolvedValue({
          data: {
            hasReservation: true,
            reservationId: "res123",
            expiresAt,
            remainingSeconds: 900,
          },
        });
        (apiClient.createCheckoutSession as any).mockResolvedValue({
          data: {
            sessionId: "cs_123",
            url: "https://checkout.stripe.com/pay/cs_123",
            expiresAt,
          },
        });

        // Mock window.location
        const originalLocation = window.location;
        const locationMock = { href: "" };
        Object.defineProperty(window, "location", {
          value: locationMock,
          writable: true,
        });

        await act(async () => {
          renderPage({ isAuthenticated: true, user: { id: "user1", playerId: "player1" } });
        });

        await waitFor(() => {
          expect(screen.getByRole("button", { name: /Complete Payment/i })).toBeInTheDocument();
        }, { timeout: 3000 });

        await act(async () => {
          fireEvent.click(screen.getByRole("button", { name: /Complete Payment/i }));
        });

        await waitFor(() => {
          expect(apiClient.createCheckoutSession).toHaveBeenCalledWith({
            tournamentId: "1",
            reservationId: "res123",
            discountCode: undefined,
          });
          expect(locationMock.href).toBe("https://checkout.stripe.com/pay/cs_123");
        }, { timeout: 3000 });

        // Restore window.location
        Object.defineProperty(window, "location", {
          value: originalLocation,
          writable: true,
        });
      });

      it("completes free registration instantly", async () => {
        setupApiMock(mockFreeTournament);
        (useMutation as any).mockReturnValue({ mutate: vi.fn() });

        (apiClient.reserveSlot as any).mockResolvedValue({
          data: {
            reservationId: "res123",
            expiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
            remainingSeconds: 1200,
            tournamentId: "1",
            spotsRemaining: 7,
          },
        });

        (apiClient.completeFreeRegistration as any).mockResolvedValue({
          data: {
            ticketId: "ticket123",
            ticketCode: "BOD-FREE123",
            message: "Registration complete",
          },
        });

        await act(async () => {
          renderPage({ isAuthenticated: true, user: { id: "user1", playerId: "player1" } });
        });

        await waitFor(() => {
          expect(screen.getByRole("button", { name: /Register \(Free\)/i })).toBeInTheDocument();
        }, { timeout: 3000 });

        // Click register (reserves slot)
        await act(async () => {
          fireEvent.click(screen.getByRole("button", { name: /Register \(Free\)/i }));
        });

        await waitFor(() => {
          expect(screen.getByRole("button", { name: /Complete Registration/i })).toBeInTheDocument();
        }, { timeout: 3000 });

        // Complete free registration
        await act(async () => {
          fireEvent.click(screen.getByRole("button", { name: /Complete Registration/i }));
        });

        await waitFor(() => {
          expect(apiClient.completeFreeRegistration).toHaveBeenCalledWith({
            tournamentId: "1",
            reservationId: "res123",
          });
          expect(screen.getByText("You're Registered!")).toBeInTheDocument();
          expect(screen.getByText("BOD-FREE123")).toBeInTheDocument();
        }, { timeout: 3000 });
      });
    });

    describe("Does not break existing functionality", () => {
      it("does not show registration section for completed tournaments", async () => {
        // Use past date so getTournamentStatus returns "completed"
        const pastDate = new Date("2023-01-01T09:00:00Z").toISOString();
        setupApiMock({ ...mockTournament, date: pastDate, status: "completed" });
        (useMutation as any).mockReturnValue({ mutate: vi.fn() });

        await act(async () => {
          renderPage({ isAuthenticated: true, user: { id: "user1", playerId: "player1" } });
        });

        // Wait for component to render, then check that registration UI elements don't exist
        // The "Spots Remaining" text only appears in the Registration section
        await waitFor(() => {
          expect(screen.queryByText("Spots Remaining")).not.toBeInTheDocument();
        }, { timeout: 3000 });
        // Register button should also not appear
        expect(screen.queryByRole("button", { name: /Register/i })).not.toBeInTheDocument();
      });

      it("admin can still see admin controls", async () => {
        setupApiMock(mockPaidTournament);
        (useMutation as any).mockReturnValue({ mutate: vi.fn() });

        await act(async () => {
          renderPage({ isAdmin: true, isAuthenticated: true, user: { id: "admin1", playerId: "player1" } });
        });

        await waitFor(() => {
          expect(screen.getByTitle("Delete Tournament")).toBeInTheDocument();
        }, { timeout: 3000 });
      });
    });
  });
});
