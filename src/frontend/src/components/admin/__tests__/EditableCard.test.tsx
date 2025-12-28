import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import EditableCard from "../EditableCard";

describe("EditableCard", () => {
    const defaultProps = {
        title: "Test Card",
        children: <div>Card Content</div>,
    };

    it("should render title", () => {
        render(<EditableCard {...defaultProps} />);

        expect(screen.getByText("Test Card")).toBeInTheDocument();
    });

    it("should render children", () => {
        render(<EditableCard {...defaultProps} />);

        expect(screen.getByText("Card Content")).toBeInTheDocument();
    });

    it("should show edit button when editable", () => {
        render(<EditableCard {...defaultProps} editable onEdit={() => { }} />);

        const editButton = screen.getByRole("button", { name: /edit/i });
        expect(editButton).toBeInTheDocument();
    });

    it("should call onEdit when edit button clicked", () => {
        const mockOnEdit = vi.fn();
        render(<EditableCard {...defaultProps} editable onEdit={mockOnEdit} />);

        const editButton = screen.getByRole("button", { name: /edit/i });
        fireEvent.click(editButton);

        expect(mockOnEdit).toHaveBeenCalled();
    });

    it("should not show edit button when not editable", () => {
        render(<EditableCard {...defaultProps} />);

        const editButton = screen.queryByRole("button", { name: /edit/i });
        expect(editButton).not.toBeInTheDocument();
    });

    it("should apply custom className", () => {
        render(<EditableCard {...defaultProps} className="custom-class" />);

        const container = document.querySelector(".custom-class");
        expect(container).toBeInTheDocument();
    });
});
