import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { BrowserRouter, MemoryRouter, Route, Routes } from "react-router-dom";
import Login from "../Login";
import { AuthProvider, useAuth } from "../../contexts/AuthContext";

// Mock the AuthContext
const mockLogin = vi.fn();
const mockInitializeAuth = vi.fn();
const mockSetDirectAuthTokens = vi.fn();

vi.mock("../../contexts/AuthContext", async () => {
  const actual = await vi.importActual("../../contexts/AuthContext");
  return {
    ...actual,
    useAuth: () => ({
      isAuthenticated: false,
      loading: false,
      login: mockLogin,
      initializeAuth: mockInitializeAuth,
      setDirectAuthTokens: mockSetDirectAuthTokens,
      keycloak: {},
    }),
    AuthProvider: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
  };
});

// Mock fetch for direct login
global.fetch = vi.fn();

const renderLogin = () => {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<div>Home Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
};

describe("Login Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch mock default success
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "fake-access",
        refresh_token: "fake-refresh",
        id_token: "fake-id",
      }),
    });
  });

  it("renders login form correctly", () => {
    renderLogin();
    expect(screen.getByLabelText(/EMAIL OR USERNAME/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/PASSWORD/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Log In/i })).toBeInTheDocument();
  });

  it("updates input fields on change", () => {
    renderLogin();
    const emailInput = screen.getByLabelText(
      /EMAIL OR USERNAME/i,
    ) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(
      /PASSWORD/i,
    ) as HTMLInputElement;

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });

    expect(emailInput.value).toBe("test@example.com");
    expect(passwordInput.value).toBe("password123");
  });

  it("handles direct login form submission success", async () => {
    renderLogin();

    fireEvent.change(screen.getByLabelText(/EMAIL OR USERNAME/i), {
      target: { value: "admin" },
    });
    fireEvent.change(screen.getByLabelText(/PASSWORD/i), {
      target: { value: "password" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Log In/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          "/auth/realms/bracketofdeathsite/protocol/openid-connect/token",
        ),
        expect.objectContaining({
          method: "POST",
          body: expect.any(URLSearchParams),
        }),
      );
    });

    await waitFor(() => {
      expect(mockSetDirectAuthTokens).toHaveBeenCalledWith({
        access_token: "fake-access",
        refresh_token: "fake-refresh",
        id_token: "fake-id",
      });
    });
  });

  it("handles direct login validation failure", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      text: async () =>
        JSON.stringify({ error_description: "Invalid credentials" }),
    });

    renderLogin();

    fireEvent.change(screen.getByLabelText(/EMAIL OR USERNAME/i), {
      target: { value: "wrong" },
    });
    fireEvent.change(screen.getByLabelText(/PASSWORD/i), {
      target: { value: "wrong" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Log In/i }));

    await waitFor(() => {
      expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument();
    });
  });

  it("handles initialization failure gracefully", async () => {
    mockInitializeAuth.mockRejectedValueOnce(new Error("Init failed"));
    renderLogin();
    // Just verify it doesn't crash
    expect(screen.getByRole("button", { name: /Log In/i })).toBeInTheDocument();
  });

  it("toggles password visibility", () => {
    renderLogin();
    const passwordInput = screen.getByLabelText(
      /PASSWORD/i,
    ) as HTMLInputElement;

    // Initially password is hidden, icon is 'visibility' (eye)
    expect(passwordInput.type).toBe("password");

    const toggleBtn = screen.getByRole("button", { name: /visibility/i });
    fireEvent.click(toggleBtn);

    expect(passwordInput.type).toBe("text");
    expect(
      screen.getByRole("button", { name: /visibility_off/i }),
    ).toBeInTheDocument();

    // Toggle back
    fireEvent.click(screen.getByRole("button", { name: /visibility_off/i }));
    expect(passwordInput.type).toBe("password");
    expect(
      screen.getByRole("button", { name: /visibility/i }),
    ).toBeInTheDocument();
  });
});
