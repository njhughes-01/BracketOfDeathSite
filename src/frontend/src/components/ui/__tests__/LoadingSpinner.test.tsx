import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import LoadingSpinner from "../LoadingSpinner";

describe("LoadingSpinner", () => {
    it("should render spinner", () => {
        render(<LoadingSpinner />);

        const spinner = document.querySelector(".animate-spin");
        expect(spinner).toBeInTheDocument();
    });

    it("should apply size prop", () => {
        render(<LoadingSpinner size="lg" />);

        const spinner = document.querySelector(".animate-spin");
        expect(spinner).toBeInTheDocument();
    });

    it("should render with custom className", () => {
        render(<LoadingSpinner className="custom-spinner" />);

        const spinner = document.querySelector(".custom-spinner");
        expect(spinner).toBeInTheDocument();
    });

    it("should render different sizes", () => {
        const { rerender } = render(<LoadingSpinner size="sm" />);
        expect(document.querySelector(".animate-spin")).toBeInTheDocument();

        rerender(<LoadingSpinner size="md" />);
        expect(document.querySelector(".animate-spin")).toBeInTheDocument();

        rerender(<LoadingSpinner size="lg" />);
        expect(document.querySelector(".animate-spin")).toBeInTheDocument();
    });
});
