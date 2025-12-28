import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import EditableDate from "../EditableDate";

describe("EditableDate", () => {
    const defaultProps = {
        value: "2025-07-15",
        onChange: vi.fn(),
    };

    it("should render formatted display value", () => {
        render(<EditableDate {...defaultProps} />);

        // Should show formatted date
        expect(document.body.textContent).toContain("2025");
    });

    it("should show date input when editing", () => {
        render(<EditableDate {...defaultProps} editing />);

        const input = screen.getByDisplayValue("2025-07-15");
        expect(input).toBeInTheDocument();
        expect(input).toHaveAttribute("type", "date");
    });

    it("should call onChange when date changes", () => {
        const mockOnChange = vi.fn();
        render(<EditableDate {...defaultProps} editing onChange={mockOnChange} />);

        const input = screen.getByDisplayValue("2025-07-15");
        fireEvent.change(input, { target: { value: "2025-08-20" } });

        expect(mockOnChange).toHaveBeenCalledWith("2025-08-20");
    });

    it("should handle empty value", () => {
        render(<EditableDate value="" onChange={vi.fn()} />);

        // Should render without crashing
        expect(document.body).toBeInTheDocument();
    });
});
