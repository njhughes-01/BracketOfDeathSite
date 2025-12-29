import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ConfirmationModal from "../ConfirmationModal";

describe("ConfirmationModal", () => {
    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        onConfirm: vi.fn(),
        title: "Confirm Action",
        message: "Are you sure you want to proceed?",
    };

    it("should not render when closed", () => {
        render(<ConfirmationModal {...defaultProps} isOpen={false} />);
        expect(screen.queryByText("Confirm Action")).not.toBeInTheDocument();
    });

    it("should render title and message when open", () => {
        render(<ConfirmationModal {...defaultProps} />);
        expect(screen.getByText("Confirm Action")).toBeInTheDocument();
        expect(screen.getByText("Are you sure you want to proceed?")).toBeInTheDocument();
    });

    it("should call onClose when cancel clicked", () => {
        const mockOnClose = vi.fn();
        render(<ConfirmationModal {...defaultProps} onClose={mockOnClose} />);

        const cancelButton = screen.getByRole("button", { name: /cancel/i });
        fireEvent.click(cancelButton);
        expect(mockOnClose).toHaveBeenCalled();
    });

    it("should call onConfirm when confirm clicked", () => {
        const mockOnConfirm = vi.fn();
        render(<ConfirmationModal {...defaultProps} onConfirm={mockOnConfirm} />);

        const confirmButton = screen.getByRole("button", { name: /confirm/i });
        fireEvent.click(confirmButton);
        expect(mockOnConfirm).toHaveBeenCalled();
    });

    it("should show danger styling when isDangerous is true", () => {
        render(<ConfirmationModal {...defaultProps} isDangerous={true} />);

        const confirmButton = screen.getByRole("button", { name: /confirm/i });
        expect(confirmButton).toHaveClass("btn-danger");
        expect(screen.getByText("⚠️")).toBeInTheDocument();
    });

    it("should show loading state", () => {
        render(<ConfirmationModal {...defaultProps} isLoading={true} />);

        expect(screen.getByText(/Processing.../i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();
        expect(screen.getByRole("button", { name: /processing/i })).toBeDisabled();
    });
});
