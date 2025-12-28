import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import EditableNumber from "../EditableNumber";

describe("EditableNumber", () => {
    const defaultProps = {
        value: 42,
        onChange: vi.fn(),
    };

    it("should render display value", () => {
        render(<EditableNumber {...defaultProps} />);

        expect(screen.getByText("42")).toBeInTheDocument();
    });

    it("should show input when editing", () => {
        render(<EditableNumber {...defaultProps} editing />);

        const input = screen.getByDisplayValue("42");
        expect(input).toBeInTheDocument();
        expect(input).toHaveAttribute("type", "number");
    });

    it("should call onChange with number", () => {
        const mockOnChange = vi.fn();
        render(<EditableNumber {...defaultProps} editing onChange={mockOnChange} />);

        const input = screen.getByDisplayValue("42");
        fireEvent.change(input, { target: { value: "100" } });

        expect(mockOnChange).toHaveBeenCalledWith(100);
    });

    it("should respect min/max constraints", () => {
        render(<EditableNumber {...defaultProps} editing min={0} max={100} />);

        const input = screen.getByDisplayValue("42");
        expect(input).toHaveAttribute("min", "0");
        expect(input).toHaveAttribute("max", "100");
    });
});
