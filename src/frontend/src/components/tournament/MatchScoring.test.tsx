import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import MatchScoring from "./MatchScoring";
import { useAuth } from "../../contexts/AuthContext";

// Mock dependencies
vi.mock("../../contexts/AuthContext");
vi.mock("../../utils/tennisValidation", () => ({
  validateTennisScore: vi.fn((s1, s2) => {
    // Simple mock logic matching standard tennis rules for testing
    if ((s1 === 6 && s2 <= 4) || (s1 <= 4 && s2 === 6))
      return { isValid: true };
    if (
      (s1 === 7 && (s2 === 5 || s2 === 6)) ||
      ((s1 === 5 || s1 === 6) && s2 === 7)
    )
      return { isValid: true };
    if (s1 === 5 && s2 === 3)
      return { isValid: false, reason: "Invalid set score" }; // Specific invalid case
    return { isValid: false, reason: "Generic invalid" };
  }),
}));

describe("MatchScoring Component", () => {
  const mockUpdateMatch = vi.fn();
  const mockUser = { username: "admin_user" };

  const defaultMatch = {
    _id: "m1",
    matchNumber: 1,
    round: "quarterfinal",
    status: "in-progress",
    team1: {
      players: ["p1"],
      playerNames: ["PlayerOne"],
      score: 0,
    },
    team2: {
      players: ["p2"],
      playerNames: ["PlayerTwo"],
      score: 0,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: mockUser });
  });

  it("renders team names and scores", () => {
    render(
      <MatchScoring
        match={defaultMatch as any}
        onUpdateMatch={mockUpdateMatch}
      />,
    );
    expect(screen.getByText("PlayerOne")).toBeInTheDocument();
    expect(screen.getByText("PlayerTwo")).toBeInTheDocument();
  });

  it("allows manual save without completion", () => {
    render(
      <MatchScoring
        match={defaultMatch as any}
        onUpdateMatch={mockUpdateMatch}
      />,
    );

    // Find save button (using class or text)
    const saveBtns = screen.getAllByText("Save");
    fireEvent.click(saveBtns[0]); // Click first save button found

    expect(mockUpdateMatch).toHaveBeenCalledWith(
      expect.objectContaining({
        matchId: "m1",
        status: "in-progress",
      }),
    );
  });

  it("Save sends in-progress status even when scores are non-tied", () => {
    // This is the core bug fix test: Save should NOT auto-complete.
    // Previously, entering non-tied scores and clicking Save would trigger
    // completed-match validation on the backend because status was ignored.
    const matchWithScores = {
      ...defaultMatch,
      team1: {
        ...defaultMatch.team1,
        score: 5,
        playerScores: [{ playerId: "p1", playerName: "PlayerOne", score: 5 }],
      },
      team2: {
        ...defaultMatch.team2,
        score: 3,
        playerScores: [{ playerId: "p2", playerName: "PlayerTwo", score: 3 }],
      },
    };

    render(
      <MatchScoring
        match={matchWithScores as any}
        onUpdateMatch={mockUpdateMatch}
      />,
    );

    const saveBtns = screen.getAllByText("Save");
    fireEvent.click(saveBtns[0]);

    expect(mockUpdateMatch).toHaveBeenCalledWith(
      expect.objectContaining({
        matchId: "m1",
        status: "in-progress",
      }),
    );
    // Must NOT send status "completed"
    expect(mockUpdateMatch).not.toHaveBeenCalledWith(
      expect.objectContaining({
        status: "completed",
      }),
    );
  });

  it("Save does not include endTime (only Confirm Result does)", () => {
    render(
      <MatchScoring
        match={defaultMatch as any}
        onUpdateMatch={mockUpdateMatch}
      />,
    );

    const saveBtns = screen.getAllByText("Save");
    fireEvent.click(saveBtns[0]);

    const call = mockUpdateMatch.mock.calls[0][0];
    expect(call.endTime).toBeUndefined();
  });

  it("Confirm Result sends completed status with endTime", () => {
    const validMatch = {
      ...defaultMatch,
      team1: { ...defaultMatch.team1, score: 6 },
      team2: { ...defaultMatch.team2, score: 4 },
    };

    render(
      <MatchScoring
        match={validMatch as any}
        onUpdateMatch={mockUpdateMatch}
        strictTotals={false}
      />,
    );

    const confirmBtns = screen.getAllByText("Confirm Result");
    fireEvent.click(confirmBtns[0]);

    expect(mockUpdateMatch).toHaveBeenCalledWith(
      expect.objectContaining({
        matchId: "m1",
        status: "completed",
        endTime: expect.any(String),
      }),
    );
  });

  it("validates valid tennis score (6-4)", () => {
    const validMatch = {
      ...defaultMatch,
      team1: { ...defaultMatch.team1, score: 6 },
      team2: { ...defaultMatch.team2, score: 4 },
    };

    render(
      <MatchScoring
        match={validMatch as any}
        onUpdateMatch={mockUpdateMatch}
        strictTotals={false} // Allow override for testing
      />,
    );

    const confirmBtns = screen.getAllByText("Confirm Result");
    fireEvent.click(confirmBtns[0]);

    // Should complete immediately
    expect(mockUpdateMatch).toHaveBeenCalledWith(
      expect.objectContaining({
        matchId: "m1",
        status: "completed",
        team1Score: 6,
        team2Score: 4,
      }),
    );
  });

  it("shows admin override dialog for invalid score (5-3)", async () => {
    const invalidMatch = {
      ...defaultMatch,
      team1: { ...defaultMatch.team1, score: 5 },
      team2: { ...defaultMatch.team2, score: 3 },
    };

    render(
      <MatchScoring
        match={invalidMatch as any}
        onUpdateMatch={mockUpdateMatch}
        strictTotals={false}
      />,
    );

    const confirmBtns = screen.getAllByText("Confirm Result");
    fireEvent.click(confirmBtns[0]);

    // Dialog should appear
    expect(screen.getByText("Admin Override Required")).toBeInTheDocument();
    expect(screen.getByText("Invalid set score")).toBeInTheDocument();

    // Enter reason and confirm
    const reasonInput = screen.getByPlaceholderText(
      "e.g., Retire due to injury",
    );
    fireEvent.change(reasonInput, { target: { value: "Injury" } });

    fireEvent.click(screen.getByText("Confirm Override"));

    // Should complete with override
    expect(mockUpdateMatch).toHaveBeenCalledWith(
      expect.objectContaining({
        matchId: "m1",
        status: "completed",
        adminOverride: {
          reason: "Injury",
          authorizedBy: "admin_user",
        },
      }),
    );
  });
});
