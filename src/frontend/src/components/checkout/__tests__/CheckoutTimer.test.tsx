import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CheckoutTimer } from "../CheckoutTimer";

describe("CheckoutTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("countdown display", () => {
    it("should display time in MM:SS format", () => {
      // Set expiration 5 minutes from now
      const now = new Date("2024-01-01T12:00:00Z");
      vi.setSystemTime(now);
      
      const expiresAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
      render(<CheckoutTimer expiresAt={expiresAt} />);

      expect(screen.getByText("05:00")).toBeInTheDocument();
    });

    it("should decrement countdown every second", () => {
      const now = new Date("2024-01-01T12:00:00Z");
      vi.setSystemTime(now);
      
      const expiresAt = new Date(now.getTime() + 65 * 1000).toISOString(); // 65 seconds
      render(<CheckoutTimer expiresAt={expiresAt} />);

      expect(screen.getByText("01:05")).toBeInTheDocument();

      // Advance 1 second
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByText("01:04")).toBeInTheDocument();

      // Advance another second
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByText("01:03")).toBeInTheDocument();
    });

    it("should pad single digit seconds with zero", () => {
      const now = new Date("2024-01-01T12:00:00Z");
      vi.setSystemTime(now);
      
      const expiresAt = new Date(now.getTime() + 9 * 1000).toISOString(); // 9 seconds
      render(<CheckoutTimer expiresAt={expiresAt} />);

      expect(screen.getByText("00:09")).toBeInTheDocument();
    });
  });

  describe("alert styling", () => {
    it("should show info style when more than 5 minutes remain", () => {
      const now = new Date("2024-01-01T12:00:00Z");
      vi.setSystemTime(now);
      
      const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString(); // 10 minutes
      const { container } = render(<CheckoutTimer expiresAt={expiresAt} />);

      const alert = container.querySelector(".alert");
      expect(alert).toHaveClass("alert-info");
    });

    it("should show warning style when less than 5 minutes remain", () => {
      const now = new Date("2024-01-01T12:00:00Z");
      vi.setSystemTime(now);
      
      const expiresAt = new Date(now.getTime() + 4 * 60 * 1000).toISOString(); // 4 minutes (240 seconds)
      const { container } = render(<CheckoutTimer expiresAt={expiresAt} />);

      const alert = container.querySelector(".alert");
      expect(alert).toHaveClass("alert-warning");
    });

    it("should show danger style when less than 1 minute remains", () => {
      const now = new Date("2024-01-01T12:00:00Z");
      vi.setSystemTime(now);
      
      const expiresAt = new Date(now.getTime() + 45 * 1000).toISOString(); // 45 seconds
      const { container } = render(<CheckoutTimer expiresAt={expiresAt} />);

      const alert = container.querySelector(".alert");
      expect(alert).toHaveClass("alert-error");
    });

    it("should transition from warning to danger as time decreases", () => {
      const now = new Date("2024-01-01T12:00:00Z");
      vi.setSystemTime(now);
      
      // Start at 61 seconds (warning territory)
      const expiresAt = new Date(now.getTime() + 61 * 1000).toISOString();
      const { container } = render(<CheckoutTimer expiresAt={expiresAt} />);

      let alert = container.querySelector(".alert");
      expect(alert).toHaveClass("alert-warning");

      // Advance past 60 seconds threshold
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      alert = container.querySelector(".alert");
      expect(alert).toHaveClass("alert-error");
    });
  });

  describe("expiration behavior", () => {
    it("should call onExpire callback when timer reaches zero", () => {
      const now = new Date("2024-01-01T12:00:00Z");
      vi.setSystemTime(now);
      
      const onExpire = vi.fn();
      const expiresAt = new Date(now.getTime() + 2 * 1000).toISOString(); // 2 seconds
      render(<CheckoutTimer expiresAt={expiresAt} onExpire={onExpire} />);

      expect(onExpire).not.toHaveBeenCalled();

      // Advance to expiration
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(onExpire).toHaveBeenCalledTimes(1);
    });

    it("should only call onExpire once", () => {
      const now = new Date("2024-01-01T12:00:00Z");
      vi.setSystemTime(now);
      
      const onExpire = vi.fn();
      const expiresAt = new Date(now.getTime() + 1 * 1000).toISOString(); // 1 second
      render(<CheckoutTimer expiresAt={expiresAt} onExpire={onExpire} />);

      // Advance past expiration
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(onExpire).toHaveBeenCalledTimes(1);
    });

    it("should display expired state when timer expires", () => {
      const now = new Date("2024-01-01T12:00:00Z");
      vi.setSystemTime(now);
      
      const expiresAt = new Date(now.getTime() + 1 * 1000).toISOString(); // 1 second
      render(<CheckoutTimer expiresAt={expiresAt} />);

      // Advance to expiration
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByText("Reservation Expired")).toBeInTheDocument();
      expect(screen.getByText(/Your spot has been released/)).toBeInTheDocument();
    });

    it("should handle already expired time gracefully", () => {
      const now = new Date("2024-01-01T12:00:00Z");
      vi.setSystemTime(now);
      
      // Set expiration in the past
      const expiresAt = new Date(now.getTime() - 5 * 1000).toISOString();
      const onExpire = vi.fn();
      render(<CheckoutTimer expiresAt={expiresAt} onExpire={onExpire} />);

      // Should immediately show 00:00 and trigger expire
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(onExpire).toHaveBeenCalled();
    });
  });

  describe("urgency messages", () => {
    it("should show urgency message when under 5 minutes", () => {
      const now = new Date("2024-01-01T12:00:00Z");
      vi.setSystemTime(now);
      
      const expiresAt = new Date(now.getTime() + 3 * 60 * 1000).toISOString(); // 3 minutes
      render(<CheckoutTimer expiresAt={expiresAt} />);

      expect(screen.getByText(/Your spot is reserved until the timer runs out/)).toBeInTheDocument();
    });

    it("should show hurry message when under 1 minute", () => {
      const now = new Date("2024-01-01T12:00:00Z");
      vi.setSystemTime(now);
      
      const expiresAt = new Date(now.getTime() + 30 * 1000).toISOString(); // 30 seconds
      render(<CheckoutTimer expiresAt={expiresAt} />);

      expect(screen.getByText(/Hurry! Your spot will be released soon/)).toBeInTheDocument();
    });

    it("should not show urgency message when more than 5 minutes remain", () => {
      const now = new Date("2024-01-01T12:00:00Z");
      vi.setSystemTime(now);
      
      const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString(); // 10 minutes
      render(<CheckoutTimer expiresAt={expiresAt} />);

      expect(screen.queryByText(/Your spot is reserved/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Hurry!/)).not.toBeInTheDocument();
    });
  });
});
