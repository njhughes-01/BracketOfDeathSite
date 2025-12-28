import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import NotFound from "../NotFound";

describe("NotFound", () => {
    const renderWithRouter = (component: React.ReactElement) => {
        return render(<BrowserRouter>{component}</BrowserRouter>);
    };

    it("should render 404 message", () => {
        renderWithRouter(<NotFound />);

        expect(screen.getByText(/404|not found/i)).toBeInTheDocument();
    });

    it("should have link to home page", () => {
        renderWithRouter(<NotFound />);

        const homeLink = screen.getByRole("link", { name: /home|back|return/i });
        expect(homeLink).toBeInTheDocument();
        expect(homeLink).toHaveAttribute("href", "/");
    });

    it("should display helpful message", () => {
        renderWithRouter(<NotFound />);

        expect(screen.getByText(/page|exist|looking/i)).toBeInTheDocument();
    });
});
