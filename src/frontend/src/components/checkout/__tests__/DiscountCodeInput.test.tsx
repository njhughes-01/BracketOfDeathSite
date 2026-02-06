import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DiscountCodeInput } from "../DiscountCodeInput";
import api from "../../../services/api";

// Mock the api module
vi.mock("../../../services/api", () => ({
  default: {
    post: vi.fn(),
  },
}));

describe("DiscountCodeInput", () => {
  const defaultProps = {
    tournamentId: "tournament-123",
    onApply: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("input behavior", () => {
    it("should render input and Apply button", () => {
      render(<DiscountCodeInput {...defaultProps} />);

      expect(screen.getByPlaceholderText("Enter code")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /apply/i })).toBeInTheDocument();
    });

    it("should accept text input", () => {
      render(<DiscountCodeInput {...defaultProps} />);

      const input = screen.getByPlaceholderText("Enter code");
      fireEvent.change(input, { target: { value: "test" } });

      expect(input).toHaveValue("TEST"); // Component uppercases input
    });

    it("should uppercase input automatically", () => {
      render(<DiscountCodeInput {...defaultProps} />);

      const input = screen.getByPlaceholderText("Enter code");
      fireEvent.change(input, { target: { value: "summerSale" } });

      expect(input).toHaveValue("SUMMERSALE");
    });

    it("should disable input when disabled prop is true", () => {
      render(<DiscountCodeInput {...defaultProps} disabled={true} />);

      const input = screen.getByPlaceholderText("Enter code");
      const button = screen.getByRole("button", { name: /apply/i });

      expect(input).toBeDisabled();
      expect(button).toBeDisabled();
    });

    it("should disable Apply button when input is empty", () => {
      render(<DiscountCodeInput {...defaultProps} />);

      const button = screen.getByRole("button", { name: /apply/i });
      expect(button).toBeDisabled();
    });

    it("should enable Apply button when input has text", () => {
      render(<DiscountCodeInput {...defaultProps} />);

      const input = screen.getByPlaceholderText("Enter code");
      fireEvent.change(input, { target: { value: "CODE123" } });

      const button = screen.getByRole("button", { name: /apply/i });
      expect(button).not.toBeDisabled();
    });
  });

  describe("API interaction", () => {
    it("should call API with code and tournamentId when Apply is clicked", async () => {
      (api.post as any).mockResolvedValue({
        data: { valid: true, discountType: "percent", discountValue: 10 },
      });

      render(<DiscountCodeInput {...defaultProps} />);

      const input = screen.getByPlaceholderText("Enter code");
      fireEvent.change(input, { target: { value: "SAVE10" } });

      const button = screen.getByRole("button", { name: /apply/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith("/discount-codes/validate", {
          code: "SAVE10",
          tournamentId: "tournament-123",
        });
      });
    });

    it("should trim whitespace from code before sending", async () => {
      (api.post as any).mockResolvedValue({
        data: { valid: true, discountType: "percent", discountValue: 10 },
      });

      render(<DiscountCodeInput {...defaultProps} />);

      const input = screen.getByPlaceholderText("Enter code");
      fireEvent.change(input, { target: { value: "  SAVE10  " } });

      const button = screen.getByRole("button", { name: /apply/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith("/discount-codes/validate", {
          code: "SAVE10",
          tournamentId: "tournament-123",
        });
      });
    });

    it("should disable Apply button when code is only whitespace", () => {
      render(<DiscountCodeInput {...defaultProps} />);

      const input = screen.getByPlaceholderText("Enter code");
      fireEvent.change(input, { target: { value: "   " } });
      
      // Button should be disabled for whitespace-only input
      const button = screen.getByRole("button", { name: /apply/i });
      expect(button).toBeDisabled();

      // API should not be callable
      expect(api.post).not.toHaveBeenCalled();
    });
  });

  describe("loading state", () => {
    it("should show loading state while API call is in progress", async () => {
      // Create a promise that we control
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      (api.post as any).mockReturnValue(pendingPromise);

      render(<DiscountCodeInput {...defaultProps} />);

      const input = screen.getByPlaceholderText("Enter code");
      fireEvent.change(input, { target: { value: "LOADING" } });

      const button = screen.getByRole("button", { name: /apply/i });
      fireEvent.click(button);

      // Button should be disabled during loading
      await waitFor(() => {
        expect(button).toBeDisabled();
        expect(button).toHaveClass("loading");
      });

      // Input should be disabled during loading
      expect(input).toBeDisabled();

      // Resolve the promise
      resolvePromise!({
        data: { valid: true, discountType: "percent", discountValue: 10 },
      });
    });
  });

  describe("success state", () => {
    it("should show success state with percentage discount", async () => {
      (api.post as any).mockResolvedValue({
        data: { valid: true, discountType: "percent", discountValue: 20 },
      });

      const onApply = vi.fn();
      render(<DiscountCodeInput {...defaultProps} onApply={onApply} />);

      const input = screen.getByPlaceholderText("Enter code");
      fireEvent.change(input, { target: { value: "SAVE20" } });

      const button = screen.getByRole("button", { name: /apply/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("SAVE20")).toBeInTheDocument();
        expect(screen.getByText(/20% off/)).toBeInTheDocument();
      });

      expect(onApply).toHaveBeenCalledWith("SAVE20", {
        valid: true,
        discountType: "percent",
        discountValue: 20,
        error: undefined,
      });
    });

    it("should show success state with amount discount in dollars", async () => {
      (api.post as any).mockResolvedValue({
        data: { valid: true, discountType: "amount", discountValue: 1000 }, // $10.00 in cents
      });

      render(<DiscountCodeInput {...defaultProps} />);

      const input = screen.getByPlaceholderText("Enter code");
      fireEvent.change(input, { target: { value: "FLAT10" } });

      const button = screen.getByRole("button", { name: /apply/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("FLAT10")).toBeInTheDocument();
        expect(screen.getByText(/\$10\.00 off/)).toBeInTheDocument();
      });
    });

    it("should allow removing applied discount", async () => {
      (api.post as any).mockResolvedValue({
        data: { valid: true, discountType: "percent", discountValue: 10 },
      });

      const onApply = vi.fn();
      render(<DiscountCodeInput {...defaultProps} onApply={onApply} />);

      const input = screen.getByPlaceholderText("Enter code");
      fireEvent.change(input, { target: { value: "CODE" } });

      const applyButton = screen.getByRole("button", { name: /apply/i });
      fireEvent.click(applyButton);

      await waitFor(() => {
        expect(screen.getByText("CODE")).toBeInTheDocument();
      });

      // Click remove button
      const removeButton = screen.getByRole("button", { name: /remove discount code/i });
      fireEvent.click(removeButton);

      // Should return to input state
      await waitFor(() => {
        expect(screen.getByPlaceholderText("Enter code")).toBeInTheDocument();
      });

      // Should call onApply with empty code and invalid
      expect(onApply).toHaveBeenLastCalledWith("", { valid: false });
    });
  });

  describe("error state", () => {
    it("should show error for invalid code", async () => {
      (api.post as any).mockResolvedValue({
        data: { valid: false, error: "Invalid code" },
      });

      const onApply = vi.fn();
      render(<DiscountCodeInput {...defaultProps} onApply={onApply} />);

      const input = screen.getByPlaceholderText("Enter code");
      fireEvent.change(input, { target: { value: "BADCODE" } });

      const button = screen.getByRole("button", { name: /apply/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("Invalid code")).toBeInTheDocument();
      });

      // Should not call onApply for invalid codes
      expect(onApply).not.toHaveBeenCalled();
    });

    it("should show friendly message for expired code", async () => {
      (api.post as any).mockResolvedValue({
        data: { valid: false, error: "expired" },
      });

      render(<DiscountCodeInput {...defaultProps} />);

      const input = screen.getByPlaceholderText("Enter code");
      fireEvent.change(input, { target: { value: "EXPIRED" } });

      const button = screen.getByRole("button", { name: /apply/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("This discount code has expired")).toBeInTheDocument();
      });
    });

    it("should show friendly message for limit reached", async () => {
      (api.post as any).mockResolvedValue({
        data: { valid: false, error: "limit_reached" },
      });

      render(<DiscountCodeInput {...defaultProps} />);

      const input = screen.getByPlaceholderText("Enter code");
      fireEvent.change(input, { target: { value: "LIMITED" } });

      const button = screen.getByRole("button", { name: /apply/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("This discount code has reached its usage limit")).toBeInTheDocument();
      });
    });

    it("should show friendly message for not applicable code", async () => {
      (api.post as any).mockResolvedValue({
        data: { valid: false, error: "not_applicable" },
      });

      render(<DiscountCodeInput {...defaultProps} />);

      const input = screen.getByPlaceholderText("Enter code");
      fireEvent.change(input, { target: { value: "WRONG" } });

      const button = screen.getByRole("button", { name: /apply/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("This code cannot be used for this tournament")).toBeInTheDocument();
      });
    });

    it("should show error message for API failure", async () => {
      (api.post as any).mockRejectedValue(new Error("Network error"));

      render(<DiscountCodeInput {...defaultProps} />);

      const input = screen.getByPlaceholderText("Enter code");
      fireEvent.change(input, { target: { value: "CODE" } });

      const button = screen.getByRole("button", { name: /apply/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });
    });

    it("should clear error when user starts typing again", async () => {
      (api.post as any).mockResolvedValue({
        data: { valid: false, error: "Invalid code" },
      });

      render(<DiscountCodeInput {...defaultProps} />);

      const input = screen.getByPlaceholderText("Enter code");
      fireEvent.change(input, { target: { value: "BAD" } });

      const button = screen.getByRole("button", { name: /apply/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("Invalid code")).toBeInTheDocument();
      });

      // Type again
      fireEvent.change(input, { target: { value: "NEWCODE" } });

      expect(screen.queryByText("Invalid code")).not.toBeInTheDocument();
    });
  });

  describe("keyboard interaction", () => {
    it("should submit on Enter key press", async () => {
      (api.post as any).mockResolvedValue({
        data: { valid: true, discountType: "percent", discountValue: 10 },
      });

      render(<DiscountCodeInput {...defaultProps} />);

      const input = screen.getByPlaceholderText("Enter code");
      fireEvent.change(input, { target: { value: "ENTER" } });
      fireEvent.keyDown(input, { key: "Enter" });

      await waitFor(() => {
        expect(api.post).toHaveBeenCalled();
      });
    });

    it("should not submit on Enter when loading", async () => {
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      (api.post as any).mockReturnValue(pendingPromise);

      render(<DiscountCodeInput {...defaultProps} />);

      const input = screen.getByPlaceholderText("Enter code");
      fireEvent.change(input, { target: { value: "CODE" } });
      fireEvent.click(screen.getByRole("button", { name: /apply/i }));

      // Try pressing Enter during loading
      fireEvent.keyDown(input, { key: "Enter" });

      // Should only have been called once (from the click)
      expect(api.post).toHaveBeenCalledTimes(1);

      resolvePromise!({ data: { valid: true, discountType: "percent", discountValue: 10 } });
    });
  });
});
