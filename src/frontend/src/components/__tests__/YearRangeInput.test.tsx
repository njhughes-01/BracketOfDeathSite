import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import YearRangeInput from "../YearRangeInput";

describe("YearRangeInput", () => {
    const mockOnChange = vi.fn();
    const defaultProps = {
        value: "2020-2025",
        onChange: mockOnChange,
        availableRange: { min: 2000, max: 2030 },
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render input with correct value", () => {
        render(<YearRangeInput {...defaultProps} />);

        const input = screen.getByRole("textbox");
        expect(input).toHaveValue("2020-2025");
        expect(input).toHaveAttribute("placeholder", "e.g. 2025, 2000-2030");
    });

    it("should update local value on change", () => {
        render(<YearRangeInput {...defaultProps} />);

        const input = screen.getByRole("textbox");
        fireEvent.change(input, { target: { value: "2021" } });

        expect(input).toHaveValue("2021");
    });

    it("should call onChange after debounce", async () => {
        render(<YearRangeInput {...defaultProps} />);

        const input = screen.getByRole("textbox");
        fireEvent.change(input, { target: { value: "2021" } });

        // Wait for debounce
        await waitFor(() => {
            expect(mockOnChange).toHaveBeenCalledWith("2021");
        }, { timeout: 1000 });
    });

    it("should validate input correctly", () => {
        render(<YearRangeInput {...defaultProps} />);

        const input = screen.getByRole("textbox");

        // Invalid input
        fireEvent.change(input, { target: { value: "abc" } });
        expect(input).toHaveClass("border-red-500");

        // Valid input
        fireEvent.change(input, { target: { value: "2020, 2021" } });
        expect(input).not.toHaveClass("border-red-500");
    });

    it("should sync with parent value updates", () => {
        const { rerender } = render(<YearRangeInput {...defaultProps} />);

        const input = screen.getByRole("textbox");
        expect(input).toHaveValue("2020-2025");

        rerender(<YearRangeInput {...defaultProps} value="2010" />);
        expect(input).toHaveValue("2010");
    });
});
