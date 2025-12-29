import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import EditableDate from "../EditableDate";

// Mock AuthContext
vi.mock("../../../contexts/AuthContext", () => ({
    useAuth: vi.fn(),
}));

import { useAuth } from "../../../contexts/AuthContext";

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

describe("EditableDate", () => {
    const defaultProps = {
        value: "2025-07-15T12:00:00",
        onSave: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseAuth.mockReturnValue({ isAdmin: true });
    });

    it("should render formatted display value", () => {
        render(<EditableDate {...defaultProps} />);
        // Use a more flexible matcher for date formatting differences
        expect(screen.getByText(/2025/)).toBeInTheDocument();
        expect(screen.getByText(/15/)).toBeInTheDocument();
    });

    it("should enter edit mode when clicked by admin", () => {
        render(<EditableDate {...defaultProps} />);

        const displayValue = screen.getByText(/2025/);
        fireEvent.click(displayValue);

        const input = screen.getByDisplayValue("2025-07-15");
        expect(input).toBeInTheDocument();
        expect(input).toHaveAttribute("type", "date");
    });

    it("should not enter edit mode when clicked by non-admin", () => {
        mockUseAuth.mockReturnValue({ isAdmin: false });
        render(<EditableDate {...defaultProps} />);

        const displayValue = screen.getByText(/2025/);
        fireEvent.click(displayValue);

        expect(screen.queryByDisplayValue("2025-07-15")).not.toBeInTheDocument();
    });

    it("should call onSave when date changes and enter key is pressed", async () => {
        const mockOnSave = vi.fn().mockResolvedValue(undefined);
        render(<EditableDate {...defaultProps} onSave={mockOnSave} />);

        fireEvent.click(screen.getByText(/2025/));
        const input = screen.getByDisplayValue("2025-07-15");

        fireEvent.change(input, { target: { value: "2025-08-20" } });
        fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

        await waitFor(() => {
            expect(mockOnSave).toHaveBeenCalled();
            expect(mockOnSave.mock.calls[0][0]).toContain("2025-08-20");
        });
    });

    it("should show error when validation fails", async () => {
        render(<EditableDate {...defaultProps} />);

        fireEvent.click(screen.getByText(/2025/));
        const input = screen.getByDisplayValue("2025-07-15");

        // Date before 2009 is invalid
        fireEvent.change(input, { target: { value: "1999-01-01" } });
        fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

        expect(screen.getByText(/Date must be between 2009/i)).toBeInTheDocument();
    });

    it("should cancel editing on escape", () => {
        render(<EditableDate {...defaultProps} />);

        fireEvent.click(screen.getByText(/2025/));
        const input = screen.getByDisplayValue("2025-07-15");

        fireEvent.change(input, { target: { value: "2025-08-20" } });
        fireEvent.keyDown(input, { key: "Escape", code: "Escape" });

        expect(screen.queryByDisplayValue("2025-08-20")).not.toBeInTheDocument();
        expect(screen.getByText(/2025/)).toBeInTheDocument();
    });
});
