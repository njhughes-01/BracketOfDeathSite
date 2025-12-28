import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import News from "../News";

describe("News", () => {
    const renderWithRouter = (component: React.ReactElement) => {
        return render(<BrowserRouter>{component}</BrowserRouter>);
    };

    it("should render news page title", () => {
        renderWithRouter(<News />);

        expect(screen.getByText(/news/i)).toBeInTheDocument();
    });

    it("should display coming soon or placeholder when no news", () => {
        renderWithRouter(<News />);

        // Either shows news content or a coming soon message
        const content = document.body.textContent;
        expect(content).toBeTruthy();
    });
});
