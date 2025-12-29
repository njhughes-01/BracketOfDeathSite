import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Card from "../Card";

describe("Card", () => {
    it("should render children", () => {
        render(<Card>Card Content</Card>);
        expect(screen.getByText("Card Content")).toBeInTheDocument();
    });

    it("should apply default styling", () => {
        const { container } = render(<Card>Content</Card>);
        const card = container.firstChild;
        expect(card).toHaveClass("bg-white", "rounded-xl", "shadow-sm");
    });

    it("should apply custom className", () => {
        render(<Card className="custom-class">Content</Card>);
        const card = document.querySelector(".custom-class");
        expect(card).toBeInTheDocument();
    });

    it("should render with different padding", () => {
        const { rerender, container } = render(<Card padding="sm">Content</Card>);
        expect(container.firstChild).toHaveClass("p-4");

        rerender(<Card padding="lg">Content</Card>);
        expect(container.firstChild).toHaveClass("p-8");
    });

    it("should render different variants", () => {
        const { rerender, container } = render(<Card variant="hover">Content</Card>);
        expect(container.firstChild).toHaveClass("cursor-pointer");

        rerender(<Card variant="gradient">Content</Card>);
        expect(container.firstChild).toHaveClass("bg-gradient-to-br");
    });
});
