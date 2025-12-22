import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import UserManagement from "../UserManagement";
import { useAuth } from "../../contexts/AuthContext";
import { usePermissions } from "../../hooks/usePermissions";
import apiClient from "../../services/api";

// Mock dependencies
vi.mock("../../contexts/AuthContext");
vi.mock("../../hooks/usePermissions");
vi.mock("../../services/api");

// Mock child components
vi.mock("../../components/users/CreateUserForm", () => ({
  default: ({ onCancel }: any) => (
    <div data-testid="create-user-form">
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

vi.mock("../../components/users/UserList", () => ({
  default: ({ users, onSelectUser }: any) => (
    <div data-testid="user-list">
      {users.map((u: any) => (
        <div key={u.id} data-testid={`user-row-${u.id}`}>
          {u.username}
          <button onClick={() => onSelectUser(u)}>Manage</button>
        </div>
      ))}
    </div>
  ),
}));

vi.mock("../../components/users/UserDetailModal", () => ({
  default: ({ user, onClose, onDeleteUser }: any) => (
    <div data-testid="user-detail-modal">
      <h2>{user.username}</h2>
      <button onClick={onClose}>Close</button>
      <button onClick={() => onDeleteUser(user)}>Delete User</button>
    </div>
  ),
}));

vi.mock("../../components/ui/LoadingSpinner", () => ({
  default: () => <div data-testid="loading">Loading...</div>,
}));

describe("UserManagement Page", () => {
  const mockUsers = [
    { id: "1", username: "admin", roles: ["admin"] },
    { id: "2", username: "user1", roles: ["user"] },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: { id: "1" } });
    (usePermissions as any).mockReturnValue({ canManageUsers: true });
    (apiClient.getUsers as any).mockResolvedValue({
      success: true,
      data: mockUsers,
    });
    (apiClient.deleteUser as any).mockResolvedValue({ success: true });
  });

  it("renders user list", async () => {
    render(
      <MemoryRouter>
        <UserManagement />
      </MemoryRouter>,
    );

    expect(await screen.findByTestId("user-list")).toBeInTheDocument();
    expect(screen.getByText("admin")).toBeInTheDocument();
    expect(screen.getByText("user1")).toBeInTheDocument();
  });

  it("shows access denied if no permissions", () => {
    (usePermissions as any).mockReturnValue({ canManageUsers: false });

    render(
      <MemoryRouter>
        <UserManagement />
      </MemoryRouter>,
    );

    expect(screen.getByText("Access Denied")).toBeInTheDocument();
  });

  it("opens create user form", async () => {
    render(
      <MemoryRouter>
        <UserManagement />
      </MemoryRouter>,
    );

    await screen.findByTestId("user-list");

    const createBtn = screen.getByText("Create User");
    fireEvent.click(createBtn);

    expect(screen.getByTestId("create-user-form")).toBeInTheDocument();
  });

  it("opens detail modal and handles delete user", async () => {
    // Mock confirm
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <MemoryRouter>
        <UserManagement />
      </MemoryRouter>,
    );

    await screen.findByTestId("user-list");

    // Click "Manage" on user1
    const manageBtns = screen.getAllByText("Manage");
    fireEvent.click(manageBtns[1]); // 2nd user (user1)

    // Modal should appear
    const modal = screen.getByTestId("user-detail-modal");
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByText("user1")).toBeInTheDocument();

    // Click Delete inside modal
    const deleteBtn = screen.getByText("Delete User");
    fireEvent.click(deleteBtn);

    expect(confirmSpy).toHaveBeenCalled();
    await waitFor(() => {
      expect(apiClient.deleteUser).toHaveBeenCalledWith("2");
    });
  });
});
