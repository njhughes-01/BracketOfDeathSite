import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import YearRangeInput from "../YearRangeInput";

describe("YearRangeInput", () => {
    const defaultProps = {
        startYear: 2020,
        endYear: 2025,
        onChange: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render start year input", () => {
        render(<YearRangeInput {...defaultProps} />);

        const input = screen.getByDisplayValue("2020");
        expect(input).toBeInTheDocument();
    });

    it("should render end year input", () => {
        render(<YearRangeInput {...defaultProps} />);

        const input = screen.getByDisplayValue("2025");
        expect(input).toBeInTheDocument();
    });

    it("should call onChange when start year changes", () => {
        const mockOnChange = vi.fn();
        render(<YearRangeInput {...defaultProps} onChange={mockOnChange} />);

        const startInput = screen.getByDisplayValue("2020");
        fireEvent.change(startInput, { target: { value: "2019" } });

        expect(mockOnChange).toHaveBeenCalled();
    });

    it("should call onChange when end year changes", () => {
        const mockOnChange = vi.fn();
        render(<YearRangeInput {...defaultProps} onChange={mockOnChange} />);

        const endInput = screen.getByDisplayValue("2025");
        fireEvent.change(endInput, { target: { value: "2026" } });

        expect(mockOnChange).toHaveBeenCalled();
    });

    it("should show label when provided", () => {
        render(<YearRangeInput {...defaultProps} label="Date Range" />);

        expect(screen.getByText("Date Range")).toBeInTheDocument();
    });
});
