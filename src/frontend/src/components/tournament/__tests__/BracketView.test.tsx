import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import BracketView from "../BracketView";
import type { Match, TeamSeed } from "../../../types/api";

describe("BracketView", () => {
    const mockTeams: TeamSeed[] = [
        { teamId: "t1", teamName: "Team Alpha", seed: 1, players: [] },
        { teamId: "t2", teamName: "Team Beta", seed: 2, players: [] },
    ];

    const renderWithRouter = (component: React.ReactElement) => {
        return render(<BrowserRouter>{component}</BrowserRouter>);
    };

    it("should render with empty matches", () => {
        renderWithRouter(
            <BracketView
                matches={[]}
                teams={mockTeams}
            />
        );

        expect(screen.getByText("Tournament Bracket")).toBeInTheDocument();
    });

    it("should show empty state message when no matches", () => {
        renderWithRouter(
            <BracketView
                matches={[]}
                teams={mockTeams}
            />
        );

        expect(screen.getByText("No Bracket Matches")).toBeInTheDocument();
    });

    it("should render bracket legend", () => {
        renderWithRouter(
            <BracketView
                matches={[]}
                teams={mockTeams}
            />
        );

        expect(screen.getByText("Legend")).toBeInTheDocument();
        expect(screen.getByText("Scheduled")).toBeInTheDocument();
        expect(screen.getByText("In Progress")).toBeInTheDocument();
        expect(screen.getByText("Completed")).toBeInTheDocument();
    });

    it("should show current round when provided", () => {
        renderWithRouter(
            <BracketView
                matches={[]}
                teams={mockTeams}
                currentRound="semifinal"
            />
        );

        expect(screen.getByText(/Current Round/)).toBeInTheDocument();
    });

    it("should handle matches render correctly", () => {
        const mockMatches: Match[] = [
            {
                _id: "m1",
                tournamentId: "t1",
                round: "quarterfinal",
                roundNumber: 1,
                matchNumber: 1,
                team1: { playerNames: ["Player A"], score: 6, players: [], seed: 1 },
                team2: { playerNames: ["Player B"], score: 3, players: [], seed: 2 },
                status: "completed",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
        ] as any;

        renderWithRouter(
            <BracketView
                matches={mockMatches}
                teams={mockTeams}
            />
        );

        expect(screen.getByText("Quarterfinals")).toBeInTheDocument();
    });
});
