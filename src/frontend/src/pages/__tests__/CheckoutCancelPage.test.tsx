import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect } from "vitest";
import CheckoutCancelPage from "../CheckoutCancelPage";

describe("CheckoutCancelPage", () => {
  // Helper to render with router and optional tournament_id param
  const renderWithTournamentId = (tournamentId: string | null) => {
    const initialEntry = tournamentId
      ? `/checkout/cancel?tournament_id=${tournamentId}`
      : "/checkout/cancel";

    return render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/checkout/cancel" element={<CheckoutCancelPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it("renders cancel/timeout message", () => {
    renderWithTournamentId(null);

    expect(
      screen.getByText("Registration Not Completed")
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /Your checkout was cancelled or timed out/i
      )
    ).toBeInTheDocument();
  });

  it('shows "slot released" explanation', () => {
    renderWithTournamentId(null);

    expect(
      screen.getByText(/no payment was processed and your slot has been released/i)
    ).toBeInTheDocument();

    // Check the detailed explanation list
    expect(
      screen.getByText("No payment was charged to your account")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Your reserved slot has been released")
    ).toBeInTheDocument();
    expect(
      screen.getByText("You can try registering again if spots are available")
    ).toBeInTheDocument();
  });

  it('"Try Again" button links to tournament when tournament_id is provided', () => {
    renderWithTournamentId("tournament-456");

    const tryAgainButton = screen.getByRole("link", { name: /try again/i });
    expect(tryAgainButton).toBeInTheDocument();
    expect(tryAgainButton).toHaveAttribute("href", "/tournaments/tournament-456");
  });

  it('shows "Browse Tournaments" instead of "Try Again" when tournament_id is missing', () => {
    renderWithTournamentId(null);

    // Should NOT have "Try Again" button
    expect(
      screen.queryByRole("link", { name: /try again/i })
    ).not.toBeInTheDocument();

    // Should have "Browse Tournaments" button
    const browseButton = screen.getByRole("link", { name: /browse tournaments/i });
    expect(browseButton).toBeInTheDocument();
    expect(browseButton).toHaveAttribute("href", "/tournaments");
  });

  it('"Go Home" button links to home page', () => {
    renderWithTournamentId(null);

    const homeButton = screen.getByRole("link", { name: /go home/i });
    expect(homeButton).toBeInTheDocument();
    expect(homeButton).toHaveAttribute("href", "/dashboard");
  });

  it("shows contact support link", () => {
    renderWithTournamentId(null);

    expect(screen.getByText(/having trouble\?/i)).toBeInTheDocument();

    const supportLink = screen.getByRole("link", { name: /contact support/i });
    expect(supportLink).toBeInTheDocument();
    expect(supportLink).toHaveAttribute("href", "/contact");
  });

  it('displays "What happened?" info section', () => {
    renderWithTournamentId(null);

    expect(screen.getByText("What happened?")).toBeInTheDocument();
  });

  it("renders event_busy icon for cancelled checkout", () => {
    renderWithTournamentId(null);

    // Check for the material icon
    const icons = document.querySelectorAll(".material-symbols-outlined");
    const eventBusyIcon = Array.from(icons).find(
      (el) => el.textContent === "event_busy"
    );
    expect(eventBusyIcon).toBeInTheDocument();
  });

  it("handles empty string tournament_id gracefully", () => {
    // Empty string should be treated as no tournament_id
    render(
      <MemoryRouter initialEntries={["/checkout/cancel?tournament_id="]}>
        <Routes>
          <Route path="/checkout/cancel" element={<CheckoutCancelPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Empty string is falsy in the component's conditional, so should show Browse Tournaments
    // Actually let's check - empty string from searchParams.get returns ""
    // which is falsy in JS, so it should show Browse Tournaments
    const browseButton = screen.getByRole("link", { name: /browse tournaments/i });
    expect(browseButton).toBeInTheDocument();
  });
});
