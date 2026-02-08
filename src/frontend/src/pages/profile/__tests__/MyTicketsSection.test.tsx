import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import MyTicketsSection from "../MyTicketsSection";
import { apiClient } from "../../../services/api";

// Mock dependencies
vi.mock("../../../services/api");
vi.mock("../../../utils/logger", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("MyTicketsSection", () => {
  const mockTickets = [
    {
      id: "ticket-1",
      ticketCode: "BOD-ABC123",
      tournament: {
        id: "tournament-1",
        name: "Spring Championship",
        date: "2024-04-15T10:00:00Z",
        location: "Downtown Arena",
      },
      status: "valid" as const,
      paymentStatus: "paid" as const,
      amountPaid: 2500,
      createdAt: "2024-03-01T12:00:00Z",
    },
    {
      id: "ticket-2",
      ticketCode: "BOD-XYZ789",
      tournament: {
        id: "tournament-2",
        name: "Summer Open",
        date: "2024-06-20T09:00:00Z",
      },
      status: "checked_in" as const,
      paymentStatus: "free" as const,
      amountPaid: 0,
      createdAt: "2024-05-15T10:00:00Z",
      checkedInAt: "2024-06-20T08:45:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper to render with router (for Link components in TicketCard)
  const renderWithRouter = (ui: React.ReactElement) => {
    return render(<BrowserRouter>{ui}</BrowserRouter>);
  };

  it("renders loading state initially", async () => {
    // Make API call hang to see loading state
    (apiClient.getTickets as any).mockImplementation(
      () => new Promise(() => {})
    );

    renderWithRouter(<MyTicketsSection />);

    expect(screen.getByText("My Tickets")).toBeInTheDocument();
    // Loading spinner should be present
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("fetches tickets on mount", async () => {
    (apiClient.getTickets as any).mockResolvedValue({
      success: true,
      data: { tickets: mockTickets },
    });

    renderWithRouter(<MyTicketsSection />);

    await waitFor(() => {
      expect(apiClient.getTickets).toHaveBeenCalled();
    });
  });

  it("renders TicketCard for each ticket", async () => {
    (apiClient.getTickets as any).mockResolvedValue({
      success: true,
      data: { tickets: mockTickets },
    });

    renderWithRouter(<MyTicketsSection />);

    await waitFor(() => {
      expect(screen.getByText("Spring Championship")).toBeInTheDocument();
    });

    // Both ticket codes should be displayed
    expect(screen.getByText("BOD-ABC123")).toBeInTheDocument();
    expect(screen.getByText("BOD-XYZ789")).toBeInTheDocument();

    // Both tournament names
    expect(screen.getByText("Spring Championship")).toBeInTheDocument();
    expect(screen.getByText("Summer Open")).toBeInTheDocument();
  });

  it("shows ticket count badge when tickets exist", async () => {
    (apiClient.getTickets as any).mockResolvedValue({
      success: true,
      data: { tickets: mockTickets },
    });

    renderWithRouter(<MyTicketsSection />);

    await waitFor(() => {
      // Should show "2" as the ticket count
      expect(screen.getByText("2")).toBeInTheDocument();
    });
  });

  it("shows empty state when no tickets", async () => {
    (apiClient.getTickets as any).mockResolvedValue({
      success: true,
      data: { tickets: [] },
    });

    renderWithRouter(<MyTicketsSection />);

    await waitFor(() => {
      expect(screen.getByText("No tickets yet")).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        "When you register for a paid tournament, your tickets will appear here."
      )
    ).toBeInTheDocument();
  });

  it("shows error state on API failure", async () => {
    (apiClient.getTickets as any).mockRejectedValue(new Error("Network error"));

    renderWithRouter(<MyTicketsSection />);

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load your tickets. Please try again.")
      ).toBeInTheDocument();
    });

    // Should show error icon
    const errorIcons = document.querySelectorAll(".material-symbols-outlined");
    const errorIcon = Array.from(errorIcons).find(
      (el) => el.textContent === "error"
    );
    expect(errorIcon).toBeInTheDocument();
  });

  it('shows "Try Again" button in error state', async () => {
    (apiClient.getTickets as any).mockRejectedValue(new Error("Network error"));

    renderWithRouter(<MyTicketsSection />);

    await waitFor(() => {
      expect(screen.getByText("Try Again")).toBeInTheDocument();
    });
  });

  it('"Try Again" button refetches tickets', async () => {
    // First call fails
    (apiClient.getTickets as any).mockRejectedValueOnce(
      new Error("Network error")
    );
    // Second call succeeds
    (apiClient.getTickets as any).mockResolvedValueOnce({
      success: true,
      data: { tickets: mockTickets },
    });

    renderWithRouter(<MyTicketsSection />);

    await waitFor(() => {
      expect(screen.getByText("Try Again")).toBeInTheDocument();
    });

    // Click Try Again
    const tryAgainButton = screen.getByText("Try Again");
    fireEvent.click(tryAgainButton);

    await waitFor(() => {
      expect(screen.getByText("Spring Championship")).toBeInTheDocument();
    });

    // API should have been called twice
    expect(apiClient.getTickets).toHaveBeenCalledTimes(2);
  });

  it("displays ticket status correctly", async () => {
    (apiClient.getTickets as any).mockResolvedValue({
      success: true,
      data: { tickets: mockTickets },
    });

    renderWithRouter(<MyTicketsSection />);

    await waitFor(() => {
      // First ticket has "valid" status
      expect(screen.getByText("Valid")).toBeInTheDocument();
      // Second ticket has "checked_in" status
      expect(screen.getByText("Checked In")).toBeInTheDocument();
    });
  });

  it("shows Resend button for valid tickets", async () => {
    (apiClient.getTickets as any).mockResolvedValue({
      success: true,
      data: { tickets: [mockTickets[0]] }, // Just the valid ticket
    });

    renderWithRouter(<MyTicketsSection />);

    await waitFor(() => {
      expect(screen.getByText("Resend")).toBeInTheDocument();
    });
  });

  it("calls resendTicketEmail when Resend is clicked", async () => {
    (apiClient.getTickets as any).mockResolvedValue({
      success: true,
      data: { tickets: [mockTickets[0]] },
    });
    (apiClient.resendTicketEmail as any).mockResolvedValue({ success: true });

    renderWithRouter(<MyTicketsSection />);

    await waitFor(() => {
      expect(screen.getByText("Resend")).toBeInTheDocument();
    });

    const resendButton = screen.getByText("Resend");
    fireEvent.click(resendButton);

    await waitFor(() => {
      expect(apiClient.resendTicketEmail).toHaveBeenCalledWith("ticket-1");
    });
  });

  it("shows View link for each ticket", async () => {
    (apiClient.getTickets as any).mockResolvedValue({
      success: true,
      data: { tickets: mockTickets },
    });

    renderWithRouter(<MyTicketsSection />);

    await waitFor(() => {
      // Each ticket should have a View link
      const viewLinks = screen.getAllByText("View");
      expect(viewLinks).toHaveLength(2);
    });
  });

  it("links to tournament detail page from ticket", async () => {
    (apiClient.getTickets as any).mockResolvedValue({
      success: true,
      data: { tickets: [mockTickets[0]] },
    });

    renderWithRouter(<MyTicketsSection />);

    await waitFor(() => {
      expect(screen.getByText("Spring Championship")).toBeInTheDocument();
    });

    // Tournament name should link to tournament page
    const tournamentLink = screen.getByRole("link", {
      name: "Spring Championship",
    });
    expect(tournamentLink).toHaveAttribute("href", "/tournaments/tournament-1");
  });
});
