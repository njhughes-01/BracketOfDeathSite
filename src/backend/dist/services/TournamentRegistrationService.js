"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TournamentRegistrationService = void 0;
const mongoose_1 = require("mongoose");
const Tournament_1 = require("../models/Tournament");
const Player_1 = require("../models/Player");
class TournamentRegistrationService {
    /**
     * Register a player for a tournament
     */
    static async registerPlayer(tournamentId, playerId) {
        try {
            const tournament = await Tournament_1.Tournament.findById(tournamentId);
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
            const player = await Player_1.Player.findById(playerId);
            if (!player) {
                return { success: false, message: "Player not found" };
            }
            // Check if already registered
            const playerObjectId = new mongoose_1.Types.ObjectId(playerId);
            const isAlreadyRegistered = tournament.registeredPlayers?.some((p) => p.playerId.toString() === playerId);
            const isOnWaitlist = tournament.waitlistPlayers?.some((p) => p.playerId.toString() === playerId);
            if (isAlreadyRegistered) {
                return { success: false, message: "Player already registered" };
            }
            if (isOnWaitlist) {
                return { success: false, message: "Player already on waitlist" };
            }
            // Check capacity
            const currentRegistered = tournament.registeredPlayers?.length || 0;
            const maxPlayers = tournament.maxPlayers || 64;
            if (currentRegistered < maxPlayers) {
                // Add to registered players
                tournament.registeredPlayers = tournament.registeredPlayers || [];
                tournament.registeredPlayers.push({
                    playerId: playerObjectId,
                    registeredAt: new Date(),
                });
                await tournament.save();
                return {
                    success: true,
                    message: "Successfully registered for tournament",
                    position: "registered",
                    tournament,
                };
            }
            else {
                // Add to waitlist
                tournament.waitlistPlayers = tournament.waitlistPlayers || [];
                tournament.waitlistPlayers.push({
                    playerId: playerObjectId,
                    registeredAt: new Date(),
                });
                await tournament.save();
                return {
                    success: true,
                    message: "Tournament is full, added to waitlist",
                    position: "waitlist",
                    tournament,
                };
            }
        }
        catch (error) {
            console.error("Registration error:", error);
            return { success: false, message: "Registration failed" };
        }
    }
    /**
     * Unregister a player from a tournament
     */
    static async unregisterPlayer(tournamentId, playerId) {
        try {
            const tournament = await Tournament_1.Tournament.findById(tournamentId);
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
            let wasRegistered = false;
            let wasOnWaitlist = false;
            // Remove from registered players
            if (tournament.registeredPlayers) {
                const registeredIndex = tournament.registeredPlayers.findIndex((p) => p.playerId.toString() === playerId);
                if (registeredIndex !== -1) {
                    tournament.registeredPlayers.splice(registeredIndex, 1);
                    wasRegistered = true;
                }
            }
            // Remove from waitlist
            if (tournament.waitlistPlayers) {
                const waitlistIndex = tournament.waitlistPlayers.findIndex((p) => p.playerId.toString() === playerId);
                if (waitlistIndex !== -1) {
                    tournament.waitlistPlayers.splice(waitlistIndex, 1);
                    wasOnWaitlist = true;
                }
            }
            if (!wasRegistered && !wasOnWaitlist) {
                return {
                    success: false,
                    message: "Player was not registered for this tournament",
                };
            }
            // If a registered player left and there's a waitlist, promote first waitlisted player
            if (wasRegistered &&
                tournament.waitlistPlayers &&
                tournament.waitlistPlayers.length > 0) {
                const firstWaitlisted = tournament.waitlistPlayers.shift();
                tournament.registeredPlayers = tournament.registeredPlayers || [];
                tournament.registeredPlayers.push(firstWaitlisted);
            }
            await tournament.save();
            return {
                success: true,
                message: wasRegistered
                    ? "Successfully unregistered from tournament"
                    : "Removed from tournament waitlist",
                tournament,
            };
        }
        catch (error) {
            console.error("Unregistration error:", error);
            return { success: false, message: "Unregistration failed" };
        }
    }
    /**
     * Move registered players to main players array and generate bracket
     */
    static async finalizeRegistration(tournamentId) {
        try {
            const tournament = await Tournament_1.Tournament.findById(tournamentId).populate("registeredPlayers", "name");
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
            tournament.players = (tournament.registeredPlayers || []).map((rp) => rp.playerId);
            // Update status to ready for bracket generation
            // Note: Bracket generation will be handled separately by admin
            await tournament.save();
            return {
                success: true,
                message: `Registration finalized with ${registeredCount} players`,
                tournament,
            };
        }
        catch (error) {
            console.error("Finalization error:", error);
            return { success: false, message: "Registration finalization failed" };
        }
    }
    /**
     * Get registration info for a tournament
     */
    static async getRegistrationInfo(tournamentId) {
        try {
            const tournament = await Tournament_1.Tournament.findById(tournamentId)
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
                    canRegister: tournament.allowSelfRegistration && tournament.isRegistrationOpen,
                },
            };
        }
        catch (error) {
            console.error("Get registration info error:", error);
            return { success: false, message: "Failed to get registration info" };
        }
    }
}
exports.TournamentRegistrationService = TournamentRegistrationService;
exports.default = TournamentRegistrationService;
//# sourceMappingURL=TournamentRegistrationService.js.map