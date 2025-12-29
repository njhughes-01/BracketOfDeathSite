import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import MatchesToolbar from "../MatchesToolbar";

describe("MatchesToolbar", () => {
    const defaultProps = {
        matchCount: 10,
        compactListView: false,
        onToggleCompact: vi.fn(),
        requirePerPlayerScores: false,
        onToggleRequirePerPlayer: vi.fn(),
        strictTotals: false,
        onToggleStrictTotals: vi.fn(),
        canConfirmAll: true,
        onConfirmAll: vi.fn(),
    };

    it("should render toolbar with match count", () => {
        render(<MatchesToolbar {...defaultProps} />);
        expect(screen.getByText(/10 matches in this round/i)).toBeInTheDocument();
    });

    it("should toggle compact view", () => {
        const onToggleCompact = vi.fn();
        render(<MatchesToolbar {...defaultProps} onToggleCompact={onToggleCompact} />);

        const checkbox = screen.getByLabelText(/List View/i);
        fireEvent.click(checkbox);
        expect(onToggleCompact).toHaveBeenCalledWith(true);
    });

    it("should toggle perloader scores", () => {
        const onToggleRequirePerPlayer = vi.fn();
        render(<MatchesToolbar {...defaultProps} onToggleRequirePerPlayer={onToggleRequirePerPlayer} />);

        const checkbox = screen.getByLabelText(/Require Per-Player/i);
        fireEvent.click(checkbox);
        expect(onToggleRequirePerPlayer).toHaveBeenCalledWith(true);
    });

    it("should toggle strict totals", () => {
        const onToggleStrictTotals = vi.fn();
        render(<MatchesToolbar {...defaultProps} onToggleStrictTotals={onToggleStrictTotals} />);

        const checkbox = screen.getByLabelText(/Lock Totals/i);
        fireEvent.click(checkbox);
        expect(onToggleStrictTotals).toHaveBeenCalledWith(true);
    });

    it("should call onConfirmAll when button clicked", () => {
        const onConfirmAll = vi.fn();
        render(<MatchesToolbar {...defaultProps} onConfirmAll={onConfirmAll} />);

        const button = screen.getByRole("button", { name: /Confirm All Completed/i });
        fireEvent.click(button);
        expect(onConfirmAll).toHaveBeenCalled();
    });

    it("should disable Confirm All button when loading", () => {
        render(<MatchesToolbar {...defaultProps} loading={true} />);
        const button = screen.getByRole("button", { name: /Confirm All Completed/i });
        expect(button).toBeDisabled();
    });
});
