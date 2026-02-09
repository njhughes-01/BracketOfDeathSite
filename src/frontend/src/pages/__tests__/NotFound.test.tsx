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

    // Use getAllByText since multiple elements match
    expect(screen.getAllByText(/404|not found/i).length).toBeGreaterThan(0);
  });

  it("should have link to home page", () => {
    renderWithRouter(<NotFound />);

    const homeLink = screen.getByRole("link", { name: /home|back|return/i });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute("href", "/dashboard");
  });

  it("should display helpful message", () => {
    renderWithRouter(<NotFound />);

    // Use getAllByText since multiple elements may match
    expect(screen.getAllByText(/page|exist|looking/i).length).toBeGreaterThan(
      0,
    );
  });
});
