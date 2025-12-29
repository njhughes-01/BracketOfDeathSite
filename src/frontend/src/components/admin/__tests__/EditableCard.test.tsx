import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import EditableCard from "../EditableCard";
import { useAuth } from "../../../contexts/AuthContext";

// Mock useAuth
vi.mock("../../../contexts/AuthContext", () => ({
    useAuth: vi.fn(),
}));

describe("EditableCard", () => {
    const defaultProps = {
        title: "Test Card",
        onSave: vi.fn().mockResolvedValue(undefined),
        children: <div data-testid="child">Child Content</div>,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useAuth).mockReturnValue({ isAdmin: true } as any);
    });

    it("should render title and children", () => {
        render(<EditableCard {...defaultProps} />);
        expect(screen.getByText("Test Card")).toBeInTheDocument();
        expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    it("should show edit button when isAdmin", () => {
        render(<EditableCard {...defaultProps} />);
        expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
    });

    it("should enter editing mode when edit button clicked", () => {
        render(<EditableCard {...defaultProps} />);
        fireEvent.click(screen.getByRole("button", { name: /edit/i }));

        // Should show Save and Cancel buttons
        expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });

    it("should not show edit button if not admin", () => {
        vi.mocked(useAuth).mockReturnValue({ isAdmin: false } as any);
        render(<EditableCard {...defaultProps} />);
        expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument();
    });
});
