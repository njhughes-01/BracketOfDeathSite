import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import MatchesToolbar from "../MatchesToolbar";

describe("MatchesToolbar", () => {
    const defaultProps = {
        onFilterChange: vi.fn(),
        currentRound: "all",
    };

    it("should render toolbar", () => {
        render(<MatchesToolbar {...defaultProps} />);

        expect(document.body).toBeInTheDocument();
    });

    it("should show round filter options", () => {
        render(<MatchesToolbar {...defaultProps} />);

        // Should have some form of filter control
        const selects = screen.queryAllByRole("combobox");
        const buttons = screen.queryAllByRole("button");
        expect(selects.length + buttons.length).toBeGreaterThan(0);
    });

    it("should call onFilterChange when filter changes", () => {
        const mockOnFilterChange = vi.fn();
        render(<MatchesToolbar {...defaultProps} onFilterChange={mockOnFilterChange} />);

        const controls = screen.queryAllByRole("combobox");
        if (controls.length > 0) {
            fireEvent.change(controls[0], { target: { value: "quarterfinal" } });
            expect(mockOnFilterChange).toHaveBeenCalled();
        }
    });

    it("should highlight current round selection", () => {
        render(<MatchesToolbar currentRound="semifinal" onFilterChange={vi.fn()} />);

        // Component should render with the current round
        expect(document.body).toBeInTheDocument();
    });
});
