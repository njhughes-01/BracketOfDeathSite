import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import EditableNumber from "../EditableNumber";

// Mock useAuth
vi.mock("../../../contexts/AuthContext", () => ({
    useAuth: vi.fn().mockReturnValue({ isAdmin: true }),
}));

describe("EditableNumber", () => {
    const defaultProps = {
        value: 10,
        onSave: vi.fn().mockResolvedValue(undefined),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render display value", () => {
        render(<EditableNumber {...defaultProps} />);
        expect(screen.getByText("10")).toBeInTheDocument();
    });

    it("should show input when clicked", () => {
        render(<EditableNumber {...defaultProps} />);

        const display = screen.getByText("10");
        fireEvent.click(display);

        const input = screen.getByDisplayValue("10");
        expect(input).toBeInTheDocument();
    });

    it("should call onSave with number value", async () => {
        const mockOnSave = vi.fn().mockResolvedValue(undefined);
        render(<EditableNumber {...defaultProps} onSave={mockOnSave} />);

        fireEvent.click(screen.getByText("10"));
        const input = screen.getByDisplayValue("10");

        fireEvent.change(input, { target: { value: "25" } });
        fireEvent.keyDown(input, { key: "Enter" });

        await waitFor(() => {
            expect(mockOnSave).toHaveBeenCalledWith(25);
        });
    });

    it("should respect min/max constraints", async () => {
        const mockOnSave = vi.fn();
        render(<EditableNumber {...defaultProps} min={0} max={20} onSave={mockOnSave} />);

        fireEvent.click(screen.getByText("10"));
        const input = screen.getByDisplayValue("10");

        fireEvent.change(input, { target: { value: "30" } });
        fireEvent.keyDown(input, { key: "Enter" });

        // Component shows error but doesn't call onSave
        expect(screen.getByText(/Value must be at most 20/i)).toBeInTheDocument();
        expect(mockOnSave).not.toHaveBeenCalled();
    });
});
