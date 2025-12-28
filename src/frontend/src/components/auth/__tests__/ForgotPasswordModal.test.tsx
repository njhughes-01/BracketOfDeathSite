import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ForgotPasswordModal from "../ForgotPasswordModal";

describe("ForgotPasswordModal", () => {
    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        onSubmit: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should not render when closed", () => {
        render(<ForgotPasswordModal {...defaultProps} isOpen={false} />);

        expect(screen.queryByText(/forgot password|reset password/i)).not.toBeInTheDocument();
    });

    it("should render when open", () => {
        render(<ForgotPasswordModal {...defaultProps} />);

        expect(screen.getByText(/forgot password|reset password/i)).toBeInTheDocument();
    });

    it("should have email field", () => {
        render(<ForgotPasswordModal {...defaultProps} />);

        const emailInput = screen.getByLabelText(/email/i) || screen.getByPlaceholderText(/email/i);
        expect(emailInput).toBeInTheDocument();
    });

    it("should call onClose when cancel clicked", () => {
        const mockOnClose = vi.fn();
        render(<ForgotPasswordModal {...defaultProps} onClose={mockOnClose} />);

        const cancelButton = screen.getByRole("button", { name: /cancel|close/i });
        fireEvent.click(cancelButton);

        expect(mockOnClose).toHaveBeenCalled();
    });

    it("should have submit button", () => {
        render(<ForgotPasswordModal {...defaultProps} />);

        const submitButton = screen.getByRole("button", { name: /send|reset|submit/i });
        expect(submitButton).toBeInTheDocument();
    });

    it("should show instructions", () => {
        render(<ForgotPasswordModal {...defaultProps} />);

        // Should have instructions about password reset
        expect(screen.getByText(/link|email|reset/i)).toBeInTheDocument();
    });
});
