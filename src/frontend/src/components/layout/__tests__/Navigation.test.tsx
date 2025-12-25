import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Navigation from "../Navigation";
import { useAuth } from "../../../contexts/AuthContext";
import { usePermissions } from "../../../hooks/usePermissions";

// Mock the hooks
vi.mock("../../../contexts/AuthContext");
vi.mock("../../../hooks/usePermissions");

describe("Navigation Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks: Not admin, no permissions
    (useAuth as any).mockReturnValue({
      isAdmin: false,
    });
    (usePermissions as any).mockReturnValue({
      canViewAdmin: false,
      canManageUsers: false,
    });
  });

  const renderNav = () => {
    render(
      <MemoryRouter>
        <Navigation />
      </MemoryRouter>,
    );
  };

  it("renders common links for all users", () => {
    renderNav();
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Players")).toBeInTheDocument();
    expect(screen.getByText("Tournaments")).toBeInTheDocument();
    expect(screen.getByText("Results")).toBeInTheDocument();

    // Should NOT have Admin or User Management
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
    expect(screen.queryByText("User Management")).not.toBeInTheDocument();
  });

  it("renders Admin link when canViewAdmin is true", () => {
    (usePermissions as any).mockReturnValue({
      canViewAdmin: true,
      canManageUsers: false,
    });

    renderNav();
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.queryByText("User Management")).not.toBeInTheDocument();
  });

  it("renders User Management link when canManageUsers is true", () => {
    (usePermissions as any).mockReturnValue({
      canViewAdmin: false,
      canManageUsers: true,
    });

    renderNav();
    expect(screen.getByText("User Management")).toBeInTheDocument();
  });

  it("renders both when both permissions are present", () => {
    (usePermissions as any).mockReturnValue({
      canViewAdmin: true,
      canManageUsers: true,
    });

    renderNav();
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("User Management")).toBeInTheDocument();
  });
});
