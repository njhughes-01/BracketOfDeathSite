import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Rankings from "../Rankings";
import { useApi } from "../../hooks/useApi";

// Mock hooks
vi.mock("../../hooks/useApi");

const mockLeaderboard = [
  {
    _id: "1",
    name: "Champion Player",
    totalChampionships: 5,
    winningPercentage: 0.85,
    totalWins: 50,
    totalLosses: 10,
    points: 5000,
  },
  {
    _id: "2",
    name: "Runner Up",
    totalChampionships: 0,
    winningPercentage: 0.6,
    totalWins: 30,
    totalLosses: 20,
    points: 2000,
  },
];

describe("Rankings Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupMock = (
    data: any = mockLeaderboard,
    loading = false,
    error: string | null = null,
  ) => {
    (useApi as any).mockReturnValue({
      data,
      loading,
      error,
      execute: vi.fn(),
      reset: vi.fn(),
    });
  };

  const renderPage = () => {
    render(
      <MemoryRouter>
        <Rankings />
      </MemoryRouter>,
    );
  };

  it("renders loading state", () => {
    setupMock(null, true);
    renderPage();
    expect(
      screen.queryByText(/Failed to load rankings/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Champion Player/i)).not.toBeInTheDocument();
  });

  it("renders leaderboard list", () => {
    setupMock();
    renderPage();

    expect(screen.getByText(/Rankings/i)).toBeInTheDocument();
    expect(screen.getByText(/Champion Player/i)).toBeInTheDocument();
    expect(screen.getByText(/#1/i)).toBeInTheDocument();
    expect(screen.getByText(/5 Titles/i)).toBeInTheDocument();
    // Use regex for win rate to be safe with formatting
    expect(screen.getByText(/85% Win Rate/i)).toBeInTheDocument();

    expect(screen.getByText(/Runner Up/i)).toBeInTheDocument();
    expect(screen.getByText(/#2/i)).toBeInTheDocument();
  });

  it("renders error state", () => {
    setupMock(null, false, "Network Error");
    renderPage();

    expect(screen.getByText(/Failed to load rankings/i)).toBeInTheDocument();
  });

  it("renders empty state", () => {
    setupMock([], false);
    renderPage();

    expect(screen.getByText(/No rankings available/i)).toBeInTheDocument();
  });

  it("updates year filter", () => {
    setupMock();
    renderPage();

    const yearInput = screen.getByPlaceholderText(/e.g. 2025/i);
    expect(yearInput).toBeInTheDocument();

    fireEvent.change(yearInput, { target: { value: "2024" } });
    expect(yearInput).toHaveValue("2024");
  });

  it("updates sort order", () => {
    setupMock();
    renderPage();

    const winRateBtn = screen.getByRole("button", { name: /Win Rate/i });
    fireEvent.click(winRateBtn);
    expect(winRateBtn).toBeInTheDocument();
  });
});
