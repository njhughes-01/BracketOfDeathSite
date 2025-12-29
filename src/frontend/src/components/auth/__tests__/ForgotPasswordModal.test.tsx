import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ForgotPasswordModal from "../ForgotPasswordModal";
import apiClient from "../../../services/api";

// Mock API
vi.mock("../../../services/api", () => ({
    default: {
        requestPasswordReset: vi.fn(),
    },
}));

describe("ForgotPasswordModal", () => {
    const defaultProps = {
        onClose: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render forgot password title", () => {
        render(<ForgotPasswordModal {...defaultProps} />);
        expect(screen.getByText(/Reset Password/i)).toBeInTheDocument();
    });

    it("should have email field", () => {
        render(<ForgotPasswordModal {...defaultProps} />);
        const emailInput = screen.getByPlaceholderText(/user@example.com/i);
        expect(emailInput).toBeInTheDocument();
        expect(emailInput).toHaveAttribute("required");
    });

    it("should call onClose when close button clicked", () => {
        const mockOnClose = vi.fn();
        render(<ForgotPasswordModal onClose={mockOnClose} />);

        const closeButton = screen.getByText("close").closest("button");
        if (closeButton) {
            fireEvent.click(closeButton);
            expect(mockOnClose).toHaveBeenCalled();
        }
    });

    it("should call API and show success message on submit", async () => {
        vi.mocked(apiClient.requestPasswordReset).mockResolvedValue({ success: true } as any);
        render(<ForgotPasswordModal {...defaultProps} />);

        const emailInput = screen.getByPlaceholderText(/user@example.com/i);
        fireEvent.change(emailInput, { target: { value: "test@example.com" } });

        const submitButton = screen.getByRole("button", { name: /Send Reset Link/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(apiClient.requestPasswordReset).toHaveBeenCalledWith("test@example.com");
            expect(screen.getByText(/Check your email/i)).toBeInTheDocument();
        });
    });

    it("should show error message on API failure", async () => {
        vi.mocked(apiClient.requestPasswordReset).mockRejectedValue(new Error("Network Error"));
        render(<ForgotPasswordModal {...defaultProps} />);

        const emailInput = screen.getByPlaceholderText(/user@example.com/i);
        fireEvent.change(emailInput, { target: { value: "test@example.com" } });

        const submitButton = screen.getByRole("button", { name: /Send Reset Link/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/Failed to process request/i)).toBeInTheDocument();
        });
    });
});
