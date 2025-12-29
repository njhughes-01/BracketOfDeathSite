import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import StatCard from "../StatCard";

describe("StatCard", () => {
    const defaultProps = {
        title: "Total Wins",
        value: 42,
        icon: "🏆",
        iconColor: "bg-blue-500",
    };

    const renderWithRouter = (ui: React.ReactElement) => {
        return render(<MemoryRouter>{ui}</MemoryRouter>);
    };

    it("should render title", () => {
        renderWithRouter(<StatCard {...defaultProps} />);
        expect(screen.getByText("Total Wins")).toBeInTheDocument();
    });

    it("should render value", () => {
        renderWithRouter(<StatCard {...defaultProps} />);
        expect(screen.getByText("42")).toBeInTheDocument();
    });

    it("should render icon", () => {
        renderWithRouter(<StatCard {...defaultProps} />);
        expect(screen.getByText("🏆")).toBeInTheDocument();
    });

    it("should render trend indicator", () => {
        renderWithRouter(
            <StatCard
                {...defaultProps}
                trend={{ value: 5, isPositive: true }}
            />
        );
        // Match with regex to allow for spaces/arrows
        expect(screen.getByText(/5%/)).toBeInTheDocument();
        expect(screen.getByText(/↗/)).toBeInTheDocument();
    });

    it("should render negative trend", () => {
        renderWithRouter(
            <StatCard
                {...defaultProps}
                trend={{ value: 3, isPositive: false }}
            />
        );
        expect(screen.getByText(/3%/)).toBeInTheDocument();
        expect(screen.getByText(/↘/)).toBeInTheDocument();
    });

    it("should show loading state", () => {
        renderWithRouter(<StatCard {...defaultProps} loading={true} />);
        // Use getAllByText because both spinner and text might contain "Loading..."
        expect(screen.getAllByText(/Loading.../i).length).toBeGreaterThan(0);
    });

    it("should render link when provided", () => {
        renderWithRouter(
            <StatCard
                {...defaultProps}
                linkTo="/stats"
                linkText="View Details"
            />
        );
        // The accessible name for the link combines the text and the arrow
        const link = screen.getByRole("link");
        expect(link).toHaveTextContent(/View Details/i);
        expect(link).toHaveAttribute("href", "/stats");
    });
});
