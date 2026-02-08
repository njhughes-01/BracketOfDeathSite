import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ManualLookup from "../ManualLookup";

describe("ManualLookup", () => {
  const mockOnLookup = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render input field and lookup button", () => {
      render(<ManualLookup onLookup={mockOnLookup} />);

      expect(screen.getByPlaceholderText(/enter ticket code/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /lookup/i })).toBeInTheDocument();
    });

    it("should show helper text", () => {
      render(<ManualLookup onLookup={mockOnLookup} />);

      expect(screen.getByText(/enter the ticket code manually/i)).toBeInTheDocument();
    });
  });

  describe("input behavior", () => {
    it("should uppercase input text as user types", () => {
      render(<ManualLookup onLookup={mockOnLookup} />);

      const input = screen.getByPlaceholderText(/enter ticket code/i);
      fireEvent.change(input, { target: { value: "bod-abc123" } });

      expect(input).toHaveValue("BOD-ABC123");
    });

    it("should uppercase mixed case input", () => {
      render(<ManualLookup onLookup={mockOnLookup} />);

      const input = screen.getByPlaceholderText(/enter ticket code/i);
      fireEvent.change(input, { target: { value: "BoD-AbC123dEf" } });

      expect(input).toHaveValue("BOD-ABC123DEF");
    });
  });

  describe("form submission", () => {
    it("should call onLookup with uppercased trimmed code on button click", () => {
      render(<ManualLookup onLookup={mockOnLookup} />);

      const input = screen.getByPlaceholderText(/enter ticket code/i);
      const button = screen.getByRole("button", { name: /lookup/i });

      fireEvent.change(input, { target: { value: "  bod-test123  " } });
      fireEvent.click(button);

      expect(mockOnLookup).toHaveBeenCalledWith("BOD-TEST123");
      expect(mockOnLookup).toHaveBeenCalledTimes(1);
    });

    it("should call onLookup on Enter key press", () => {
      render(<ManualLookup onLookup={mockOnLookup} />);

      const input = screen.getByPlaceholderText(/enter ticket code/i);

      fireEvent.change(input, { target: { value: "bod-enterkey" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(mockOnLookup).toHaveBeenCalledWith("BOD-ENTERKEY");
      expect(mockOnLookup).toHaveBeenCalledTimes(1);
    });

    it("should not call onLookup with empty input", () => {
      render(<ManualLookup onLookup={mockOnLookup} />);

      const button = screen.getByRole("button", { name: /lookup/i });
      fireEvent.click(button);

      expect(mockOnLookup).not.toHaveBeenCalled();
    });

    it("should not call onLookup with whitespace-only input", () => {
      render(<ManualLookup onLookup={mockOnLookup} />);

      const input = screen.getByPlaceholderText(/enter ticket code/i);
      const button = screen.getByRole("button", { name: /lookup/i });

      fireEvent.change(input, { target: { value: "   " } });
      fireEvent.click(button);

      expect(mockOnLookup).not.toHaveBeenCalled();
    });

    it("should not submit on Enter key with empty input", () => {
      render(<ManualLookup onLookup={mockOnLookup} />);

      const input = screen.getByPlaceholderText(/enter ticket code/i);
      fireEvent.keyDown(input, { key: "Enter" });

      expect(mockOnLookup).not.toHaveBeenCalled();
    });
  });

  describe("loading state", () => {
    it("should disable input when loading", () => {
      render(<ManualLookup onLookup={mockOnLookup} loading={true} />);

      const input = screen.getByPlaceholderText(/enter ticket code/i);
      expect(input).toBeDisabled();
    });

    it("should disable button when loading", () => {
      render(<ManualLookup onLookup={mockOnLookup} loading={true} />);

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });

    it("should show loading text on button when loading", () => {
      render(<ManualLookup onLookup={mockOnLookup} loading={true} />);

      expect(screen.getByText(/looking up/i)).toBeInTheDocument();
    });

    it("should disable button when input is empty (even when not loading)", () => {
      render(<ManualLookup onLookup={mockOnLookup} loading={false} />);

      const button = screen.getByRole("button", { name: /lookup/i });
      expect(button).toBeDisabled();
    });

    it("should enable button when input has value and not loading", () => {
      render(<ManualLookup onLookup={mockOnLookup} loading={false} />);

      const input = screen.getByPlaceholderText(/enter ticket code/i);
      const button = screen.getByRole("button", { name: /lookup/i });

      fireEvent.change(input, { target: { value: "bod-test" } });

      expect(button).not.toBeDisabled();
    });
  });
});
