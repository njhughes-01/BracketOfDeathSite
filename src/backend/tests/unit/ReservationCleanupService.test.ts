import ReservationCleanupService from "../../services/ReservationCleanupService";
import SlotReservation from "../../models/SlotReservation";
import TournamentInvitation from "../../models/TournamentInvitation";
import { Tournament } from "../../models/Tournament";

jest.mock("../../models/SlotReservation");
jest.mock("../../models/TournamentInvitation");
jest.mock("../../models/Tournament");
jest.mock("../../utils/logger");

describe("ReservationCleanupService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    ReservationCleanupService.stopCleanupService();
  });

  describe("cleanupExpiredReservations", () => {
    it("should return 0 when no expired reservations", async () => {
      (SlotReservation.find as jest.Mock).mockResolvedValue([]);
      const count = await ReservationCleanupService.cleanupExpiredReservations();
      expect(count).toBe(0);
    });

    it("should expire reservations and decrement tournament spots", async () => {
      const tid1 = "tournament1";
      const tid2 = "tournament2";
      (SlotReservation.find as jest.Mock).mockResolvedValue([
        { tournamentId: { toString: () => tid1 } },
        { tournamentId: { toString: () => tid1 } },
        { tournamentId: { toString: () => tid2 } },
      ]);
      (SlotReservation.expireStaleReservations as jest.Mock).mockResolvedValue(3);
      (Tournament.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

      const count = await ReservationCleanupService.cleanupExpiredReservations();
      expect(count).toBe(3);
      expect(Tournament.findByIdAndUpdate).toHaveBeenCalledWith(tid1, { $inc: { spotsReserved: -2 } });
      expect(Tournament.findByIdAndUpdate).toHaveBeenCalledWith(tid2, { $inc: { spotsReserved: -1 } });
    });

    it("should handle errors gracefully and return 0", async () => {
      (SlotReservation.find as jest.Mock).mockRejectedValue(new Error("DB error"));
      const count = await ReservationCleanupService.cleanupExpiredReservations();
      expect(count).toBe(0);
    });
  });

  describe("cleanupExpiredInvitations", () => {
    it("should clean up expired invitations", async () => {
      (TournamentInvitation.expireStaleInvitations as jest.Mock).mockResolvedValue(5);
      const count = await ReservationCleanupService.cleanupExpiredInvitations();
      expect(count).toBe(5);
    });

    it("should handle errors gracefully", async () => {
      (TournamentInvitation.expireStaleInvitations as jest.Mock).mockRejectedValue(new Error("DB error"));
      const count = await ReservationCleanupService.cleanupExpiredInvitations();
      expect(count).toBe(0);
    });
  });

  describe("startCleanupService / stopCleanupService", () => {
    it("should start and stop without error", () => {
      jest.useFakeTimers();
      (SlotReservation.find as jest.Mock).mockResolvedValue([]);
      (TournamentInvitation.expireStaleInvitations as jest.Mock).mockResolvedValue(0);
      
      ReservationCleanupService.startCleanupService();
      // Starting again should warn but not crash
      ReservationCleanupService.startCleanupService();
      ReservationCleanupService.stopCleanupService();
      // Stopping again should be safe
      ReservationCleanupService.stopCleanupService();
      jest.useRealTimers();
    });
  });
});
