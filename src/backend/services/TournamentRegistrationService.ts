import { Types } from "mongoose";
import { Tournament } from "../models/Tournament";
import { Player } from "../models/Player";
import { ITournament } from "../types/tournament";
import { emailService } from "./EmailService";

export interface RegistrationResult {
  success: boolean;
  message: string;
  position?: "registered" | "waitlist";
  tournament?: ITournament;
}

export class TournamentRegistrationService {
  /**
   * Register a player for a tournament
   */
  static async registerPlayer(
    tournamentId: string,
    playerId: string,
  ): Promise<RegistrationResult> {
    try {
      const tournament = await Tournament.findById(tournamentId);
      if (!tournament) {
        return { success: false, message: "Tournament not found" };
      }

      // Check if registration is allowed
      if (!tournament.allowSelfRegistration) {
        return {
          success: false,
          message: "Self-registration not allowed for this tournament",
        };
      }

      // Check registration status
      const registrationStatus = tournament.registrationStatus;
      if (registrationStatus === "pending") {
        return { success: false, message: "Registration has not opened yet" };
      }
      if (registrationStatus === "closed") {
        return { success: false, message: "Registration deadline has passed" };
      }

      // Check if player exists
      const player = await Player.findById(playerId);
      if (!player) {
        return { success: false, message: "Player not found" };
      }

      const playerObjectId = new Types.ObjectId(playerId);
      const now = new Date();
      const registeredCountExpr = {
        $size: { $ifNull: ["$registeredPlayers", []] },
      };
      const maxPlayersExpr = {
        $ifNull: ["$maxPlayers", 64],
      };

      const registeredTournament = await Tournament.findOneAndUpdateSafe(
        {
          _id: tournamentId,
          "registeredPlayers.playerId": { $ne: playerObjectId },
          "waitlistPlayers.playerId": { $ne: playerObjectId },
          $expr: {
            $lt: [registeredCountExpr, maxPlayersExpr],
          },
        },
        {
          $push: {
            registeredPlayers: { playerId: playerObjectId, registeredAt: now },
          },
        },
      );

      if (registeredTournament) {
        this.sendRegistrationEmail(player, registeredTournament);
        return {
          success: true,
          message: "Successfully registered for tournament",
          position: "registered",
          tournament: registeredTournament,
        };
      }

      const waitlistTournament = await Tournament.findOneAndUpdateSafe(
        {
          _id: tournamentId,
          "registeredPlayers.playerId": { $ne: playerObjectId },
          "waitlistPlayers.playerId": { $ne: playerObjectId },
          $expr: {
            $gte: [registeredCountExpr, maxPlayersExpr],
          },
        },
        {
          $push: {
            waitlistPlayers: { playerId: playerObjectId, registeredAt: now },
          },
        },
      );

      if (waitlistTournament) {
        const waitlistPosition = waitlistTournament.waitlistPlayers?.length || 1;
        this.sendWaitlistEmail(player, waitlistTournament, waitlistPosition);
        return {
          success: true,
          message: "Tournament is full, added to waitlist",
          position: "waitlist",
          tournament: waitlistTournament,
        };
      }

      const refreshedTournament = await Tournament.findById(tournamentId);
      if (!refreshedTournament) {
        return { success: false, message: "Tournament not found" };
      }

      const isAlreadyRegistered = refreshedTournament.registeredPlayers?.some(
        (p) => p.playerId.toString() === playerId,
      );
      const isOnWaitlist = refreshedTournament.waitlistPlayers?.some(
        (p) => p.playerId.toString() === playerId,
      );

      if (isAlreadyRegistered) {
        return { success: false, message: "Player already registered" };
      }
      if (isOnWaitlist) {
        return { success: false, message: "Player already on waitlist" };
      }

      return { success: false, message: "Registration failed" };
    } catch (error) {
      console.error("Registration error:", error);
      return { success: false, message: "Registration failed" };
    }
  }

  /**
   * Unregister a player from a tournament
   */
  static async unregisterPlayer(
    tournamentId: string,
    playerId: string,
  ): Promise<RegistrationResult> {
    try {
      const tournament = await Tournament.findById(tournamentId);
      if (!tournament) {
        return { success: false, message: "Tournament not found" };
      }

      // Check if tournament allows unregistration
      if (tournament.status === "active" || tournament.status === "completed") {
        return {
          success: false,
          message: "Cannot unregister from active or completed tournament",
        };
      }

      const playerObjectId = new Types.ObjectId(playerId);
      const registeredUpdatePipeline = [
        {
          $set: {
            registeredPlayers: {
              $filter: {
                input: { $ifNull: ["$registeredPlayers", []] },
                as: "player",
                cond: { $ne: ["$$player.playerId", playerObjectId] },
              },
            },
            waitlistPlayers: { $ifNull: ["$waitlistPlayers", []] },
          },
        },
        {
          $set: {
            promotedPlayer: { $arrayElemAt: ["$waitlistPlayers", 0] },
            waitlistPlayers: {
              $slice: [
                "$waitlistPlayers",
                1,
                { $size: "$waitlistPlayers" },
              ],
            },
          },
        },
        {
          $set: {
            registeredPlayers: {
              $cond: [
                { $ne: ["$promotedPlayer", null] },
                { $concatArrays: ["$registeredPlayers", ["$promotedPlayer"]] },
                "$registeredPlayers",
              ],
            },
          },
        },
        { $unset: "promotedPlayer" },
      ];

      const updatedRegisteredTournament =
        await Tournament.findOneAndUpdateSafe(
          {
            _id: tournamentId,
            "registeredPlayers.playerId": playerObjectId,
          },
          registeredUpdatePipeline,
        );

      if (updatedRegisteredTournament) {
        this.notifyPromotedPlayer(tournament, updatedRegisteredTournament);
        return {
          success: true,
          message: "Successfully unregistered from tournament",
          tournament: updatedRegisteredTournament,
        };
      }

      const updatedWaitlistTournament =
        await Tournament.findOneAndUpdateSafe(
          {
            _id: tournamentId,
            "waitlistPlayers.playerId": playerObjectId,
          },
          {
            $pull: { waitlistPlayers: { playerId: playerObjectId } },
          },
        );

      if (updatedWaitlistTournament) {
        return {
          success: true,
          message: "Removed from tournament waitlist",
          tournament: updatedWaitlistTournament,
        };
      }

      return {
        success: false,
        message: "Player was not registered for this tournament",
      };
    } catch (error) {
      console.error("Unregistration error:", error);
      return { success: false, message: "Unregistration failed" };
    }
  }

  /**
   * Move registered players to main players array and generate bracket
   */
  static async finalizeRegistration(
    tournamentId: string,
  ): Promise<RegistrationResult> {
    try {
      const tournament = await Tournament.findById(tournamentId).populate(
        "registeredPlayers",
        "name",
      );
      if (!tournament) {
        return { success: false, message: "Tournament not found" };
      }

      if (tournament.status !== "open") {
        return {
          success: false,
          message: "Tournament must be open to finalize registration",
        };
      }

      const registeredCount = tournament.registeredPlayers?.length || 0;
      if (registeredCount < 2) {
        return {
          success: false,
          message: "Need at least 2 players to finalize tournament",
        };
      }

      // Move registered players to main players array
      tournament.players = (tournament.registeredPlayers || []).map(
        (rp) => rp.playerId,
      );

      // Update status to ready for bracket generation
      // Note: Bracket generation will be handled separately by admin
      await tournament.save();

      return {
        success: true,
        message: `Registration finalized with ${registeredCount} players`,
        tournament,
      };
    } catch (error) {
      console.error("Finalization error:", error);
      return { success: false, message: "Registration finalization failed" };
    }
  }

  /**
   * Get registration info for a tournament
   */
  static async getRegistrationInfo(tournamentId: string) {
    try {
      const tournament = await Tournament.findById(tournamentId)
        .populate("registeredPlayers", "name firstName lastName")
        .populate("waitlistPlayers", "name firstName lastName");

      if (!tournament) {
        return { success: false, message: "Tournament not found" };
      }

      return {
        success: true,
        data: {
          tournament,
          registrationStatus: tournament.registrationStatus,
          registeredCount: tournament.registeredPlayerCount,
          waitlistCount: tournament.waitlistCount,
          maxPlayers: tournament.maxPlayers,
          isRegistrationOpen: tournament.isRegistrationOpen,
          canRegister:
            tournament.allowSelfRegistration && tournament.isRegistrationOpen,
        },
      };
    } catch (error) {
      console.error("Get registration info error:", error);
      return { success: false, message: "Failed to get registration info" };
    }
  }

  private static sendRegistrationEmail(
    player: { email?: string; name: string },
    tournament: ITournament,
  ): void {
    if (!player.email) return;
    emailService
      .sendRegistrationConfirmation(
        player.email,
        player.name,
        tournament.location || `BOD #${tournament.bodNumber}`,
        tournament.date,
      )
      .catch((err) => console.error("Failed to send registration email:", err));
  }

  private static sendWaitlistEmail(
    player: { email?: string; name: string },
    tournament: ITournament,
    position: number,
  ): void {
    if (!player.email) return;
    emailService
      .sendWaitlistConfirmation(
        player.email,
        player.name,
        tournament.location || `BOD #${tournament.bodNumber}`,
        position,
      )
      .catch((err) => console.error("Failed to send waitlist email:", err));
  }

  private static async notifyPromotedPlayer(
    beforeTournament: ITournament,
    afterTournament: ITournament,
  ): Promise<void> {
    const beforeWaitlist = beforeTournament.waitlistPlayers || [];
    const afterWaitlist = afterTournament.waitlistPlayers || [];

    if (beforeWaitlist.length > afterWaitlist.length) {
      const promotedPlayerId = beforeWaitlist[0]?.playerId;
      if (!promotedPlayerId) return;

      const promotedPlayer = await Player.findById(promotedPlayerId);
      if (!promotedPlayer?.email) return;

      emailService
        .sendSpotAvailableNotification(
          promotedPlayer.email,
          promotedPlayer.name,
          afterTournament.location || `BOD #${afterTournament.bodNumber}`,
        )
        .catch((err) =>
          console.error("Failed to send spot available email:", err),
        );
    }
  }
}

export default TournamentRegistrationService;
