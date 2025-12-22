import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import UserDetailModal from "./UserDetailModal";

describe("UserDetailModal", () => {
    const mockUser = {
        id: "1",
        username: "testuser",
        email: "test@example.com",
        roles: ["user", "admin"],
        enabled: true,
        emailVerified: true,
        fullName: "Test User",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    const mockHandlers = {
        onClose: vi.fn(),
        onDeleteUser: vi.fn(),
        onResetPassword: vi.fn(),
        onToggleStatus: vi.fn(),
        onToggleAdminRole: vi.fn(),
        onToggleSuperAdminRole: vi.fn(),
    };

    it("renders user details correctly", () => {
        render(<UserDetailModal user={mockUser} {...mockHandlers} />);

        expect(screen.getByText("Test User")).toBeInTheDocument();
        expect(screen.getByText("@testuser")).toBeInTheDocument();
        expect(screen.getByText("test@example.com")).toBeInTheDocument();
        expect(screen.getByText("user")).toBeInTheDocument();
        expect(screen.getByText("admin")).toBeInTheDocument();
    });

    it("calls onClose when close button is clicked", () => {
        render(<UserDetailModal user={mockUser} {...mockHandlers} />);

        // The close button is in the top right
        const closeBtn = screen.getByText("close");
        fireEvent.click(closeBtn);
        expect(mockHandlers.onClose).toHaveBeenCalled();
    });

    it("calls action handlers when buttons are clicked", () => {
        render(<UserDetailModal user={mockUser} {...mockHandlers} />);

        // Reset Password
        fireEvent.click(screen.getByText("Reset Password"));
        expect(mockHandlers.onResetPassword).toHaveBeenCalledWith(mockUser);

        // Disable (Toggle Status)
        fireEvent.click(screen.getByText("Disable Account"));
        expect(mockHandlers.onToggleStatus).toHaveBeenCalledWith(mockUser);

        // Remove Admin (Toggle Role)
        fireEvent.click(screen.getByText("Remove Admin Role"));
        expect(mockHandlers.onToggleAdminRole).toHaveBeenCalledWith(mockUser);
    });
});
