import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Card from "../Card";

describe("Card", () => {
    it("should render children", () => {
        render(<Card>Card Content</Card>);

        expect(screen.getByText("Card Content")).toBeInTheDocument();
    });

    it("should apply default styling", () => {
        render(<Card>Content</Card>);

        const card = screen.getByText("Content").closest("div");
        expect(card).toHaveClass("bg-white", "rounded-lg", "shadow");
    });

    it("should apply custom className", () => {
        render(<Card className="custom-class">Content</Card>);

        const card = document.querySelector(".custom-class");
        expect(card).toBeInTheDocument();
    });

    it("should render with padding", () => {
        render(<Card padding>Content</Card>);

        const card = screen.getByText("Content").closest("div");
        expect(card).toHaveClass("p-");
    });

    it("should render heading when provided", () => {
        render(<Card heading="Card Title">Content</Card>);

        expect(screen.getByText("Card Title")).toBeInTheDocument();
    });
});
