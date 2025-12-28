import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ClaimUserModal from "../ClaimUserModal";

// Mock API
vi.mock("../../services/api", () => ({
    default: {
        claimUser: vi.fn().mockResolvedValue({ success: true }),
    },
}));

describe("ClaimUserModal", () => {
    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        user: { id: "user-1", username: "testuser", email: "test@example.com" },
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderWithRouter = (component: React.ReactElement) => {
        return render(<BrowserRouter>{component}</BrowserRouter>);
    };

    it("should not render when closed", () => {
        renderWithRouter(<ClaimUserModal {...defaultProps} isOpen={false} />);

        expect(screen.queryByText(/claim|invite/i)).not.toBeInTheDocument();
    });

    it("should render when open", () => {
        renderWithRouter(<ClaimUserModal {...defaultProps} />);

        expect(screen.getByText(/claim|invite/i)).toBeInTheDocument();
    });

    it("should display user information", () => {
        renderWithRouter(<ClaimUserModal {...defaultProps} />);

        expect(screen.getByText(/testuser|test@example.com/i)).toBeInTheDocument();
    });

    it("should have send invite button", () => {
        renderWithRouter(<ClaimUserModal {...defaultProps} />);

        const sendButton = screen.getByRole("button", { name: /send|invite|claim/i });
        expect(sendButton).toBeInTheDocument();
    });

    it("should call onClose when cancel clicked", () => {
        const mockOnClose = vi.fn();
        renderWithRouter(<ClaimUserModal {...defaultProps} onClose={mockOnClose} />);

        const cancelButton = screen.getByRole("button", { name: /cancel|close/i });
        fireEvent.click(cancelButton);

        expect(mockOnClose).toHaveBeenCalled();
    });
});
