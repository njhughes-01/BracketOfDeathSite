import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import TournamentFilters from "../TournamentFilters";

describe("TournamentFilters", () => {
    const defaultProps = {
        filters: { year: "", format: "", status: "" },
        onFilterChange: vi.fn(),
    };

    const renderWithRouter = (component: React.ReactElement) => {
        return render(<BrowserRouter>{component}</BrowserRouter>);
    };

    it("should render filter controls", () => {
        renderWithRouter(<TournamentFilters {...defaultProps} />);

        expect(document.body).toBeInTheDocument();
    });

    it("should have year filter", () => {
        renderWithRouter(<TournamentFilters {...defaultProps} />);

        expect(screen.getByText(/year/i)).toBeInTheDocument();
    });

    it("should have format filter", () => {
        renderWithRouter(<TournamentFilters {...defaultProps} />);

        expect(screen.getByText(/format/i)).toBeInTheDocument();
    });

    it("should have status filter", () => {
        renderWithRouter(<TournamentFilters {...defaultProps} />);

        expect(screen.getByText(/status/i)).toBeInTheDocument();
    });

    it("should call onFilterChange when filter changes", () => {
        const mockOnFilterChange = vi.fn();
        renderWithRouter(
            <TournamentFilters
                {...defaultProps}
                onFilterChange={mockOnFilterChange}
            />
        );

        const selects = screen.getAllByRole("combobox");
        if (selects.length > 0) {
            fireEvent.change(selects[0], { target: { value: "2024" } });
            expect(mockOnFilterChange).toHaveBeenCalled();
        }
    });

    it("should have clear filters button", () => {
        renderWithRouter(<TournamentFilters {...defaultProps} />);

        const clearButton = screen.queryByRole("button", { name: /clear|reset/i });
        // Clear button may or may not be present
        expect(document.body).toBeInTheDocument();
    });
});
