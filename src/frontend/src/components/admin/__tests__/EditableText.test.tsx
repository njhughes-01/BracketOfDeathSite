import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import EditableText from "../EditableText";

describe("EditableText", () => {
    const defaultProps = {
        value: "Test Value",
        onChange: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render display value", () => {
        render(<EditableText {...defaultProps} />);

        expect(screen.getByText("Test Value")).toBeInTheDocument();
    });

    it("should show input when in edit mode", () => {
        render(<EditableText {...defaultProps} editing />);

        const input = screen.getByDisplayValue("Test Value");
        expect(input).toBeInTheDocument();
    });

    it("should call onChange when value changes", () => {
        const mockOnChange = vi.fn();
        render(<EditableText {...defaultProps} editing onChange={mockOnChange} />);

        const input = screen.getByDisplayValue("Test Value");
        fireEvent.change(input, { target: { value: "New Value" } });

        expect(mockOnChange).toHaveBeenCalledWith("New Value");
    });

    it("should show placeholder when value is empty", () => {
        render(<EditableText value="" placeholder="Enter text" onChange={vi.fn()} />);

        expect(screen.getByText("Enter text")).toBeInTheDocument();
    });

    it("should validate required field", () => {
        render(<EditableText {...defaultProps} editing required />);

        const input = screen.getByDisplayValue("Test Value");
        expect(input).toHaveAttribute("required");
    });
});
