import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import PlayerLeaderboard from "../PlayerLeaderboard";

describe("PlayerLeaderboard", () => {
    const mockPlayers = [
        { playerId: "p1", name: "John Doe", wins: 10, losses: 2, winRate: 0.833 },
        { playerId: "p2", name: "Jane Smith", wins: 8, losses: 3, winRate: 0.727 },
        { playerId: "p3", name: "Bob Wilson", wins: 6, losses: 4, winRate: 0.600 },
    ];

    const renderWithRouter = (component: React.ReactElement) => {
        return render(<BrowserRouter>{component}</BrowserRouter>);
    };

    it("should render leaderboard header", () => {
        renderWithRouter(<PlayerLeaderboard players={mockPlayers} />);

        expect(screen.getByText(/leaderboard|rankings/i)).toBeInTheDocument();
    });

    it("should display player names", () => {
        renderWithRouter(<PlayerLeaderboard players={mockPlayers} />);

        expect(screen.getByText("John Doe")).toBeInTheDocument();
        expect(screen.getByText("Jane Smith")).toBeInTheDocument();
        expect(screen.getByText("Bob Wilson")).toBeInTheDocument();
    });

    it("should display wins", () => {
        renderWithRouter(<PlayerLeaderboard players={mockPlayers} />);

        expect(screen.getByText("10")).toBeInTheDocument();
        expect(screen.getByText("8")).toBeInTheDocument();
    });

    it("should show empty state when no players", () => {
        renderWithRouter(<PlayerLeaderboard players={[]} />);

        expect(screen.getByText(/no players|empty/i)).toBeInTheDocument();
    });

    it("should show rank numbers", () => {
        renderWithRouter(<PlayerLeaderboard players={mockPlayers} />);

        expect(screen.getByText("1")).toBeInTheDocument();
        expect(screen.getByText("2")).toBeInTheDocument();
        expect(screen.getByText("3")).toBeInTheDocument();
    });
});
