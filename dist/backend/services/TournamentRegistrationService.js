"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TournamentRegistrationService = void 0;
const mongoose_1 = require("mongoose");
const Tournament_1 = require("../models/Tournament");
const Player_1 = require("../models/Player");
class TournamentRegistrationService {
    static async registerPlayer(tournamentId, playerId) {
        try {
            const tournament = await Tournament_1.Tournament.findById(tournamentId);
            if (!tournament) {
                return { success: false, message: 'Tournament not found' };
            }
            if (!tournament.allowSelfRegistration) {
                return { success: false, message: 'Self-registration not allowed for this tournament' };
            }
            const registrationStatus = tournament.registrationStatus;
            if (registrationStatus === 'pending') {
                return { success: false, message: 'Registration has not opened yet' };
            }
            if (registrationStatus === 'closed') {
                return { success: false, message: 'Registration deadline has passed' };
            }
            const player = await Player_1.Player.findById(playerId);
            if (!player) {
                return { success: false, message: 'Player not found' };
            }
            const playerObjectId = new mongoose_1.Types.ObjectId(playerId);
            const isAlreadyRegistered = tournament.registeredPlayers?.some(p => p.toString() === playerId);
            const isOnWaitlist = tournament.waitlistPlayers?.some(p => p.toString() === playerId);
            if (isAlreadyRegistered) {
                return { success: false, message: 'Player already registered' };
            }
            if (isOnWaitlist) {
                return { success: false, message: 'Player already on waitlist' };
            }
            const currentRegistered = tournament.registeredPlayers?.length || 0;
            const maxPlayers = tournament.maxPlayers || 64;
            if (currentRegistered < maxPlayers) {
                tournament.registeredPlayers = tournament.registeredPlayers || [];
                tournament.registeredPlayers.push(playerObjectId);
                await tournament.save();
                return {
                    success: true,
                    message: 'Successfully registered for tournament',
                    position: 'registered',
                    tournament,
                };
            }
            else {
                tournament.waitlistPlayers = tournament.waitlistPlayers || [];
                tournament.waitlistPlayers.push(playerObjectId);
                await tournament.save();
                return {
                    success: true,
                    message: 'Tournament is full, added to waitlist',
                    position: 'waitlist',
                    tournament,
                };
            }
        }
        catch (error) {
            console.error('Registration error:', error);
            return { success: false, message: 'Registration failed' };
        }
    }
    static async unregisterPlayer(tournamentId, playerId) {
        try {
            const tournament = await Tournament_1.Tournament.findById(tournamentId);
            if (!tournament) {
                return { success: false, message: 'Tournament not found' };
            }
            if (tournament.status === 'active' || tournament.status === 'completed') {
                return { success: false, message: 'Cannot unregister from active or completed tournament' };
            }
            let wasRegistered = false;
            let wasOnWaitlist = false;
            if (tournament.registeredPlayers) {
                const registeredIndex = tournament.registeredPlayers.findIndex(p => p.toString() === playerId);
                if (registeredIndex !== -1) {
                    tournament.registeredPlayers.splice(registeredIndex, 1);
                    wasRegistered = true;
                }
            }
            if (tournament.waitlistPlayers) {
                const waitlistIndex = tournament.waitlistPlayers.findIndex(p => p.toString() === playerId);
                if (waitlistIndex !== -1) {
                    tournament.waitlistPlayers.splice(waitlistIndex, 1);
                    wasOnWaitlist = true;
                }
            }
            if (!wasRegistered && !wasOnWaitlist) {
                return { success: false, message: 'Player was not registered for this tournament' };
            }
            if (wasRegistered && tournament.waitlistPlayers && tournament.waitlistPlayers.length > 0) {
                const firstWaitlisted = tournament.waitlistPlayers.shift();
                tournament.registeredPlayers = tournament.registeredPlayers || [];
                tournament.registeredPlayers.push(firstWaitlisted);
            }
            await tournament.save();
            return {
                success: true,
                message: wasRegistered
                    ? 'Successfully unregistered from tournament'
                    : 'Removed from tournament waitlist',
                tournament,
            };
        }
        catch (error) {
            console.error('Unregistration error:', error);
            return { success: false, message: 'Unregistration failed' };
        }
    }
    static async finalizeRegistration(tournamentId) {
        try {
            const tournament = await Tournament_1.Tournament.findById(tournamentId).populate('registeredPlayers', 'name');
            if (!tournament) {
                return { success: false, message: 'Tournament not found' };
            }
            if (tournament.status !== 'open') {
                return { success: false, message: 'Tournament must be open to finalize registration' };
            }
            const registeredCount = tournament.registeredPlayers?.length || 0;
            if (registeredCount < 2) {
                return { success: false, message: 'Need at least 2 players to finalize tournament' };
            }
            tournament.players = [...(tournament.registeredPlayers || [])];
            await tournament.save();
            return {
                success: true,
                message: `Registration finalized with ${registeredCount} players`,
                tournament,
            };
        }
        catch (error) {
            console.error('Finalization error:', error);
            return { success: false, message: 'Registration finalization failed' };
        }
    }
    static async getRegistrationInfo(tournamentId) {
        try {
            const tournament = await Tournament_1.Tournament.findById(tournamentId)
                .populate('registeredPlayers', 'name firstName lastName')
                .populate('waitlistPlayers', 'name firstName lastName');
            if (!tournament) {
                return { success: false, message: 'Tournament not found' };
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
            console.error('Get registration info error:', error);
            return { success: false, message: 'Failed to get registration info' };
        }
    }
}
exports.TournamentRegistrationService = TournamentRegistrationService;
exports.default = TournamentRegistrationService;
//# sourceMappingURL=TournamentRegistrationService.js.map