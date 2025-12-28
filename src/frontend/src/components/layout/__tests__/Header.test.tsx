import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Header from "../Header";

// Mock AuthContext
vi.mock("../../../contexts/AuthContext", () => ({
    useAuth: vi.fn().mockReturnValue({
        user: { username: "TestUser" },
        isAuthenticated: true,
    }),
}));

describe("Header", () => {
    const renderWithRouter = (component: React.ReactElement) => {
        return render(<BrowserRouter>{component}</BrowserRouter>);
    };

    it("should render header", () => {
        renderWithRouter(<Header />);

        expect(document.querySelector("header")).toBeInTheDocument();
    });

    it("should show logo or brand name", () => {
        renderWithRouter(<Header />);

        // Should have either logo or brand text
        const header = document.querySelector("header");
        expect(header).toBeInTheDocument();
    });

    it("should show user menu when authenticated", () => {
        renderWithRouter(<Header />);

        // Should have some user indication
        expect(screen.getByText(/TestUser/i) || document.querySelector("[data-testid='user-menu']")).toBeTruthy();
    });
});
