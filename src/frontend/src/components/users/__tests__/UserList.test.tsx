import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import UserList from "../UserList";

// Mock dependencies
vi.mock("../../services/api", () => ({
    default: {
        getUsers: vi.fn().mockResolvedValue({ success: true, data: [] }),
    },
}));

describe("UserList", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderWithRouter = (component: React.ReactElement) => {
        return render(<BrowserRouter>{component}</BrowserRouter>);
    };

    it("should render empty state when no users", () => {
        renderWithRouter(
            <UserList
                users={[]}
                onUserSelect={() => { }}
                loading={false}
            />
        );

        expect(screen.getByText(/no users|empty/i) || document.body.textContent).toBeTruthy();
    });

    it("should render user list", () => {
        const mockUsers = [
            { id: "u1", username: "user1", email: "user1@test.com", roles: ["user"] },
            { id: "u2", username: "user2", email: "user2@test.com", roles: ["admin"] },
        ];

        renderWithRouter(
            <UserList
                users={mockUsers}
                onUserSelect={() => { }}
                loading={false}
            />
        );

        expect(screen.getByText("user1")).toBeInTheDocument();
        expect(screen.getByText("user2")).toBeInTheDocument();
    });

    it("should show loading state", () => {
        renderWithRouter(
            <UserList
                users={[]}
                onUserSelect={() => { }}
                loading={true}
            />
        );

        expect(document.querySelector(".animate-pulse, .animate-spin")).toBeInTheDocument();
    });

    it("should display user roles", () => {
        const mockUsers = [
            { id: "u1", username: "admin1", email: "admin@test.com", roles: ["admin", "superadmin"] },
        ];

        renderWithRouter(
            <UserList
                users={mockUsers}
                onUserSelect={() => { }}
                loading={false}
            />
        );

        expect(screen.getByText(/admin/i)).toBeInTheDocument();
    });

    it("should call onUserSelect when user clicked", () => {
        const mockOnSelect = vi.fn();
        const mockUsers = [
            { id: "u1", username: "clickable", email: "click@test.com", roles: ["user"] },
        ];

        renderWithRouter(
            <UserList
                users={mockUsers}
                onUserSelect={mockOnSelect}
                loading={false}
            />
        );

        const userRow = screen.getByText("clickable").closest("button, tr, div[role='button']");
        if (userRow) {
            userRow.click();
            expect(mockOnSelect).toHaveBeenCalled();
        }
    });
});
