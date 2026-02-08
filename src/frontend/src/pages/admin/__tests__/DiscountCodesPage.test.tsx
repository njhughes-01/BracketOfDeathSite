import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { BrowserRouter } from "react-router-dom";
import DiscountCodesPage from "../DiscountCodesPage";
import apiClient from "../../../services/api";

// Mock the apiClient
vi.mock("../../../services/api", () => ({
  default: {
    getDiscountCodes: vi.fn(),
    createDiscountCode: vi.fn(),
    updateDiscountCode: vi.fn(),
    deactivateDiscountCode: vi.fn(),
    getTournaments: vi.fn(),
  },
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

// Helper to create mock discount codes
const createMockDiscountCodes = () => ({
  data: {
    codes: [
      {
        _id: "code-1",
        code: "SUMMER25",
        type: "percent",
        percentOff: 25,
        maxRedemptions: 100,
        redemptionCount: 15,
        expiresAt: "2026-08-31T23:59:59Z",
        active: true,
        tournamentIds: [],
        createdAt: "2026-01-01T00:00:00Z",
      },
      {
        _id: "code-2",
        code: "FLAT10",
        type: "amount",
        amountOff: 1000,
        maxRedemptions: null,
        redemptionCount: 5,
        expiresAt: null,
        active: true,
        tournamentIds: ["tournament-1"],
        createdAt: "2026-01-15T00:00:00Z",
      },
      {
        _id: "code-3",
        code: "OLDCODE",
        type: "percent",
        percentOff: 10,
        maxRedemptions: 50,
        redemptionCount: 50,
        expiresAt: "2025-12-31T23:59:59Z",
        active: false,
        tournamentIds: [],
        createdAt: "2025-01-01T00:00:00Z",
      },
    ],
  },
});

const createMockTournaments = () => ({
  data: [
    { _id: "tournament-1", bodNumber: 100, date: "2026-03-15" },
    { _id: "tournament-2", bodNumber: 101, date: "2026-04-15" },
  ],
  pagination: { total: 2 },
});

describe("DiscountCodesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiClient.getTournaments as Mock).mockResolvedValue(createMockTournaments());
  });

  describe("rendering", () => {
    it("should render page title", async () => {
      (apiClient.getDiscountCodes as Mock).mockResolvedValue(createMockDiscountCodes());

      renderWithRouter(<DiscountCodesPage />);

      await waitFor(() => {
        const heading = screen.getByRole("heading", { level: 1 });
        expect(heading).toHaveTextContent(/discount codes/i);
      });
    });

    it("should show loading spinner while fetching codes", () => {
      (apiClient.getDiscountCodes as Mock).mockImplementation(
        () => new Promise(() => {})
      );

      renderWithRouter(<DiscountCodesPage />);

      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    });

    it("should display create button", async () => {
      (apiClient.getDiscountCodes as Mock).mockResolvedValue(createMockDiscountCodes());

      renderWithRouter(<DiscountCodesPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /create/i })).toBeInTheDocument();
      });
    });
  });

  describe("discount codes table", () => {
    it("should display table headers", async () => {
      (apiClient.getDiscountCodes as Mock).mockResolvedValue(createMockDiscountCodes());

      renderWithRouter(<DiscountCodesPage />);

      await waitFor(() => {
        expect(screen.getByText("Code")).toBeInTheDocument();
        expect(screen.getByText("Type")).toBeInTheDocument();
        expect(screen.getByText("Value")).toBeInTheDocument();
        expect(screen.getByText("Redemptions")).toBeInTheDocument();
        expect(screen.getByText("Expires")).toBeInTheDocument();
        expect(screen.getByText("Status")).toBeInTheDocument();
        expect(screen.getByText("Actions")).toBeInTheDocument();
      });
    });

    it("should display discount codes in table", async () => {
      (apiClient.getDiscountCodes as Mock).mockResolvedValue(createMockDiscountCodes());

      renderWithRouter(<DiscountCodesPage />);

      await waitFor(() => {
        expect(screen.getByText("SUMMER25")).toBeInTheDocument();
        expect(screen.getByText("FLAT10")).toBeInTheDocument();
        expect(screen.getByText("OLDCODE")).toBeInTheDocument();
      });
    });

    it("should display percent type correctly", async () => {
      (apiClient.getDiscountCodes as Mock).mockResolvedValue(createMockDiscountCodes());

      renderWithRouter(<DiscountCodesPage />);

      await waitFor(() => {
        expect(screen.getByText("25%")).toBeInTheDocument();
      });
    });

    it("should display amount type correctly as dollars", async () => {
      (apiClient.getDiscountCodes as Mock).mockResolvedValue(createMockDiscountCodes());

      renderWithRouter(<DiscountCodesPage />);

      await waitFor(() => {
        expect(screen.getByText("$10.00")).toBeInTheDocument();
      });
    });

    it("should display redemption count with max", async () => {
      (apiClient.getDiscountCodes as Mock).mockResolvedValue(createMockDiscountCodes());

      renderWithRouter(<DiscountCodesPage />);

      await waitFor(() => {
        expect(screen.getByText("15 / 100")).toBeInTheDocument();
        expect(screen.getByText("5 / ∞")).toBeInTheDocument();
      });
    });

    it("should display active status badge", async () => {
      (apiClient.getDiscountCodes as Mock).mockResolvedValue(createMockDiscountCodes());

      renderWithRouter(<DiscountCodesPage />);

      await waitFor(() => {
        const activeBadges = screen.getAllByText("Active");
        expect(activeBadges.length).toBeGreaterThan(0);
      });
    });

    it("should display inactive status badge", async () => {
      (apiClient.getDiscountCodes as Mock).mockResolvedValue(createMockDiscountCodes());

      renderWithRouter(<DiscountCodesPage />);

      await waitFor(() => {
        expect(screen.getByText("Inactive")).toBeInTheDocument();
      });
    });

    it("should show empty state when no codes exist", async () => {
      (apiClient.getDiscountCodes as Mock).mockResolvedValue({ data: { codes: [] } });

      renderWithRouter(<DiscountCodesPage />);

      await waitFor(() => {
        expect(screen.getByText(/no discount codes/i)).toBeInTheDocument();
      });
    });
  });

  describe("create discount code modal", () => {
    beforeEach(() => {
      (apiClient.getDiscountCodes as Mock).mockResolvedValue(createMockDiscountCodes());
    });

    it("should open modal when create button is clicked", async () => {
      renderWithRouter(<DiscountCodesPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /create/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /create/i }));

      await waitFor(() => {
        expect(screen.getByText("Create Discount Code")).toBeInTheDocument();
      });
    });

    it("should display form fields in modal", async () => {
      renderWithRouter(<DiscountCodesPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole("button", { name: /create/i }));
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/^code$/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/value/i)).toBeInTheDocument();
      });
    });

    it("should auto-uppercase code input", async () => {
      renderWithRouter(<DiscountCodesPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole("button", { name: /create/i }));
      });

      await waitFor(() => {
        const codeInput = screen.getByLabelText(/^code$/i);
        fireEvent.change(codeInput, { target: { value: "lowercase" } });
        expect(codeInput).toHaveValue("LOWERCASE");
      });
    });

    it("should create discount code on form submission", async () => {
      (apiClient.createDiscountCode as Mock).mockResolvedValue({
        success: true,
        data: { code: { _id: "new-code", code: "NEWCODE" } },
      });

      renderWithRouter(<DiscountCodesPage />);

      // Click the header "Create Code" button to open modal
      await waitFor(() => {
        // Get all "Create Code" buttons, click the one that's NOT a submit button
        const createButtons = screen.getAllByRole("button", { name: /create code/i });
        const headerButton = createButtons.find(btn => !btn.getAttribute("type"));
        fireEvent.click(headerButton!);
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/^code$/i)).toBeInTheDocument();
      });

      // Fill form
      fireEvent.change(screen.getByLabelText(/^code$/i), {
        target: { value: "NEWCODE" },
      });
      fireEvent.change(screen.getByLabelText(/value/i), {
        target: { value: "20" },
      });

      // Submit - get the submit button inside modal (type="submit")
      const formSubmitButtons = screen.getAllByRole("button", { name: /create code/i });
      const modalSubmitButton = formSubmitButtons.find(btn => btn.getAttribute("type") === "submit");
      fireEvent.click(modalSubmitButton!);

      await waitFor(() => {
        expect(apiClient.createDiscountCode).toHaveBeenCalledWith(
          expect.objectContaining({
            code: "NEWCODE",
            type: "percent",
            percentOff: 20,
          })
        );
      });
    });

    it("should switch value label based on type selection", async () => {
      renderWithRouter(<DiscountCodesPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole("button", { name: /create/i }));
      });

      // Default is percent
      await waitFor(() => {
        expect(screen.getByLabelText(/value \(%\)/i)).toBeInTheDocument();
      });

      // Switch to amount
      fireEvent.change(screen.getByLabelText(/type/i), {
        target: { value: "amount" },
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/value \(\$\)/i)).toBeInTheDocument();
      });
    });

    it("should close modal when cancel is clicked", async () => {
      renderWithRouter(<DiscountCodesPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole("button", { name: /create/i }));
      });

      await waitFor(() => {
        expect(screen.getByText("Create Discount Code")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

      await waitFor(() => {
        expect(screen.queryByText("Create Discount Code")).not.toBeInTheDocument();
      });
    });
  });

  describe("edit discount code", () => {
    beforeEach(() => {
      (apiClient.getDiscountCodes as Mock).mockResolvedValue(createMockDiscountCodes());
    });

    it("should open edit modal when edit button is clicked", async () => {
      renderWithRouter(<DiscountCodesPage />);

      await waitFor(() => {
        expect(screen.getByText("SUMMER25")).toBeInTheDocument();
      });

      const row = screen.getByText("SUMMER25").closest("tr");
      const editButton = within(row!).getByRole("button", { name: /edit/i });
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByText("Edit Discount Code")).toBeInTheDocument();
      });
    });

    it("should pre-fill form with existing values", async () => {
      renderWithRouter(<DiscountCodesPage />);

      await waitFor(() => {
        expect(screen.getByText("SUMMER25")).toBeInTheDocument();
      });

      const row = screen.getByText("SUMMER25").closest("tr");
      const editButton = within(row!).getByRole("button", { name: /edit/i });
      fireEvent.click(editButton);

      await waitFor(() => {
        const codeInput = screen.getByLabelText(/^code$/i);
        expect(codeInput).toHaveValue("SUMMER25");
        expect(codeInput).toBeDisabled(); // Code cannot be changed
      });
    });

    it("should update discount code on form submission", async () => {
      (apiClient.updateDiscountCode as Mock).mockResolvedValue({
        success: true,
      });

      renderWithRouter(<DiscountCodesPage />);

      await waitFor(() => {
        expect(screen.getByText("SUMMER25")).toBeInTheDocument();
      });

      const row = screen.getByText("SUMMER25").closest("tr");
      const editButton = within(row!).getByRole("button", { name: /edit/i });
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByText("Edit Discount Code")).toBeInTheDocument();
      });

      // Update max redemptions
      fireEvent.change(screen.getByLabelText(/max redemptions/i), {
        target: { value: "200" },
      });

      fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(apiClient.updateDiscountCode).toHaveBeenCalledWith(
          "code-1",
          expect.objectContaining({
            maxRedemptions: 200,
          })
        );
      });
    });
  });

  describe("deactivate discount code", () => {
    beforeEach(() => {
      (apiClient.getDiscountCodes as Mock).mockResolvedValue(createMockDiscountCodes());
    });

    it("should show deactivate button for active codes", async () => {
      renderWithRouter(<DiscountCodesPage />);

      await waitFor(() => {
        expect(screen.getByText("SUMMER25")).toBeInTheDocument();
      });

      const row = screen.getByText("SUMMER25").closest("tr");
      expect(within(row!).getByRole("button", { name: /deactivate/i })).toBeInTheDocument();
    });

    it("should deactivate code when confirmed", async () => {
      (apiClient.deactivateDiscountCode as Mock).mockResolvedValue({
        success: true,
      });

      // Mock window.confirm
      vi.spyOn(window, "confirm").mockReturnValue(true);

      renderWithRouter(<DiscountCodesPage />);

      await waitFor(() => {
        expect(screen.getByText("SUMMER25")).toBeInTheDocument();
      });

      const row = screen.getByText("SUMMER25").closest("tr");
      fireEvent.click(within(row!).getByRole("button", { name: /deactivate/i }));

      await waitFor(() => {
        expect(apiClient.deactivateDiscountCode).toHaveBeenCalledWith("code-1");
      });
    });

    it("should not deactivate code when cancelled", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(false);

      renderWithRouter(<DiscountCodesPage />);

      await waitFor(() => {
        expect(screen.getByText("SUMMER25")).toBeInTheDocument();
      });

      const row = screen.getByText("SUMMER25").closest("tr");
      fireEvent.click(within(row!).getByRole("button", { name: /deactivate/i }));

      expect(apiClient.deactivateDiscountCode).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should display error when loading fails", async () => {
      (apiClient.getDiscountCodes as Mock).mockRejectedValue({
        response: { data: { error: "Failed to load discount codes" } },
      });

      renderWithRouter(<DiscountCodesPage />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });
    });

    it("should display error when create fails", async () => {
      (apiClient.getDiscountCodes as Mock).mockResolvedValue(createMockDiscountCodes());
      (apiClient.createDiscountCode as Mock).mockRejectedValue({
        response: { data: { error: "Code already exists" } },
      });

      renderWithRouter(<DiscountCodesPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole("button", { name: /create/i }));
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/^code$/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/^code$/i), {
        target: { value: "EXISTING" },
      });
      fireEvent.change(screen.getByLabelText(/value/i), {
        target: { value: "10" },
      });

      // Click the submit button (type="submit")
      const formSubmitButtons = screen.getAllByRole("button", { name: /create code/i });
      const modalSubmitButton = formSubmitButtons.find(btn => btn.getAttribute("type") === "submit");
      fireEvent.click(modalSubmitButton!);

      await waitFor(() => {
        expect(screen.getByText(/code already exists/i)).toBeInTheDocument();
      });
    });
  });

  describe("navigation", () => {
    it("should have back link to stripe settings", async () => {
      (apiClient.getDiscountCodes as Mock).mockResolvedValue(createMockDiscountCodes());

      renderWithRouter(<DiscountCodesPage />);

      await waitFor(() => {
        const link = screen.getByRole("link", { name: /back to stripe/i });
        expect(link).toHaveAttribute("href", "/admin/settings/stripe");
      });
    });
  });
});
