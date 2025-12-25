import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Players from "../Players";
import { useApi } from "../../hooks/useApi";

// Mock hooks
vi.mock("../../hooks/useApi");
const mockUseAuth = vi.fn(() => ({ isAdmin: false }));
vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockPlayers = [
  {
    id: "1",
    name: "John Doe",
    winningPercentage: 0.75,
    totalChampionships: 1,
    gamesPlayed: 20,
  },
  {
    id: "2",
    name: "Jane Smith",
    winningPercentage: 0.45,
    totalChampionships: 0,
    gamesPlayed: 10,
  },
];

describe("Players Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupMock = (data: any = { data: mockPlayers }, loading = false) => {
    (useApi as any).mockReturnValue({
      data,
      loading,
      execute: vi.fn(),
      error: null,
    });
  };

  const renderPage = () => {
    render(
      <MemoryRouter>
        <Players />
      </MemoryRouter>,
    );
  };

  it("renders loading state", () => {
    setupMock(null, true);
    renderPage();
    // Check for pulse animation elements which indicate loading
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders player list", () => {
    setupMock();
    renderPage();

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("75% Win Rate")).toBeInTheDocument();
    expect(screen.getByText("45% Win Rate")).toBeInTheDocument();
  });

  it("renders empty state", () => {
    setupMock({ data: [] });
    renderPage();

    expect(screen.getByText("No players found")).toBeInTheDocument();
  });

  it("toggles filters", () => {
    setupMock();
    renderPage();

    // Filters hidden initially
    expect(screen.queryByText("Sort By")).not.toBeInTheDocument();

    // Click filter button (tune icon)
    const filterBtn = screen.getByText("tune").closest("button");
    fireEvent.click(filterBtn!);

    expect(screen.getByText("Sort By")).toBeInTheDocument();
  });

  it("updates search state", () => {
    setupMock();
    renderPage();

    const searchInput = screen.getByPlaceholderText("Search players...");
    fireEvent.change(searchInput, { target: { value: "John" } });

    expect(searchInput).toHaveValue("John");
    // Since we mock useApi, we can't easily check if it re-fetched with the new search term
    // without inspecting the arguments passed to the mocked hook, which is complex because
    // it updates on dependency change.
    // But verifying state update ensures the input is interactive.
  });

  it("shows admin create button when admin", () => {
    setupMock();
    mockUseAuth.mockReturnValue({ isAdmin: true });
    renderPage();

    expect(screen.getByText("add")).toBeInTheDocument();
  });

  it("hides admin create button when not admin", () => {
    setupMock();
    mockUseAuth.mockReturnValue({ isAdmin: false });
    renderPage();

    expect(screen.queryByText("add")).not.toBeInTheDocument();
  });
});
