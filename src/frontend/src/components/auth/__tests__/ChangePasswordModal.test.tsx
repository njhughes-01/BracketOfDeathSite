import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ChangePasswordModal from "../ChangePasswordModal";

describe("ChangePasswordModal", () => {
    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        onSubmit: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should not render when closed", () => {
        render(<ChangePasswordModal {...defaultProps} isOpen={false} />);

        expect(screen.queryByText(/change password/i)).not.toBeInTheDocument();
    });

    it("should render when open", () => {
        render(<ChangePasswordModal {...defaultProps} />);

        expect(screen.getByText(/change password/i)).toBeInTheDocument();
    });

    it("should have current password field", () => {
        render(<ChangePasswordModal {...defaultProps} />);

        expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
    });

    it("should have new password field", () => {
        render(<ChangePasswordModal {...defaultProps} />);

        expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    });

    it("should have confirm password field", () => {
        render(<ChangePasswordModal {...defaultProps} />);

        expect(screen.getByLabelText(/confirm/i)).toBeInTheDocument();
    });

    it("should call onClose when cancel clicked", () => {
        const mockOnClose = vi.fn();
        render(<ChangePasswordModal {...defaultProps} onClose={mockOnClose} />);

        const cancelButton = screen.getByRole("button", { name: /cancel/i });
        fireEvent.click(cancelButton);

        expect(mockOnClose).toHaveBeenCalled();
    });

    it("should have submit button", () => {
        render(<ChangePasswordModal {...defaultProps} />);

        const submitButton = screen.getByRole("button", { name: /change|save|update|submit/i });
        expect(submitButton).toBeInTheDocument();
    });
});
