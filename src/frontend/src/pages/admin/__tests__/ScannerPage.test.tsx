import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import ScannerPage from "../ScannerPage";
import apiClient from "../../../services/api";

// Mock the apiClient
vi.mock("../../../services/api", () => ({
  default: {
    lookupTicketByCode: vi.fn(),
    checkInTicket: vi.fn(),
  },
}));

// Mock QRScanner - it uses html5-qrcode which requires browser camera APIs
// that don't work in jsdom test environment
vi.mock("../../../components/scanner/QRScanner", () => ({
  default: ({ onScan, onError }: { onScan: (code: string) => void; onError: (err: string) => void }) => (
    <div data-testid="mock-qr-scanner">
      <button onClick={() => onScan("BOD-TESTABC123")} data-testid="mock-scan-button">
        Simulate Scan
      </button>
      <button onClick={() => onError("Camera error")} data-testid="mock-error-button">
        Simulate Error
      </button>
    </div>
  ),
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

// Helper to create mock ticket response
const createMockTicketResponse = (overrides = {}) => ({
  data: {
    ticket: {
      id: "ticket-123",
      ticketCode: "BOD-TESTABC123",
      status: "valid" as const,
      player: {
        id: "player-1",
        firstName: "John",
        lastName: "Doe",
      },
      team: {
        id: "team-1",
        name: "Death Squad",
      },
      tournament: {
        id: "tournament-1",
        name: "BOD 2025",
      },
    },
    alreadyCheckedIn: false,
    canCheckIn: true,
    ...overrides,
  },
});

describe("ScannerPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render page title", () => {
      render(<ScannerPage />);

      // The title has "Ticket" and "Scanner" in separate elements
      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toHaveTextContent(/ticket/i);
      expect(heading).toHaveTextContent(/scanner/i);
    });

    it("should render QR scanner section", () => {
      render(<ScannerPage />);

      expect(screen.getByText("QR Code Scanner")).toBeInTheDocument();
      expect(screen.getByTestId("mock-qr-scanner")).toBeInTheDocument();
    });

    it("should render manual entry section", () => {
      render(<ScannerPage />);

      expect(screen.getByText("Manual Entry")).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter ticket code/i)).toBeInTheDocument();
    });

    it("should render quick tips section", () => {
      render(<ScannerPage />);

      expect(screen.getByText("Quick Tips")).toBeInTheDocument();
    });

    it("should not show checked in counter initially", () => {
      render(<ScannerPage />);

      expect(screen.queryByText("Checked In")).not.toBeInTheDocument();
    });
  });

  describe("manual lookup", () => {
    it("should lookup ticket when code is entered and submitted", async () => {
      (apiClient.lookupTicketByCode as Mock).mockResolvedValue(createMockTicketResponse());

      render(<ScannerPage />);

      const input = screen.getByPlaceholderText(/enter ticket code/i);
      const button = screen.getByRole("button", { name: /lookup/i });

      fireEvent.change(input, { target: { value: "BOD-MANUAL123" } });
      fireEvent.click(button);

      await waitFor(() => {
        expect(apiClient.lookupTicketByCode).toHaveBeenCalledWith("BOD-MANUAL123");
      });
    });

    it("should display valid ticket result after successful lookup", async () => {
      (apiClient.lookupTicketByCode as Mock).mockResolvedValue(createMockTicketResponse());

      render(<ScannerPage />);

      const input = screen.getByPlaceholderText(/enter ticket code/i);
      const button = screen.getByRole("button", { name: /lookup/i });

      fireEvent.change(input, { target: { value: "BOD-TEST" } });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("Valid Ticket")).toBeInTheDocument();
        expect(screen.getByText("John Doe")).toBeInTheDocument();
        expect(screen.getByText("BOD 2025")).toBeInTheDocument();
      });
    });

    it("should display error when ticket lookup fails", async () => {
      (apiClient.lookupTicketByCode as Mock).mockRejectedValue({
        response: { data: { error: "Ticket not found" } },
      });

      render(<ScannerPage />);

      const input = screen.getByPlaceholderText(/enter ticket code/i);
      const button = screen.getByRole("button", { name: /lookup/i });

      fireEvent.change(input, { target: { value: "BOD-INVALID" } });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("Invalid Ticket")).toBeInTheDocument();
        expect(screen.getByText("Ticket not found")).toBeInTheDocument();
      });
    });

    it("should show loading state during lookup", async () => {
      // Make the lookup hang
      (apiClient.lookupTicketByCode as Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<ScannerPage />);

      const input = screen.getByPlaceholderText(/enter ticket code/i);
      const button = screen.getByRole("button", { name: /lookup/i });

      fireEvent.change(input, { target: { value: "BOD-SLOW" } });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("Looking up ticket...")).toBeInTheDocument();
      });
    });
  });

  describe("QR scanner integration", () => {
    it("should lookup ticket when QR code is scanned", async () => {
      (apiClient.lookupTicketByCode as Mock).mockResolvedValue(createMockTicketResponse());

      render(<ScannerPage />);

      // Simulate a QR scan using our mock button
      fireEvent.click(screen.getByTestId("mock-scan-button"));

      await waitFor(() => {
        expect(apiClient.lookupTicketByCode).toHaveBeenCalledWith("BOD-TESTABC123");
      });
    });

    it("should display result after QR scan", async () => {
      (apiClient.lookupTicketByCode as Mock).mockResolvedValue(createMockTicketResponse());

      render(<ScannerPage />);

      fireEvent.click(screen.getByTestId("mock-scan-button"));

      await waitFor(() => {
        expect(screen.getByText("Valid Ticket")).toBeInTheDocument();
      });
    });
  });

  describe("check-in flow", () => {
    it("should successfully check in a valid ticket", async () => {
      (apiClient.lookupTicketByCode as Mock).mockResolvedValue(createMockTicketResponse());
      (apiClient.checkInTicket as Mock).mockResolvedValue({
        data: { message: "Checked in", checkedInAt: new Date().toISOString() },
      });

      render(<ScannerPage />);

      // First lookup
      const input = screen.getByPlaceholderText(/enter ticket code/i);
      fireEvent.change(input, { target: { value: "BOD-TEST" } });
      fireEvent.click(screen.getByRole("button", { name: /lookup/i }));

      // Wait for result
      await waitFor(() => {
        expect(screen.getByText("Valid Ticket")).toBeInTheDocument();
      });

      // Click check in
      fireEvent.click(screen.getByRole("button", { name: /check in/i }));

      await waitFor(() => {
        expect(apiClient.checkInTicket).toHaveBeenCalledWith("ticket-123");
      });
    });

    it("should show success message after successful check-in", async () => {
      (apiClient.lookupTicketByCode as Mock).mockResolvedValue(createMockTicketResponse());
      (apiClient.checkInTicket as Mock).mockResolvedValue({
        data: { message: "Checked in", checkedInAt: new Date().toISOString() },
      });

      render(<ScannerPage />);

      // Lookup
      const input = screen.getByPlaceholderText(/enter ticket code/i);
      fireEvent.change(input, { target: { value: "BOD-TEST" } });
      fireEvent.click(screen.getByRole("button", { name: /lookup/i }));

      await waitFor(() => {
        expect(screen.getByText("Valid Ticket")).toBeInTheDocument();
      });

      // Check in
      fireEvent.click(screen.getByRole("button", { name: /check in/i }));

      await waitFor(() => {
        expect(screen.getByText(/john doe checked in successfully/i)).toBeInTheDocument();
      });
    });

    it("should increment counter after successful check-in", async () => {
      (apiClient.lookupTicketByCode as Mock).mockResolvedValue(createMockTicketResponse());
      (apiClient.checkInTicket as Mock).mockResolvedValue({
        data: { message: "Checked in", checkedInAt: new Date().toISOString() },
      });

      render(<ScannerPage />);

      // Lookup
      const input = screen.getByPlaceholderText(/enter ticket code/i);
      fireEvent.change(input, { target: { value: "BOD-TEST" } });
      fireEvent.click(screen.getByRole("button", { name: /lookup/i }));

      await waitFor(() => {
        expect(screen.getByText("Valid Ticket")).toBeInTheDocument();
      });

      // Check in
      fireEvent.click(screen.getByRole("button", { name: /check in/i }));

      await waitFor(() => {
        // Counter should show 1 and "Checked In" label
        expect(screen.getByText("1")).toBeInTheDocument();
        expect(screen.getByText("Checked In")).toBeInTheDocument();
      });
    });

    it("should display error when check-in fails", async () => {
      (apiClient.lookupTicketByCode as Mock).mockResolvedValue(createMockTicketResponse());
      (apiClient.checkInTicket as Mock).mockRejectedValue({
        response: { data: { error: "Check-in failed - server error" } },
      });

      render(<ScannerPage />);

      // Lookup
      const input = screen.getByPlaceholderText(/enter ticket code/i);
      fireEvent.change(input, { target: { value: "BOD-TEST" } });
      fireEvent.click(screen.getByRole("button", { name: /lookup/i }));

      await waitFor(() => {
        expect(screen.getByText("Valid Ticket")).toBeInTheDocument();
      });

      // Check in (will fail)
      fireEvent.click(screen.getByRole("button", { name: /check in/i }));

      await waitFor(() => {
        expect(screen.getByText("Check-in failed - server error")).toBeInTheDocument();
      });
    });
  });

  describe("already checked in ticket", () => {
    it("should display yellow warning for already checked in ticket", async () => {
      (apiClient.lookupTicketByCode as Mock).mockResolvedValue(
        createMockTicketResponse({
          ticket: {
            ...createMockTicketResponse().data.ticket,
            status: "checked_in",
            checkedInAt: "2025-02-06T10:00:00Z",
          },
          alreadyCheckedIn: true,
          canCheckIn: false,
        })
      );

      render(<ScannerPage />);

      const input = screen.getByPlaceholderText(/enter ticket code/i);
      fireEvent.change(input, { target: { value: "BOD-CHECKED" } });
      fireEvent.click(screen.getByRole("button", { name: /lookup/i }));

      await waitFor(() => {
        expect(screen.getByText("Already Checked In")).toBeInTheDocument();
        expect(screen.getByText("This ticket has already been used")).toBeInTheDocument();
      });
    });
  });

  describe("refunded ticket", () => {
    it("should display red error for refunded ticket", async () => {
      (apiClient.lookupTicketByCode as Mock).mockResolvedValue(
        createMockTicketResponse({
          ticket: {
            ...createMockTicketResponse().data.ticket,
            status: "refunded",
          },
          alreadyCheckedIn: false,
          canCheckIn: false,
        })
      );

      render(<ScannerPage />);

      const input = screen.getByPlaceholderText(/enter ticket code/i);
      fireEvent.change(input, { target: { value: "BOD-REFUNDED" } });
      fireEvent.click(screen.getByRole("button", { name: /lookup/i }));

      await waitFor(() => {
        expect(screen.getByText("Ticket Refunded")).toBeInTheDocument();
        expect(screen.getByText("This ticket is no longer valid")).toBeInTheDocument();
      });
    });
  });

  describe("reset functionality", () => {
    it("should reset to initial state when scan another is clicked", async () => {
      (apiClient.lookupTicketByCode as Mock).mockRejectedValue({
        response: { data: { error: "Not found" } },
      });

      render(<ScannerPage />);

      // Trigger an error
      const input = screen.getByPlaceholderText(/enter ticket code/i);
      fireEvent.change(input, { target: { value: "BOD-INVALID" } });
      fireEvent.click(screen.getByRole("button", { name: /lookup/i }));

      await waitFor(() => {
        expect(screen.getByText("Invalid Ticket")).toBeInTheDocument();
      });

      // Click scan another
      fireEvent.click(screen.getByRole("button", { name: /scan another ticket/i }));

      await waitFor(() => {
        // Error should be cleared
        expect(screen.queryByText("Invalid Ticket")).not.toBeInTheDocument();
        expect(screen.queryByText("Not found")).not.toBeInTheDocument();
      });
    });

    it("should reset result when cancel is clicked on valid ticket", async () => {
      (apiClient.lookupTicketByCode as Mock).mockResolvedValue(createMockTicketResponse());

      render(<ScannerPage />);

      const input = screen.getByPlaceholderText(/enter ticket code/i);
      fireEvent.change(input, { target: { value: "BOD-TEST" } });
      fireEvent.click(screen.getByRole("button", { name: /lookup/i }));

      await waitFor(() => {
        expect(screen.getByText("Valid Ticket")).toBeInTheDocument();
      });

      // Click cancel
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

      await waitFor(() => {
        expect(screen.queryByText("Valid Ticket")).not.toBeInTheDocument();
        expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
      });
    });
  });

  describe("duplicate scan prevention", () => {
    it("should not re-lookup same code if result is already displayed", async () => {
      (apiClient.lookupTicketByCode as Mock).mockResolvedValue(createMockTicketResponse());

      render(<ScannerPage />);

      const input = screen.getByPlaceholderText(/enter ticket code/i);
      fireEvent.change(input, { target: { value: "BOD-SAME" } });
      fireEvent.click(screen.getByRole("button", { name: /lookup/i }));

      await waitFor(() => {
        expect(screen.getByText("Valid Ticket")).toBeInTheDocument();
      });

      // Try same code again (e.g., via QR re-scan)
      fireEvent.change(input, { target: { value: "BOD-SAME" } });
      fireEvent.click(screen.getByRole("button", { name: /lookup/i }));

      // Should only have been called once
      await waitFor(() => {
        expect(apiClient.lookupTicketByCode).toHaveBeenCalledTimes(1);
      });
    });
  });
});

/**
 * NOTE: QRScanner component is mocked in these tests.
 *
 * The html5-qrcode library requires browser camera APIs (getUserMedia, MediaDevices)
 * which are not available in jsdom test environment. Testing the actual QRScanner
 * component would require either:
 * 1. E2E tests with real browser (Playwright/Cypress)
 * 2. Complex mocking of browser media APIs
 *
 * The mock allows us to test ScannerPage integration logic while the QRScanner
 * component itself is simple enough (just passes scan results to callback) that
 * the integration test coverage is sufficient.
 */
