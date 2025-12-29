import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import UserList from "../UserList";

describe("UserList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
  };

  const mockUsers = [
    {
      id: "u1",
      username: "user1",
      email: "user1@test.com",
      roles: ["user"],
      enabled: true,
      emailVerified: true,
      fullName: "User One"
    },
    {
      id: "u2",
      username: "admin1",
      email: "admin@test.com",
      roles: ["admin", "superadmin"],
      enabled: false,
      emailVerified: false,
      fullName: "Admin One"
    },
  ];

  it("should render empty state when no users", () => {
    renderWithRouter(
      <UserList users={[]} onSelectUser={() => { }} loading={false} />,
    );

    // Uses getAllByText because it might appear in both mobile and desktop empty states
    expect(screen.getAllByText(/no users found/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/user database is empty/i).length).toBeGreaterThan(0);
  });

  it("should render user list", () => {
    renderWithRouter(
      <UserList users={mockUsers} onSelectUser={() => { }} loading={false} />,
    );

    // Check for User One
    expect(screen.getAllByText(/User One/i).length).toBeGreaterThan(0);
    // Check for Admin One
    expect(screen.getAllByText(/Admin One/i).length).toBeGreaterThan(0);
  });

  it("should show loading state", () => {
    renderWithRouter(
      <UserList users={[]} onSelectUser={() => { }} loading={true} />,
    );

    expect(screen.getByText(/Loading users.../i)).toBeInTheDocument();
  });

  it("should display user roles", () => {
    renderWithRouter(
      <UserList users={[mockUsers[1]]} onSelectUser={() => { }} loading={false} />,
    );

    // roles appear in badges in both views
    expect(screen.getAllByText(/admin/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/superadmin/i).length).toBeGreaterThan(0);
  });

  it("should call onSelectUser when user clicked", () => {
    const mockOnSelect = vi.fn();
    renderWithRouter(
      <UserList
        users={[mockUsers[0]]}
        onSelectUser={mockOnSelect}
        loading={false}
      />,
    );

    // Click the first matching element (mobile or desktop)
    const userElements = screen.getAllByText(/User One/i);
    // Find the interactive parent (the <tr> or the mobile card <div>)
    const interactiveElement = userElements[0].closest("tr, div[onClick]");

    if (interactiveElement) {
      fireEvent.click(interactiveElement);
      expect(mockOnSelect).toHaveBeenCalledWith(mockUsers[0]);
    } else {
      // Fallback: click the element itself
      fireEvent.click(userElements[0]);
      expect(mockOnSelect).toHaveBeenCalled();
    }
  });

  it("should filter users by search term", () => {
    renderWithRouter(
      <UserList users={mockUsers} onSelectUser={() => { }} loading={false} />,
    );

    const searchInput = screen.getByPlaceholderText(/Search by name/i);
    fireEvent.change(searchInput, { target: { value: "Admin" } });

    expect(screen.getAllByText(/Admin One/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/User One/i)).not.toBeInTheDocument();
  });

  it("should filter users by role", () => {
    renderWithRouter(
      <UserList users={mockUsers} onSelectUser={() => { }} loading={false} />,
    );

    const roleSelect = screen.getByRole("combobox");
    fireEvent.change(roleSelect, { target: { value: "superadmin" } });

    expect(screen.getAllByText(/Admin One/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/User One/i)).not.toBeInTheDocument();
  });
});
