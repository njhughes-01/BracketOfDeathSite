import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter, MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CheckoutSuccessPage from "../CheckoutSuccessPage";
import { apiClient } from "../../services/api";

// Mock dependencies
vi.mock("../../services/api");
vi.mock("../../utils/logger", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("CheckoutSuccessPage", () => {
  const mockSessionData = {
    ticketId: "ticket-123",
    ticketCode: "BOD-ABC123",
    tournament: {
      id: "tournament-456",
      name: "Spring Championship 2024",
      date: "2024-04-15T10:00:00Z",
      location: "Downtown Arena",
    },
    amountPaid: 2500, // $25.00 in cents
    status: "confirmed",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper to render with router and session_id param
  const renderWithSessionId = (sessionId: string | null) => {
    const initialEntry = sessionId
      ? `/checkout/success?session_id=${sessionId}`
      : "/checkout/success";

    return render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it("renders loading state initially when session_id is provided", async () => {
    // Make API call hang to see loading state
    (apiClient.getCheckoutSession as any).mockImplementation(
      () => new Promise(() => {})
    );

    renderWithSessionId("session-123");

    expect(screen.getByText("Verifying your payment...")).toBeInTheDocument();
    // Loading spinner should be present
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("fetches session status with session_id from URL", async () => {
    (apiClient.getCheckoutSession as any).mockResolvedValue({
      success: true,
      data: mockSessionData,
    });

    renderWithSessionId("test-session-456");

    await waitFor(() => {
      expect(apiClient.getCheckoutSession).toHaveBeenCalledWith(
        "test-session-456"
      );
    });
  });

  it("shows success message with ticket code on successful verification", async () => {
    (apiClient.getCheckoutSession as any).mockResolvedValue({
      success: true,
      data: mockSessionData,
    });

    renderWithSessionId("session-123");

    await waitFor(() => {
      expect(screen.getByText("You're Registered!")).toBeInTheDocument();
    });

    // Check ticket code is displayed
    expect(screen.getByText("BOD-ABC123")).toBeInTheDocument();

    // Check tournament name is displayed
    expect(screen.getByText("Spring Championship 2024")).toBeInTheDocument();

    // Check amount paid is displayed ($25.00)
    expect(screen.getByText("$25.00")).toBeInTheDocument();

    // Check success message
    expect(
      screen.getByText(
        "Your payment was successful and your spot is confirmed."
      )
    ).toBeInTheDocument();
  });

  it("shows QR code preview placeholder", async () => {
    (apiClient.getCheckoutSession as any).mockResolvedValue({
      success: true,
      data: mockSessionData,
    });

    renderWithSessionId("session-123");

    await waitFor(() => {
      expect(screen.getByText("You're Registered!")).toBeInTheDocument();
    });

    // QR code icon should be present (material-symbols-outlined qr_code_2)
    const qrIcons = document.querySelectorAll(
      ".material-symbols-outlined"
    );
    const qrCodeIcon = Array.from(qrIcons).find(
      (el) => el.textContent === "qr_code_2"
    );
    expect(qrCodeIcon).toBeInTheDocument();
  });

  it('"Browse Tournaments" button links correctly', async () => {
    (apiClient.getCheckoutSession as any).mockResolvedValue({
      success: true,
      data: mockSessionData,
    });

    renderWithSessionId("session-123");

    await waitFor(() => {
      expect(screen.getByText("You're Registered!")).toBeInTheDocument();
    });

    const browseButton = screen.getByRole("link", { name: /browse tournaments/i });
    expect(browseButton).toHaveAttribute("href", "/tournaments");
  });

  it('"View My Tickets" button links to profile', async () => {
    (apiClient.getCheckoutSession as any).mockResolvedValue({
      success: true,
      data: mockSessionData,
    });

    renderWithSessionId("session-123");

    await waitFor(() => {
      expect(screen.getByText("You're Registered!")).toBeInTheDocument();
    });

    const viewTicketsButton = screen.getByRole("link", { name: /view my tickets/i });
    expect(viewTicketsButton).toHaveAttribute("href", "/profile");
  });

  it("shows error state when session verification fails", async () => {
    (apiClient.getCheckoutSession as any).mockRejectedValue(
      new Error("Session not found")
    );

    renderWithSessionId("invalid-session");

    await waitFor(() => {
      expect(screen.getByText("Verification Issue")).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        "Failed to verify your payment. Please check your profile for ticket status."
      )
    ).toBeInTheDocument();
  });

  it("shows error state when API returns success: false", async () => {
    (apiClient.getCheckoutSession as any).mockResolvedValue({
      success: false,
      data: null,
    });

    renderWithSessionId("bad-session");

    await waitFor(() => {
      expect(screen.getByText("Verification Issue")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Failed to verify your payment")
    ).toBeInTheDocument();
  });

  it("shows error state when no session_id is provided", async () => {
    renderWithSessionId(null);

    await waitFor(() => {
      expect(screen.getByText("Verification Issue")).toBeInTheDocument();
    });

    expect(screen.getByText("No session ID provided")).toBeInTheDocument();
  });

  it("shows profile link in error state", async () => {
    (apiClient.getCheckoutSession as any).mockRejectedValue(
      new Error("Failed")
    );

    renderWithSessionId("bad-session");

    await waitFor(() => {
      expect(screen.getByText("Verification Issue")).toBeInTheDocument();
    });

    const profileLink = screen.getByRole("link", { name: /check my profile/i });
    expect(profileLink).toHaveAttribute("href", "/profile");
  });

  it("displays tournament location when provided", async () => {
    (apiClient.getCheckoutSession as any).mockResolvedValue({
      success: true,
      data: mockSessionData,
    });

    renderWithSessionId("session-123");

    await waitFor(() => {
      expect(screen.getByText("Downtown Arena")).toBeInTheDocument();
    });
  });

  it("displays formatted date correctly", async () => {
    (apiClient.getCheckoutSession as any).mockResolvedValue({
      success: true,
      data: mockSessionData,
    });

    renderWithSessionId("session-123");

    await waitFor(() => {
      // The date should be formatted as "Monday, April 15, 2024"
      expect(screen.getByText(/Monday, April 15, 2024/i)).toBeInTheDocument();
    });
  });

  it('displays "Free" for zero amount', async () => {
    const freeSessionData = {
      ...mockSessionData,
      amountPaid: 0,
    };

    (apiClient.getCheckoutSession as any).mockResolvedValue({
      success: true,
      data: freeSessionData,
    });

    renderWithSessionId("session-123");

    await waitFor(() => {
      expect(screen.getByText("Free")).toBeInTheDocument();
    });
  });
});
