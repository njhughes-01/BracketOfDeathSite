import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import EditableSelect from "../EditableSelect";
import { useAuth } from "../../../contexts/AuthContext";

// Mock useAuth
vi.mock("../../../contexts/AuthContext", () => ({
    useAuth: vi.fn(),
}));

describe("EditableSelect", () => {
    const options = [
        { value: "a", label: "Option A" },
        { value: "b", label: "Option B" },
    ];

    const defaultProps = {
        value: "a",
        options,
        onSave: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useAuth).mockReturnValue({ isAdmin: true } as any);
    });

    it("should render current selection label", () => {
        render(<EditableSelect {...defaultProps} />);
        expect(screen.getByText("Option A")).toBeInTheDocument();
    });

    it("should show select when clicked", () => {
        render(<EditableSelect {...defaultProps} />);

        const display = screen.getByText("Option A");
        fireEvent.click(display);

        const select = screen.getByRole("combobox");
        expect(select).toBeInTheDocument();
    });

    it("should call onSave when selection changes and save clicked", async () => {
        const mockOnSave = vi.fn().mockResolvedValue(undefined);
        render(<EditableSelect {...defaultProps} onSave={mockOnSave} />);

        fireEvent.click(screen.getByText("Option A"));
        const select = screen.getByRole("combobox");

        fireEvent.change(select, { target: { value: "b" } });

        // Find and click the save button
        const saveButton = screen.getByRole("button", { name: /save/i });
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(mockOnSave).toHaveBeenCalledWith("b");
        });
    });

    it("should call onSave on blur", async () => {
        const mockOnSave = vi.fn().mockResolvedValue(undefined);
        render(<EditableSelect {...defaultProps} onSave={mockOnSave} />);

        fireEvent.click(screen.getByText("Option A"));
        const select = screen.getByRole("combobox");

        fireEvent.change(select, { target: { value: "b" } });
        fireEvent.blur(select);

        await waitFor(() => {
            expect(mockOnSave).toHaveBeenCalledWith("b");
        });
    });
});
