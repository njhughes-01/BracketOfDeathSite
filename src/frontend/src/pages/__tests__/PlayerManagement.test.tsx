import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PlayerCreate from "../PlayerCreate";
import PlayerEdit from "../PlayerEdit";
import { useAuth } from "../../contexts/AuthContext";
import apiClient from "../../services/api";

// Mock dependencies
vi.mock("../../contexts/AuthContext");
vi.mock("../../services/api");

// Mock components
vi.mock("../../components/ui/LoadingSpinner", () => ({
  default: () => <div data-testid="loading">Loading...</div>,
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("Player Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      isAuthenticated: true,
      user: { roles: ["admin"] },
    });
  });

  describe("PlayerCreate", () => {
    it("renders create form", () => {
      render(
        <MemoryRouter>
          <PlayerCreate />
        </MemoryRouter>,
      );

      expect(screen.getByPlaceholderText(/John Doe/i)).toBeInTheDocument();
      expect(screen.getByText("Create Player")).toBeInTheDocument();
    });

    it("submits new player", async () => {
      (apiClient.createPlayer as any).mockResolvedValue({ success: true });

      render(
        <MemoryRouter>
          <PlayerCreate />
        </MemoryRouter>,
      );

      fireEvent.change(screen.getByPlaceholderText(/John Doe/i), {
        target: { value: "New Player" },
      });
      // Select gender if it's a select input, or radio. Assuming simple text or select for now based on typical implementation.
      // If it uses custom select, we might need to find by role.
      // Let's assume standard inputs for a first pass, checking looking for presence.

      const submitBtn = screen.getByText("Create Player");
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(apiClient.createPlayer).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith("/players");
      });
    });
  });

  describe("PlayerEdit", () => {
    const mockPlayer = {
      _id: "123",
      name: "Existing Player",
      gender: "male",
      active: true,
    };

    beforeEach(() => {
      (apiClient.getPlayer as any).mockResolvedValue({
        success: true,
        data: mockPlayer,
      });
      (apiClient.updatePlayer as any).mockResolvedValue({ success: true });
    });

    it("loads and displays player data", async () => {
      render(
        <MemoryRouter initialEntries={["/players/edit/123"]}>
          <Routes>
            <Route path="/players/edit/:id" element={<PlayerEdit />} />
          </Routes>
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue("Existing Player")).toBeInTheDocument();
      });
    });

    it("updates player data", async () => {
      render(
        <MemoryRouter initialEntries={["/players/edit/123"]}>
          <Routes>
            <Route path="/players/edit/:id" element={<PlayerEdit />} />
          </Routes>
        </MemoryRouter>,
      );

      await waitFor(() => screen.getByDisplayValue("Existing Player"));

      fireEvent.change(screen.getByDisplayValue("Existing Player"), {
        target: { value: "Updated Name" },
      });
      fireEvent.click(screen.getByText("Save Changes"));

      await waitFor(() => {
        expect(apiClient.updatePlayer).toHaveBeenCalledWith(
          "123",
          expect.objectContaining({ name: "Updated Name" }),
        );
        expect(mockNavigate).toHaveBeenCalledWith("/players/123");
      });
    });
  });
});
