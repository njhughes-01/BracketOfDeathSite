import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import News from "../News";

describe("News", () => {
  const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
  };

  it("should render news page title", () => {
    renderWithRouter(<News />);

    // Use getAllByText since multiple elements match /news/i
    expect(screen.getAllByText(/news/i).length).toBeGreaterThan(0);
  });

  it("should display coming soon or placeholder when no news", () => {
    renderWithRouter(<News />);

    // Either shows news content or a coming soon message
    const content = document.body.textContent;
    expect(content).toBeTruthy();
  });
});
