import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ChangePasswordModal from "../ChangePasswordModal";
import apiClient from "../../../services/api";

// Mock API
vi.mock("../../../services/api", () => ({
    default: {
        changePassword: vi.fn(),
    },
}));

describe("ChangePasswordModal", () => {
    const defaultProps = {
        onClose: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render change password title", () => {
        render(<ChangePasswordModal {...defaultProps} />);
        expect(screen.getByText(/Change Password/i)).toBeInTheDocument();
    });

    it("should have all required fields", () => {
        render(<ChangePasswordModal {...defaultProps} />);

        expect(screen.getByLabelText(/^CURRENT PASSWORD$/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^NEW PASSWORD$/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^CONFIRM NEW PASSWORD$/i)).toBeInTheDocument();
    });

    it("should show error if passwords do not match", async () => {
        render(<ChangePasswordModal {...defaultProps} />);

        fireEvent.change(screen.getByLabelText(/^CURRENT PASSWORD$/i), { target: { value: "old-pass" } });
        fireEvent.change(screen.getByLabelText(/^NEW PASSWORD$/i), { target: { value: "new-pass-123" } });
        fireEvent.change(screen.getByLabelText(/^CONFIRM NEW PASSWORD$/i), { target: { value: "mismatch" } });

        fireEvent.click(screen.getByRole("button", { name: /Update Password/i }));

        expect(screen.getByText(/New passwords do not match/i)).toBeInTheDocument();
    });

    it("should call API and show success message on valid submit", async () => {
        vi.mocked(apiClient.changePassword).mockResolvedValue({ success: true } as any);
        render(<ChangePasswordModal {...defaultProps} />);

        fireEvent.change(screen.getByLabelText(/^CURRENT PASSWORD$/i), { target: { value: "old-pass" } });
        fireEvent.change(screen.getByLabelText(/^NEW PASSWORD$/i), { target: { value: "new-pass-123" } });
        fireEvent.change(screen.getByLabelText(/^CONFIRM NEW PASSWORD$/i), { target: { value: "new-pass-123" } });

        fireEvent.click(screen.getByRole("button", { name: /Update Password/i }));

        await waitFor(() => {
            expect(apiClient.changePassword).toHaveBeenCalledWith({
                currentPassword: "old-pass",
                newPassword: "new-pass-123",
            });
            expect(screen.getByText(/Password Updated/i)).toBeInTheDocument();
        });
    });

    it("should show error message on API failure", async () => {
        vi.mocked(apiClient.changePassword).mockRejectedValue({
            response: { data: { error: "Incorrect current password" } }
        });
        render(<ChangePasswordModal {...defaultProps} />);

        fireEvent.change(screen.getByLabelText(/^CURRENT PASSWORD$/i), { target: { value: "wrong-pass" } });
        fireEvent.change(screen.getByLabelText(/^NEW PASSWORD$/i), { target: { value: "new-pass-123" } });
        fireEvent.change(screen.getByLabelText(/^CONFIRM NEW PASSWORD$/i), { target: { value: "new-pass-123" } });

        fireEvent.click(screen.getByRole("button", { name: /Update Password/i }));

        await waitFor(() => {
            expect(screen.getByText(/Incorrect current password/i)).toBeInTheDocument();
        });
    });
});
