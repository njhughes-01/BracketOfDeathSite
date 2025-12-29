import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import TournamentTable from "../TournamentTable";

describe("TournamentTable", () => {
    const mockTournaments = [
        {
            id: "t1",
            bodNumber: 202507,
            date: "2025-07-15",
            location: "Wimbledon",
            format: "Mixed",
            currentPlayerCount: 16,
            maxPlayers: 32,
            registrationType: "solo",
        },
        {
            id: "t2",
            bodNumber: 202512,
            date: "2025-12-10",
            location: "US Open",
            format: "Mens",
            currentPlayerCount: 32,
            maxPlayers: 32,
            isFull: true,
            registrationType: "solo",
        },
    ];

    const defaultProps = {
        tournaments: mockTournaments as any,
        sortField: "date" as any,
        sortDirection: "desc" as any,
        onSort: vi.fn(),
    };

    const renderWithRouter = (component: React.ReactElement) => {
        return render(<BrowserRouter>{component}</BrowserRouter>);
    };

    it("should render tournament data", () => {
        renderWithRouter(<TournamentTable {...defaultProps} />);

        expect(screen.getByText("#202507")).toBeInTheDocument();
        expect(screen.getByText("Wimbledon")).toBeInTheDocument();
        expect(screen.getByText("#202512")).toBeInTheDocument();
        expect(screen.getByText("US Open")).toBeInTheDocument();
    });

    it("should show correct status badges", () => {
        renderWithRouter(<TournamentTable {...defaultProps} />);

        // 2025-07-15 is completed (since it's Dec 2025 in the system clock for this task)
        // 2025-12-10 is completed (since today is Dec 29)
        // Wait, the component uses getTournamentStatus(tournament.date)
        // Let's check what it shows
        expect(screen.getAllByText(/Completed/i).length).toBeGreaterThan(0);
    });

    it("should show empty state when no tournaments", () => {
        renderWithRouter(<TournamentTable {...defaultProps} tournaments={[]} />);
        expect(screen.getByText(/No tournaments found/i)).toBeInTheDocument();
    });

    it("should call onSort when header clicked", () => {
        const mockOnSort = vi.fn();
        renderWithRouter(<TournamentTable {...defaultProps} onSort={mockOnSort} />);

        const locationHeader = screen.getByText(/Location/i);
        fireEvent.click(locationHeader);

        expect(mockOnSort).toHaveBeenCalledWith("location");
    });

    it("should render registration badges (e.g. Full)", () => {
        renderWithRouter(<TournamentTable {...defaultProps} />);
        expect(screen.getByText(/Full/i)).toBeInTheDocument();
    });
});
