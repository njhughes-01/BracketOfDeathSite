import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import EditableSelect from "../EditableSelect";

describe("EditableSelect", () => {
    const mockOptions = [
        { value: "option1", label: "Option 1" },
        { value: "option2", label: "Option 2" },
        { value: "option3", label: "Option 3" },
    ];

    const defaultProps = {
        value: "option1",
        options: mockOptions,
        onChange: vi.fn(),
    };

    it("should render current selection", () => {
        render(<EditableSelect {...defaultProps} />);

        expect(screen.getByText("Option 1")).toBeInTheDocument();
    });

    it("should show dropdown when editing", () => {
        render(<EditableSelect {...defaultProps} editing />);

        const select = screen.getByRole("combobox");
        expect(select).toBeInTheDocument();
    });

    it("should call onChange when selection changes", () => {
        const mockOnChange = vi.fn();
        render(<EditableSelect {...defaultProps} editing onChange={mockOnChange} />);

        const select = screen.getByRole("combobox");
        fireEvent.change(select, { target: { value: "option2" } });

        expect(mockOnChange).toHaveBeenCalledWith("option2");
    });

    it("should render all options", () => {
        render(<EditableSelect {...defaultProps} editing />);

        expect(screen.getByText("Option 1")).toBeInTheDocument();
        expect(screen.getByText("Option 2")).toBeInTheDocument();
        expect(screen.getByText("Option 3")).toBeInTheDocument();
    });
});
