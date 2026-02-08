import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { BrowserRouter } from "react-router-dom";
import StripeSettingsPage from "../StripeSettingsPage";
import apiClient from "../../../services/api";

// Mock the apiClient
vi.mock("../../../services/api", () => ({
  default: {
    getStripeSettings: vi.fn(),
    updateStripeSettings: vi.fn(),
  },
}));

// Mock useAuth
vi.mock("../../../contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { isSuperAdmin: true },
    isAuthenticated: true,
  }),
}));

// Mock logger to prevent console noise during tests
vi.mock("../../../utils/logger", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

// Helper to create mock settings response
const createMockStripeSettings = (overrides = {}) => ({
  data: {
    stripeConfigured: false,
    stripeConfigSource: null,
    stripePublishableKey: "",
    hasSecretKey: false,
    hasWebhookSecret: false,
    defaultEntryFee: 2500, // $25.00
    annualMembershipFee: null,
    monthlyMembershipFee: null,
    ...overrides,
  },
});

describe("StripeSettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render page title", async () => {
      (apiClient.getStripeSettings as Mock).mockResolvedValue(createMockStripeSettings());

      renderWithRouter(<StripeSettingsPage />);

      await waitFor(() => {
        const heading = screen.getByRole("heading", { level: 1 });
        expect(heading).toHaveTextContent(/stripe/i);
        expect(heading).toHaveTextContent(/settings/i);
      });
    });

    it("should show loading spinner while fetching settings", () => {
      (apiClient.getStripeSettings as Mock).mockImplementation(
        () => new Promise(() => {})
      );

      renderWithRouter(<StripeSettingsPage />);

      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    });

    it("should display Stripe connection section", async () => {
      (apiClient.getStripeSettings as Mock).mockResolvedValue(createMockStripeSettings());

      renderWithRouter(<StripeSettingsPage />);

      await waitFor(() => {
        expect(screen.getByText("Stripe Connection")).toBeInTheDocument();
      });
    });

    it("should display pricing section", async () => {
      (apiClient.getStripeSettings as Mock).mockResolvedValue(createMockStripeSettings());

      renderWithRouter(<StripeSettingsPage />);

      await waitFor(() => {
        expect(screen.getByText("Global Pricing")).toBeInTheDocument();
      });
    });
  });

  describe("connection status - not configured", () => {
    it("should show 'Not Configured' status when Stripe is not set up", async () => {
      (apiClient.getStripeSettings as Mock).mockResolvedValue(createMockStripeSettings());

      renderWithRouter(<StripeSettingsPage />);

      await waitFor(() => {
        expect(screen.getByText("Not Configured")).toBeInTheDocument();
      });
    });

    it("should show configuration form when not configured", async () => {
      (apiClient.getStripeSettings as Mock).mockResolvedValue(createMockStripeSettings());

      renderWithRouter(<StripeSettingsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/publishable key/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/secret key/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/webhook secret/i)).toBeInTheDocument();
      });
    });
  });

  describe("connection status - configured via env", () => {
    it("should show environment banner when configured via env vars", async () => {
      (apiClient.getStripeSettings as Mock).mockResolvedValue(
        createMockStripeSettings({
          stripeConfigured: true,
          stripeConfigSource: "environment",
        })
      );

      renderWithRouter(<StripeSettingsPage />);

      await waitFor(() => {
        expect(screen.getByText(/configured via environment/i)).toBeInTheDocument();
      });
    });

    it("should not show editable form when configured via env", async () => {
      (apiClient.getStripeSettings as Mock).mockResolvedValue(
        createMockStripeSettings({
          stripeConfigured: true,
          stripeConfigSource: "environment",
        })
      );

      renderWithRouter(<StripeSettingsPage />);

      await waitFor(() => {
        expect(screen.queryByLabelText(/secret key/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("connection status - configured via database", () => {
    it("should show 'Connected' status when configured", async () => {
      (apiClient.getStripeSettings as Mock).mockResolvedValue(
        createMockStripeSettings({
          stripeConfigured: true,
          stripeConfigSource: "database",
          stripePublishableKey: "pk_test_xxx",
          hasSecretKey: true,
          hasWebhookSecret: true,
        })
      );

      renderWithRouter(<StripeSettingsPage />);

      await waitFor(() => {
        expect(screen.getByText("Connected")).toBeInTheDocument();
      });
    });

    it("should show masked keys when configured via database", async () => {
      (apiClient.getStripeSettings as Mock).mockResolvedValue(
        createMockStripeSettings({
          stripeConfigured: true,
          stripeConfigSource: "database",
          stripePublishableKey: "pk_test_abc123",
          hasSecretKey: true,
          hasWebhookSecret: true,
        })
      );

      renderWithRouter(<StripeSettingsPage />);

      await waitFor(() => {
        expect(screen.getByText(/pk_test_abc123/i)).toBeInTheDocument();
        // Both secret key and webhook secret show masked
        const maskedElements = screen.getAllByText(/••••••••/);
        expect(maskedElements.length).toBe(2);
      });
    });
  });

  describe("pricing section", () => {
    it("should display default entry fee input", async () => {
      (apiClient.getStripeSettings as Mock).mockResolvedValue(
        createMockStripeSettings({ defaultEntryFee: 2500 })
      );

      renderWithRouter(<StripeSettingsPage />);

      await waitFor(() => {
        const input = screen.getByLabelText(/default entry fee/i);
        expect(input).toBeInTheDocument();
        expect(input).toHaveValue(25); // 2500 cents = $25.00
      });
    });

    it("should display disabled annual membership fee input", async () => {
      (apiClient.getStripeSettings as Mock).mockResolvedValue(createMockStripeSettings());

      renderWithRouter(<StripeSettingsPage />);

      await waitFor(() => {
        const input = screen.getByLabelText(/annual membership fee/i);
        expect(input).toBeInTheDocument();
        expect(input).toBeDisabled();
      });
    });

    it("should display disabled monthly membership fee input", async () => {
      (apiClient.getStripeSettings as Mock).mockResolvedValue(createMockStripeSettings());

      renderWithRouter(<StripeSettingsPage />);

      await waitFor(() => {
        const input = screen.getByLabelText(/monthly membership fee/i);
        expect(input).toBeInTheDocument();
        expect(input).toBeDisabled();
      });
    });
  });

  describe("form submission", () => {
    it("should save settings when save button is clicked", async () => {
      (apiClient.getStripeSettings as Mock).mockResolvedValue(createMockStripeSettings());
      (apiClient.updateStripeSettings as Mock).mockResolvedValue({
        success: true,
        message: "Settings saved",
      });

      renderWithRouter(<StripeSettingsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/publishable key/i)).toBeInTheDocument();
      });

      // Fill in the form
      fireEvent.change(screen.getByLabelText(/publishable key/i), {
        target: { value: "pk_test_new123" },
      });
      fireEvent.change(screen.getByLabelText(/secret key/i), {
        target: { value: "sk_test_new456" },
      });
      fireEvent.change(screen.getByLabelText(/webhook secret/i), {
        target: { value: "whsec_test789" },
      });

      // Click save
      fireEvent.click(screen.getByRole("button", { name: /save settings/i }));

      await waitFor(() => {
        expect(apiClient.updateStripeSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            stripePublishableKey: "pk_test_new123",
            stripeSecretKey: "sk_test_new456",
            stripeWebhookSecret: "whsec_test789",
          })
        );
      });
    });

    it("should show success message after successful save", async () => {
      (apiClient.getStripeSettings as Mock).mockResolvedValue(createMockStripeSettings());
      (apiClient.updateStripeSettings as Mock).mockResolvedValue({
        success: true,
        message: "Settings saved",
      });

      renderWithRouter(<StripeSettingsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/default entry fee/i)).toBeInTheDocument();
      });

      // Update entry fee
      fireEvent.change(screen.getByLabelText(/default entry fee/i), {
        target: { value: "30" },
      });

      fireEvent.click(screen.getByRole("button", { name: /save settings/i }));

      await waitFor(() => {
        expect(screen.getByText(/saved successfully/i)).toBeInTheDocument();
      });
    });

    it("should show error message when save fails", async () => {
      (apiClient.getStripeSettings as Mock).mockResolvedValue(createMockStripeSettings());
      (apiClient.updateStripeSettings as Mock).mockRejectedValue({
        response: { data: { error: "Failed to save settings" } },
      });

      renderWithRouter(<StripeSettingsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/default entry fee/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /save settings/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to save/i)).toBeInTheDocument();
      });
    });

    it("should convert dollars to cents when saving entry fee", async () => {
      (apiClient.getStripeSettings as Mock).mockResolvedValue(createMockStripeSettings());
      (apiClient.updateStripeSettings as Mock).mockResolvedValue({ success: true });

      renderWithRouter(<StripeSettingsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/default entry fee/i)).toBeInTheDocument();
      });

      // Enter $35.50
      fireEvent.change(screen.getByLabelText(/default entry fee/i), {
        target: { value: "35.50" },
      });

      fireEvent.click(screen.getByRole("button", { name: /save settings/i }));

      await waitFor(() => {
        expect(apiClient.updateStripeSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            defaultEntryFee: 3550, // Converted to cents
          })
        );
      });
    });
  });

  describe("error handling", () => {
    it("should display error when loading fails", async () => {
      (apiClient.getStripeSettings as Mock).mockRejectedValue({
        response: { data: { error: "Failed to load settings" } },
      });

      renderWithRouter(<StripeSettingsPage />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });
    });
  });

  describe("navigation", () => {
    it("should have link to discount codes page", async () => {
      (apiClient.getStripeSettings as Mock).mockResolvedValue(createMockStripeSettings());

      renderWithRouter(<StripeSettingsPage />);

      await waitFor(() => {
        const link = screen.getByRole("link", { name: /discount codes/i });
        expect(link).toHaveAttribute("href", "/admin/settings/discounts");
      });
    });
  });
});
