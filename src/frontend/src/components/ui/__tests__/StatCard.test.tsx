import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import StatCard from "../StatCard";

describe("StatCard", () => {
    it("should render title", () => {
        render(<StatCard title="Total Wins" value={42} />);

        expect(screen.getByText("Total Wins")).toBeInTheDocument();
    });

    it("should render value", () => {
        render(<StatCard title="Total Wins" value={42} />);

        expect(screen.getByText("42")).toBeInTheDocument();
    });

    it("should render icon when provided", () => {
        render(<StatCard title="Wins" value={10} icon="🏆" />);

        expect(screen.getByText("🏆")).toBeInTheDocument();
    });

    it("should render trend indicator", () => {
        render(<StatCard title="Wins" value={10} trend="+5%" />);

        expect(screen.getByText("+5%")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
        render(<StatCard title="Test" value={0} className="custom-stat" />);

        const card = document.querySelector(".custom-stat");
        expect(card).toBeInTheDocument();
    });

    it("should render subtitle when provided", () => {
        render(<StatCard title="Wins" value={10} subtitle="Last 30 days" />);

        expect(screen.getByText("Last 30 days")).toBeInTheDocument();
    });
});
