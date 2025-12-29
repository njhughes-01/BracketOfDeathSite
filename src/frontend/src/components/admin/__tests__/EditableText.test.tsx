import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import EditableText from "../EditableText";

// Use a manual mock to ensure it's picked up
vi.mock("../../../contexts/AuthContext", () => ({
    useAuth: () => ({ isAdmin: true }),
}));

describe("EditableText", () => {
    const defaultProps = {
        value: "Test Value",
        onSave: vi.fn().mockResolvedValue(undefined),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("debug render", () => {
        try {
            render(<EditableText {...defaultProps} />);
            console.log("Render successful");
        } catch (err: any) {
            console.error("Render failed:", err.message);
            console.error(err.stack);
            throw err;
        }
    });

    it("should render display value", () => {
        render(<EditableText {...defaultProps} />);
        expect(screen.getByText("Test Value")).toBeInTheDocument();
    });

    it("should show input when clicked (isAdmin)", () => {
        render(<EditableText {...defaultProps} />);

        const display = screen.getByText("Test Value");
        fireEvent.click(display);

        const input = screen.getByDisplayValue("Test Value");
        expect(input).toBeInTheDocument();
    });

    it("should call onSave when Enter pressed", async () => {
        const mockOnSave = vi.fn().mockResolvedValue(undefined);
        render(<EditableText {...defaultProps} onSave={mockOnSave} />);

        fireEvent.click(screen.getByText("Test Value"));
        const input = screen.getByDisplayValue("Test Value");

        fireEvent.change(input, { target: { value: "New Value" } });
        fireEvent.keyDown(input, { key: "Enter" });

        await waitFor(() => {
            expect(mockOnSave).toHaveBeenCalledWith("New Value");
        });
    });

    it("should show placeholder when value is empty", () => {
        render(<EditableText value="" onSave={vi.fn()} placeholder="Empty Site" />);
        expect(screen.getByText("Empty Site")).toBeInTheDocument();
    });
});
