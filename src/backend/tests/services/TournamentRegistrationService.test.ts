import { TournamentRegistrationService } from "../../services/TournamentRegistrationService";
import { Tournament } from "../../models/Tournament";
import { Player } from "../../models/Player";
import { Types } from "mongoose";

jest.mock("../../models/Tournament");
jest.mock("../../models/Player");

describe("TournamentRegistrationService", () => {
    let mockTournament: any;
    let mockPlayer: any;

    const tournId = "507f1f77bcf86cd799439011";
    const playerId = "507f1f77bcf86cd799439012";
    const otherPlayerId = "507f1f77bcf86cd799439013";
    const waitPlayerId = "507f1f77bcf86cd799439014";

    beforeEach(() => {
        jest.clearAllMocks();

        mockTournament = {
            _id: tournId,
            allowSelfRegistration: true,
            registrationStatus: "open",
            maxPlayers: 10,
            registeredPlayers: [],
            waitlistPlayers: [],
            status: "open",
            save: jest.fn().mockResolvedValue(true),
        };

        mockPlayer = {
            _id: new Types.ObjectId(playerId),
            name: "Test Player",
        };

        (Tournament.findById as jest.Mock).mockResolvedValue(mockTournament);
        (Player.findById as jest.Mock).mockResolvedValue(mockPlayer);
        (Tournament.findOneAndUpdateSafe as jest.Mock).mockResolvedValue(null);
    });

    describe("registerPlayer", () => {
        it("should register a player successfully when open and spots available", async () => {
            const registeredTournament = {
                ...mockTournament,
                registeredPlayers: [{ playerId: new Types.ObjectId(playerId), registeredAt: new Date() }],
            };
            (Tournament.findOneAndUpdateSafe as jest.Mock)
                .mockResolvedValueOnce(registeredTournament);

            const result = await TournamentRegistrationService.registerPlayer(tournId, playerId);

            expect(result.success).toBe(true);
            expect(result.position).toBe("registered");
            expect(result.tournament).toEqual(registeredTournament);
        });

        it("should return error if tournament not found", async () => {
            (Tournament.findById as jest.Mock).mockResolvedValue(null);
            const result = await TournamentRegistrationService.registerPlayer("bad-id", playerId);
            expect(result.success).toBe(false);
            expect(result.message).toContain("Tournament not found");
        });

        it("should fail if self-registration is disabled", async () => {
            mockTournament.allowSelfRegistration = false;
            const result = await TournamentRegistrationService.registerPlayer(tournId, playerId);
            expect(result.success).toBe(false);
            expect(result.message).toContain("not allowed");
        });

        it("should fail if registration is pending", async () => {
            mockTournament.registrationStatus = "pending";
            const result = await TournamentRegistrationService.registerPlayer(tournId, playerId);
            expect(result.success).toBe(false);
            expect(result.message).toContain("not opened yet");
        });

        it("should fail if registration is closed", async () => {
            mockTournament.registrationStatus = "closed";
            const result = await TournamentRegistrationService.registerPlayer(tournId, playerId);
            expect(result.success).toBe(false);
            expect(result.message).toContain("deadline has passed");
        });

        it("should fail if player not found", async () => {
            (Player.findById as jest.Mock).mockResolvedValue(null);
            const result = await TournamentRegistrationService.registerPlayer(tournId, otherPlayerId);
            expect(result.success).toBe(false);
            expect(result.message).toBe("Player not found");
        });

        it("should fail if already registered", async () => {
            (Tournament.findOneAndUpdateSafe as jest.Mock)
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(null);

            const refreshedTournament = {
                ...mockTournament,
                registeredPlayers: [{ playerId: { toString: () => playerId } }],
            };
            (Tournament.findById as jest.Mock)
                .mockResolvedValueOnce(mockTournament)
                .mockResolvedValueOnce(refreshedTournament);

            const result = await TournamentRegistrationService.registerPlayer(tournId, playerId);
            expect(result.success).toBe(false);
            expect(result.message).toContain("already registered");
        });

        it("should fail if on waitlist", async () => {
            (Tournament.findOneAndUpdateSafe as jest.Mock)
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(null);

            const refreshedTournament = {
                ...mockTournament,
                waitlistPlayers: [{ playerId: { toString: () => playerId } }],
            };
            (Tournament.findById as jest.Mock)
                .mockResolvedValueOnce(mockTournament)
                .mockResolvedValueOnce(refreshedTournament);

            const result = await TournamentRegistrationService.registerPlayer(tournId, playerId);
            expect(result.success).toBe(false);
            expect(result.message).toContain("already on waitlist");
        });

        it("should add to waitlist if full", async () => {
            const waitlistTournament = {
                ...mockTournament,
                maxPlayers: 1,
                registeredPlayers: [{ playerId: new Types.ObjectId(otherPlayerId) }],
                waitlistPlayers: [{ playerId: new Types.ObjectId(playerId), registeredAt: new Date() }],
            };
            (Tournament.findOneAndUpdateSafe as jest.Mock)
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(waitlistTournament);

            const result = await TournamentRegistrationService.registerPlayer(tournId, playerId);

            expect(result.success).toBe(true);
            expect(result.position).toBe("waitlist");
            expect(result.tournament).toEqual(waitlistTournament);
        });
    });

    describe("unregisterPlayer", () => {
        it("should unregister player and promote from waitlist", async () => {
            const updatedTournament = {
                ...mockTournament,
                registeredPlayers: [{ playerId: new Types.ObjectId(waitPlayerId), registeredAt: new Date() }],
                waitlistPlayers: [],
            };
            (Tournament.findOneAndUpdateSafe as jest.Mock).mockResolvedValueOnce(updatedTournament);

            const result = await TournamentRegistrationService.unregisterPlayer(tournId, playerId);

            expect(result.success).toBe(true);
            expect(result.tournament).toEqual(updatedTournament);
        });

        it("should fail if tournament is active/completed", async () => {
            mockTournament.status = "active";
            const result = await TournamentRegistrationService.unregisterPlayer(tournId, playerId);
            expect(result.success).toBe(false);
        });

        it("should remove from waitlist if on waitlist", async () => {
            (Tournament.findOneAndUpdateSafe as jest.Mock)
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce({ ...mockTournament, waitlistPlayers: [] });

            const result = await TournamentRegistrationService.unregisterPlayer(tournId, playerId);

            expect(result.success).toBe(true);
            expect(result.message).toContain("waitlist");
        });

        it("should return error if not registered", async () => {
            (Tournament.findOneAndUpdateSafe as jest.Mock)
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(null);

            const result = await TournamentRegistrationService.unregisterPlayer(tournId, playerId);

            expect(result.success).toBe(false);
            expect(result.message).toContain("not registered");
        });
    });

    describe("finalizeRegistration", () => {
        it("should finalize registration successfully", async () => {
            const mockQuery = {
                populate: jest.fn().mockResolvedValue(mockTournament)
            };
            (Tournament.findById as jest.Mock).mockReturnValue(mockQuery);

            mockTournament.registeredPlayers = [
                { playerId: playerId },
                { playerId: otherPlayerId }
            ];

            const result = await TournamentRegistrationService.finalizeRegistration(tournId);

            expect(result.success).toBe(true);
            expect(mockTournament.players).toHaveLength(2);
            expect(mockTournament.players).toEqual([playerId, otherPlayerId]);
            expect(mockTournament.save).toHaveBeenCalled();
        });

        it("should fail if not open", async () => {
            const mockQuery = {
                populate: jest.fn().mockResolvedValue(mockTournament)
            };
            (Tournament.findById as jest.Mock).mockReturnValue(mockQuery);

            mockTournament.status = "active";
            const result = await TournamentRegistrationService.finalizeRegistration(tournId);
            expect(result.success).toBe(false);
            expect(result.message).toContain("must be open");
        });

        it("should fail if not enough players", async () => {
            const mockQuery = {
                populate: jest.fn().mockResolvedValue(mockTournament)
            };
            (Tournament.findById as jest.Mock).mockReturnValue(mockQuery);

            mockTournament.registeredPlayers = [{ playerId: playerId }];
            const result = await TournamentRegistrationService.finalizeRegistration(tournId);
            expect(result.success).toBe(false);
            expect(result.message).toContain("at least 2 players");
        });
    });

    describe("getRegistrationInfo", () => {
        it("should return correct info", async () => {
            const mockQuery2 = {
                populate: jest.fn().mockResolvedValue(mockTournament)
            };
            const mockQuery1 = {
                populate: jest.fn().mockReturnValue(mockQuery2)
            };
            (Tournament.findById as jest.Mock).mockReturnValue(mockQuery1);

            mockTournament.registeredPlayerCount = 5;
            mockTournament.waitlistCount = 0;
            mockTournament.isRegistrationOpen = true;

            const result = await TournamentRegistrationService.getRegistrationInfo(tournId);

            expect(result.success).toBe(true);
            expect(result.data?.isRegistrationOpen).toBe(true);
            expect(result.data?.canRegister).toBe(true);
        });
    });
});
