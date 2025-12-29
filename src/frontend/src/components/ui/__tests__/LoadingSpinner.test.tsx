import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import LoadingSpinner from "../LoadingSpinner";

describe("LoadingSpinner", () => {
    it("should render spinner with correct role and label", () => {
        render(<LoadingSpinner />);

        const spinner = screen.getByRole("status");
        expect(spinner).toBeInTheDocument();
        expect(spinner).toHaveAttribute("aria-label", "Loading");
        expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("should apply size classes", () => {
        const { rerender, container } = render(<LoadingSpinner size="sm" />);
        expect(container.firstChild).toHaveClass("h-4", "w-4");

        rerender(<LoadingSpinner size="lg" />);
        expect(container.firstChild).toHaveClass("h-8", "w-8");
    });

    it("should apply color classes", () => {
        const { rerender, container } = render(<LoadingSpinner color="white" />);
        expect(container.firstChild).toHaveClass("border-white");

        rerender(<LoadingSpinner color="gray" />);
        expect(container.firstChild).toHaveClass("border-gray-400");
    });
});
