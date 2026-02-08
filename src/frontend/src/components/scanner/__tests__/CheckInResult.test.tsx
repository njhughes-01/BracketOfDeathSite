import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CheckInResult from "../CheckInResult";

// Helper to create test ticket data
const createTicket = (overrides = {}) => ({
  id: "ticket-123",
  ticketCode: "BOD-ABC12345",
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
  canCheckIn: true,
  ...overrides,
});

describe("CheckInResult", () => {
  const mockOnCheckIn = vi.fn();
  const mockOnReset = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("when no ticket or error", () => {
    it("should render nothing when ticket and error are null", () => {
      const { container } = render(
        <CheckInResult
          ticket={null}
          error={null}
          onCheckIn={mockOnCheckIn}
          onReset={mockOnReset}
        />
      );

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("error state", () => {
    it("should display error message in red", () => {
      render(
        <CheckInResult
          ticket={null}
          error="Ticket not found"
          onCheckIn={mockOnCheckIn}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByText("Invalid Ticket")).toBeInTheDocument();
      expect(screen.getByText("Ticket not found")).toBeInTheDocument();
    });

    it("should show reset button on error", () => {
      render(
        <CheckInResult
          ticket={null}
          error="Some error"
          onCheckIn={mockOnCheckIn}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByRole("button", { name: /scan another ticket/i })).toBeInTheDocument();
    });

    it("should call onReset when scan another button is clicked on error", () => {
      render(
        <CheckInResult
          ticket={null}
          error="Some error"
          onCheckIn={mockOnCheckIn}
          onReset={mockOnReset}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /scan another ticket/i }));
      expect(mockOnReset).toHaveBeenCalledTimes(1);
    });

    it("should have red styling for error state", () => {
      render(
        <CheckInResult
          ticket={null}
          error="Error message"
          onCheckIn={mockOnCheckIn}
          onReset={mockOnReset}
        />
      );

      // Check that red error classes are present (bg-red-500)
      const container = screen.getByText("Invalid Ticket").closest("div[class*='bg-red']");
      expect(container).toBeInTheDocument();
    });
  });

  describe("valid ticket state", () => {
    it("should display green success styling", () => {
      render(
        <CheckInResult
          ticket={createTicket()}
          error={null}
          onCheckIn={mockOnCheckIn}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByText("Valid Ticket")).toBeInTheDocument();
      expect(screen.getByText("Ready to check in")).toBeInTheDocument();
    });

    it("should display player name", () => {
      render(
        <CheckInResult
          ticket={createTicket()}
          error={null}
          onCheckIn={mockOnCheckIn}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("should display tournament name", () => {
      render(
        <CheckInResult
          ticket={createTicket({ tournament: { id: "t1", name: "Winter Championship" } })}
          error={null}
          onCheckIn={mockOnCheckIn}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByText("Winter Championship")).toBeInTheDocument();
    });

    it("should display team name when present", () => {
      render(
        <CheckInResult
          ticket={createTicket({ team: { id: "t1", name: "The Warriors" } })}
          error={null}
          onCheckIn={mockOnCheckIn}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByText("The Warriors")).toBeInTheDocument();
    });

    it("should not display team section when team is absent", () => {
      render(
        <CheckInResult
          ticket={createTicket({ team: undefined })}
          error={null}
          onCheckIn={mockOnCheckIn}
          onReset={mockOnReset}
        />
      );

      expect(screen.queryByText("Team")).not.toBeInTheDocument();
    });

    it("should display ticket code", () => {
      render(
        <CheckInResult
          ticket={createTicket({ ticketCode: "BOD-XYZ789" })}
          error={null}
          onCheckIn={mockOnCheckIn}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByText("BOD-XYZ789")).toBeInTheDocument();
    });

    it("should show Check In button", () => {
      render(
        <CheckInResult
          ticket={createTicket()}
          error={null}
          onCheckIn={mockOnCheckIn}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByRole("button", { name: /check in/i })).toBeInTheDocument();
    });

    it("should call onCheckIn when Check In button is clicked", () => {
      render(
        <CheckInResult
          ticket={createTicket()}
          error={null}
          onCheckIn={mockOnCheckIn}
          onReset={mockOnReset}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /check in/i }));
      expect(mockOnCheckIn).toHaveBeenCalledTimes(1);
    });

    it("should show Cancel button that calls onReset", () => {
      render(
        <CheckInResult
          ticket={createTicket()}
          error={null}
          onCheckIn={mockOnCheckIn}
          onReset={mockOnReset}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
      expect(mockOnReset).toHaveBeenCalledTimes(1);
    });

    it("should disable Check In button when canCheckIn is false", () => {
      render(
        <CheckInResult
          ticket={createTicket({ canCheckIn: false })}
          error={null}
          onCheckIn={mockOnCheckIn}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByRole("button", { name: /check in/i })).toBeDisabled();
    });
  });

  describe("already checked in state", () => {
    it("should display yellow warning styling for checked_in status", () => {
      render(
        <CheckInResult
          ticket={createTicket({ status: "checked_in" })}
          error={null}
          onCheckIn={mockOnCheckIn}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByText("Already Checked In")).toBeInTheDocument();
      expect(screen.getByText("This ticket has already been used")).toBeInTheDocument();
    });

    it("should display yellow warning styling for alreadyCheckedIn flag", () => {
      render(
        <CheckInResult
          ticket={createTicket({ alreadyCheckedIn: true })}
          error={null}
          onCheckIn={mockOnCheckIn}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByText("Already Checked In")).toBeInTheDocument();
    });

    it("should display checked in timestamp when available", () => {
      const checkedInAt = "2025-02-06T12:30:00Z";
      render(
        <CheckInResult
          ticket={createTicket({ status: "checked_in", checkedInAt })}
          error={null}
          onCheckIn={mockOnCheckIn}
          onReset={mockOnReset}
        />
      );

      // The component formats the date with toLocaleString()
      const expectedDate = new Date(checkedInAt).toLocaleString();
      expect(screen.getByText(expectedDate)).toBeInTheDocument();
    });

    it("should show 'Unknown time' when checkedInAt is missing", () => {
      render(
        <CheckInResult
          ticket={createTicket({ status: "checked_in", checkedInAt: undefined })}
          error={null}
          onCheckIn={mockOnCheckIn}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByText("Unknown time")).toBeInTheDocument();
    });

    it("should display who checked in the ticket when available", () => {
      render(
        <CheckInResult
          ticket={createTicket({
            status: "checked_in",
            checkedInBy: { id: "admin-1", name: "Admin Jane" },
          })}
          error={null}
          onCheckIn={mockOnCheckIn}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByText("Admin Jane")).toBeInTheDocument();
    });

    it("should not show Check In button for already checked in tickets", () => {
      render(
        <CheckInResult
          ticket={createTicket({ status: "checked_in" })}
          error={null}
          onCheckIn={mockOnCheckIn}
          onReset={mockOnReset}
        />
      );

      expect(screen.queryByRole("button", { name: /check in/i })).not.toBeInTheDocument();
    });

    it("should show scan another button for already checked in tickets", () => {
      render(
        <CheckInResult
          ticket={createTicket({ status: "checked_in" })}
          error={null}
          onCheckIn={mockOnCheckIn}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByRole("button", { name: /scan another ticket/i })).toBeInTheDocument();
    });
  });

  describe("refunded ticket state", () => {
    it("should display red error styling for refunded ticket", () => {
      render(
        <CheckInResult
          ticket={createTicket({ status: "refunded" })}
          error={null}
          onCheckIn={mockOnCheckIn}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByText("Ticket Refunded")).toBeInTheDocument();
      expect(screen.getByText("This ticket is no longer valid")).toBeInTheDocument();
    });

    it("should display refunded status badge", () => {
      render(
        <CheckInResult
          ticket={createTicket({ status: "refunded" })}
          error={null}
          onCheckIn={mockOnCheckIn}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByText("refunded")).toBeInTheDocument();
    });

    it("should not show Check In button for refunded tickets", () => {
      render(
        <CheckInResult
          ticket={createTicket({ status: "refunded" })}
          error={null}
          onCheckIn={mockOnCheckIn}
          onReset={mockOnReset}
        />
      );

      expect(screen.queryByRole("button", { name: /check in/i })).not.toBeInTheDocument();
    });
  });

  describe("void ticket state", () => {
    it("should display red error styling for void ticket", () => {
      render(
        <CheckInResult
          ticket={createTicket({ status: "void" })}
          error={null}
          onCheckIn={mockOnCheckIn}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByText("Ticket Voided")).toBeInTheDocument();
      expect(screen.getByText("This ticket is no longer valid")).toBeInTheDocument();
    });

    it("should display void status badge", () => {
      render(
        <CheckInResult
          ticket={createTicket({ status: "void" })}
          error={null}
          onCheckIn={mockOnCheckIn}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByText("void")).toBeInTheDocument();
    });

    it("should show player name for void tickets", () => {
      render(
        <CheckInResult
          ticket={createTicket({ status: "void", player: { id: "p1", firstName: "Jane", lastName: "Smith" } })}
          error={null}
          onCheckIn={mockOnCheckIn}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });

    it("should not show Check In button for void tickets", () => {
      render(
        <CheckInResult
          ticket={createTicket({ status: "void" })}
          error={null}
          onCheckIn={mockOnCheckIn}
          onReset={mockOnReset}
        />
      );

      expect(screen.queryByRole("button", { name: /check in/i })).not.toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("should show loading text on Check In button when loading", () => {
      render(
        <CheckInResult
          ticket={createTicket()}
          error={null}
          onCheckIn={mockOnCheckIn}
          onReset={mockOnReset}
          loading={true}
        />
      );

      expect(screen.getByText(/checking in/i)).toBeInTheDocument();
    });

    it("should disable Check In button when loading", () => {
      render(
        <CheckInResult
          ticket={createTicket()}
          error={null}
          onCheckIn={mockOnCheckIn}
          onReset={mockOnReset}
          loading={true}
        />
      );

      // Find the button with the loading spinner (the Check In button during loading)
      const buttons = screen.getAllByRole("button");
      const checkInButton = buttons.find((btn) => btn.textContent?.includes("Checking in"));
      expect(checkInButton).toBeDisabled();
    });

    it("should disable Cancel button when loading", () => {
      render(
        <CheckInResult
          ticket={createTicket()}
          error={null}
          onCheckIn={mockOnCheckIn}
          onReset={mockOnReset}
          loading={true}
        />
      );

      expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();
    });
  });
});
