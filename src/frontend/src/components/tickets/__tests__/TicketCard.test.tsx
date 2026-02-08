import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { BrowserRouter } from "react-router-dom";
import TicketCard, { TicketData } from "../TicketCard";

// Wrap component with router for Link components
const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

const createMockTicket = (overrides: Partial<TicketData> = {}): TicketData => ({
  id: "ticket-123",
  ticketCode: "BOD-ABC123",
  tournament: {
    id: "tournament-456",
    name: "Test Tournament 2024",
    date: "2024-03-15T10:00:00Z",
    location: "Main Arena",
  },
  status: "valid",
  paymentStatus: "paid",
  amountPaid: 2500, // $25.00 in cents
  createdAt: "2024-03-01T12:00:00Z",
  ...overrides,
});

describe("TicketCard", () => {
  describe("ticket info rendering", () => {
    it("should render tournament name", () => {
      const ticket = createMockTicket();
      renderWithRouter(<TicketCard ticket={ticket} />);

      expect(screen.getByText("Test Tournament 2024")).toBeInTheDocument();
    });

    it("should render ticket code", () => {
      const ticket = createMockTicket({ ticketCode: "BOD-XYZ789" });
      renderWithRouter(<TicketCard ticket={ticket} />);

      expect(screen.getByText("BOD-XYZ789")).toBeInTheDocument();
    });

    it("should render tournament date in readable format", () => {
      const ticket = createMockTicket({
        tournament: {
          id: "t1",
          name: "Test",
          date: "2024-03-15T10:00:00Z",
        },
      });
      renderWithRouter(<TicketCard ticket={ticket} />);

      // Should format as "Fri, Mar 15, 2024" or similar
      expect(screen.getByText(/Mar.*15.*2024/)).toBeInTheDocument();
    });

    it("should render tournament location when provided", () => {
      const ticket = createMockTicket({
        tournament: {
          id: "t1",
          name: "Test",
          date: "2024-03-15T10:00:00Z",
          location: "Downtown Convention Center",
        },
      });
      renderWithRouter(<TicketCard ticket={ticket} />);

      expect(screen.getByText("Downtown Convention Center")).toBeInTheDocument();
    });

    it("should not render location when not provided", () => {
      const ticket = createMockTicket({
        tournament: {
          id: "t1",
          name: "Test",
          date: "2024-03-15T10:00:00Z",
          location: undefined,
        },
      });
      renderWithRouter(<TicketCard ticket={ticket} />);

      // Should not have location_on icon's associated text
      expect(screen.queryByText("Downtown Convention Center")).not.toBeInTheDocument();
    });

    it("should render amount paid in dollars", () => {
      const ticket = createMockTicket({ amountPaid: 5000 }); // $50.00
      renderWithRouter(<TicketCard ticket={ticket} />);

      expect(screen.getByText("$50.00")).toBeInTheDocument();
    });

    it("should show Free Entry for free tickets", () => {
      const ticket = createMockTicket({ paymentStatus: "free", amountPaid: 0 });
      renderWithRouter(<TicketCard ticket={ticket} />);

      expect(screen.getByText("Free Entry")).toBeInTheDocument();
    });

    it("should show purchase date when not checked in", () => {
      const ticket = createMockTicket({
        createdAt: "2024-02-20T10:00:00Z",
        checkedInAt: undefined,
      });
      renderWithRouter(<TicketCard ticket={ticket} />);

      expect(screen.getByText(/Purchased.*Feb.*20.*2024/)).toBeInTheDocument();
    });

    it("should show checked in date when checked in", () => {
      const ticket = createMockTicket({
        status: "checked_in",
        checkedInAt: "2024-03-15T09:30:00Z",
      });
      renderWithRouter(<TicketCard ticket={ticket} />);

      expect(screen.getByText(/Checked in.*Mar.*15.*2024/)).toBeInTheDocument();
    });
  });

  describe("QR code display", () => {
    it("should show QR code by default", () => {
      const ticket = createMockTicket();
      const { container } = renderWithRouter(<TicketCard ticket={ticket} />);

      // Look for the QR icon
      expect(container.querySelector(".material-symbols-outlined")).toBeTruthy();
      expect(screen.getByText("qr_code_2")).toBeInTheDocument();
    });

    it("should hide QR code when showQR is false", () => {
      const ticket = createMockTicket();
      renderWithRouter(<TicketCard ticket={ticket} showQR={false} />);

      expect(screen.queryByText("qr_code_2")).not.toBeInTheDocument();
    });
  });

  describe("status badges", () => {
    it("should show Valid badge for valid tickets", () => {
      const ticket = createMockTicket({ status: "valid" });
      renderWithRouter(<TicketCard ticket={ticket} />);

      const badge = screen.getByText("Valid");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass("text-green-500");
    });

    it("should show Checked In badge for checked in tickets", () => {
      const ticket = createMockTicket({ status: "checked_in" });
      renderWithRouter(<TicketCard ticket={ticket} />);

      const badge = screen.getByText("Checked In");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass("text-blue-500");
    });

    it("should show Refunded badge for refunded tickets", () => {
      const ticket = createMockTicket({ status: "refunded" });
      renderWithRouter(<TicketCard ticket={ticket} />);

      const badge = screen.getByText("Refunded");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass("text-yellow-500");
    });

    it("should show Void badge for void tickets", () => {
      const ticket = createMockTicket({ status: "void" });
      renderWithRouter(<TicketCard ticket={ticket} />);

      const badge = screen.getByText("Void");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass("text-red-500");
    });
  });

  describe("Resend button", () => {
    it("should show Resend button when onResend is provided and ticket is valid", () => {
      const ticket = createMockTicket({ status: "valid" });
      const onResend = vi.fn();
      renderWithRouter(<TicketCard ticket={ticket} onResend={onResend} />);

      expect(screen.getByText("Resend")).toBeInTheDocument();
    });

    it("should call onResend with ticket id when clicked", () => {
      const ticket = createMockTicket({ id: "ticket-abc", status: "valid" });
      const onResend = vi.fn();
      renderWithRouter(<TicketCard ticket={ticket} onResend={onResend} />);

      const resendButton = screen.getByText("Resend");
      fireEvent.click(resendButton);

      expect(onResend).toHaveBeenCalledWith("ticket-abc");
    });

    it("should not show Resend button when onResend is not provided", () => {
      const ticket = createMockTicket({ status: "valid" });
      renderWithRouter(<TicketCard ticket={ticket} />);

      expect(screen.queryByText("Resend")).not.toBeInTheDocument();
    });

    it("should not show Resend button for checked_in tickets", () => {
      const ticket = createMockTicket({ status: "checked_in" });
      const onResend = vi.fn();
      renderWithRouter(<TicketCard ticket={ticket} onResend={onResend} />);

      expect(screen.queryByText("Resend")).not.toBeInTheDocument();
    });

    it("should not show Resend button for refunded tickets", () => {
      const ticket = createMockTicket({ status: "refunded" });
      const onResend = vi.fn();
      renderWithRouter(<TicketCard ticket={ticket} onResend={onResend} />);

      expect(screen.queryByText("Resend")).not.toBeInTheDocument();
    });

    it("should not show Resend button for void tickets", () => {
      const ticket = createMockTicket({ status: "void" });
      const onResend = vi.fn();
      renderWithRouter(<TicketCard ticket={ticket} onResend={onResend} />);

      expect(screen.queryByText("Resend")).not.toBeInTheDocument();
    });
  });

  describe("navigation links", () => {
    it("should link tournament name to tournament page", () => {
      const ticket = createMockTicket({
        tournament: {
          id: "tournament-xyz",
          name: "Linked Tournament",
          date: "2024-03-15T10:00:00Z",
        },
      });
      renderWithRouter(<TicketCard ticket={ticket} />);

      const link = screen.getByText("Linked Tournament");
      expect(link.closest("a")).toHaveAttribute("href", "/tournaments/tournament-xyz");
    });

    it("should have View link that includes ticket id", () => {
      const ticket = createMockTicket({ id: "ticket-view-test" });
      renderWithRouter(<TicketCard ticket={ticket} />);

      const viewLink = screen.getByText("View");
      expect(viewLink.closest("a")).toHaveAttribute("href", "/profile?ticket=ticket-view-test");
    });
  });
});
