import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Layout from "../Layout";

// Mock AuthContext
vi.mock("../../../contexts/AuthContext", () => ({
    useAuth: vi.fn().mockReturnValue({
        user: { username: "TestUser", roles: ["user"] },
        isAuthenticated: true,
        isAdmin: false,
    }),
}));

// Mock Navigation
vi.mock("../Navigation", () => ({
    default: () => <nav data-testid="navigation">Navigation</nav>,
}));

describe("Layout", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderWithRouter = (component: React.ReactElement) => {
        return render(<BrowserRouter>{component}</BrowserRouter>);
    };

    it("should render children content", () => {
        renderWithRouter(
            <Layout>
                <div data-testid="child-content">Child Content</div>
            </Layout>
        );

        expect(screen.getByTestId("child-content")).toBeInTheDocument();
        expect(screen.getByText("Child Content")).toBeInTheDocument();
    });

    it("should render navigation", () => {
        renderWithRouter(
            <Layout>
                <div>Content</div>
            </Layout>
        );

        expect(screen.getByTestId("navigation")).toBeInTheDocument();
    });

    it("should have main content area", () => {
        renderWithRouter(
            <Layout>
                <div>Main Content</div>
            </Layout>
        );

        expect(screen.getByRole("main") || document.querySelector("main")).toBeTruthy();
    });

    it("should render properly with complex children", () => {
        renderWithRouter(
            <Layout>
                <header>Header</header>
                <section>Section 1</section>
                <section>Section 2</section>
                <footer>Footer</footer>
            </Layout>
        );

        expect(screen.getByText("Header")).toBeInTheDocument();
        expect(screen.getByText("Section 1")).toBeInTheDocument();
        expect(screen.getByText("Section 2")).toBeInTheDocument();
        expect(screen.getByText("Footer")).toBeInTheDocument();
    });
});
