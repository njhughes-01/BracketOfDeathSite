import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import TournamentTable from "../TournamentTable";

describe("TournamentTable", () => {
    const mockTournaments = [
        {
            id: "t1",
            name: "Summer Championship",
            bodNumber: 202507,
            date: "2025-07-15",
            status: "scheduled",
            format: "Mixed",
        },
        {
            id: "t2",
            name: "Winter Open",
            bodNumber: 202512,
            date: "2025-12-10",
            status: "completed",
            format: "Mens",
        },
    ];

    const defaultProps = {
        tournaments: mockTournaments,
        onTournamentClick: vi.fn(),
    };

    const renderWithRouter = (component: React.ReactElement) => {
        return render(<BrowserRouter>{component}</BrowserRouter>);
    };

    it("should render tournament names", () => {
        renderWithRouter(<TournamentTable {...defaultProps} />);

        expect(screen.getByText("Summer Championship")).toBeInTheDocument();
        expect(screen.getByText("Winter Open")).toBeInTheDocument();
    });

    it("should show table headers", () => {
        renderWithRouter(<TournamentTable {...defaultProps} />);

        expect(screen.getByText(/name|tournament/i)).toBeInTheDocument();
        expect(screen.getByText(/date/i)).toBeInTheDocument();
        expect(screen.getByText(/status/i)).toBeInTheDocument();
    });

    it("should show empty state when no tournaments", () => {
        renderWithRouter(<TournamentTable tournaments={[]} onTournamentClick={vi.fn()} />);

        expect(screen.getByText(/no tournaments|empty/i)).toBeInTheDocument();
    });

    it("should call onTournamentClick when row clicked", () => {
        const mockOnClick = vi.fn();
        renderWithRouter(
            <TournamentTable
                tournaments={mockTournaments}
                onTournamentClick={mockOnClick}
            />
        );

        const row = screen.getByText("Summer Championship").closest("tr");
        if (row) {
            fireEvent.click(row);
            expect(mockOnClick).toHaveBeenCalledWith(mockTournaments[0]);
        }
    });

    it("should show status badges", () => {
        renderWithRouter(<TournamentTable {...defaultProps} />);

        expect(screen.getByText(/scheduled/i)).toBeInTheDocument();
        expect(screen.getByText(/completed/i)).toBeInTheDocument();
    });
});
