import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Onboarding from "../Onboarding";
import { apiClient } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { BrowserRouter } from "react-router-dom";

// Mocks
vi.mock("../../services/api");
vi.mock("../../contexts/AuthContext");

// Helper to render with Router
const renderWithRouter = (component: React.ReactNode) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe("Onboarding Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      user: { username: "testuser", firstName: "Test" },
      refreshUser: vi.fn(),
      forceTokenRefresh: vi.fn(),
    });
    // Default to initialized system so we see the profile form
    (apiClient.getSystemStatus as any).mockResolvedValue({
      data: { initialized: true },
    });
  });

  it("should render the onboarding form", async () => {
    renderWithRouter(<Onboarding />);

    // Wait for loading to finish
    expect(await screen.findByText(/Complete Profile/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Gender/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Complete Setup/i }),
    ).toBeInTheDocument();
  });

  it("should have required fields", async () => {
    renderWithRouter(<Onboarding />);
    const genderSelect = await screen.findByLabelText(/Gender/i);
    expect(genderSelect).toBeRequired();
  });

  it("should call updateProfile and navigate on success", async () => {
    const user = userEvent.setup();
    renderWithRouter(<Onboarding />);

    // Select Gender
    const genderSelect = await screen.findByLabelText(/Gender/i);
    await user.selectOptions(genderSelect, "male");

    // Mock API success
    (apiClient.updateProfile as any).mockResolvedValue({ success: true });

    // Submit
    const submitButton = screen.getByRole("button", {
      name: /Complete Setup/i,
    });
    await user.click(submitButton);

    expect(apiClient.updateProfile).toHaveBeenCalledWith({
      gender: "male",
    });
  });

  it("should display error if API fails", async () => {
    const user = userEvent.setup();
    renderWithRouter(<Onboarding />);

    const genderSelect = await screen.findByLabelText(/Gender/i);
    await user.selectOptions(genderSelect, "female");

    // Mock API failure with response error
    const error = {
      response: {
        data: { error: "Backend validation failed" },
      },
    };
    (apiClient.updateProfile as any).mockRejectedValue(error);

    await user.click(screen.getByRole("button", { name: /Complete Setup/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Backend validation failed/i),
      ).toBeInTheDocument();
    });
  });
});
