import { TournamentRegistrationService } from "../../services/TournamentRegistrationService";
import { Tournament } from "../../models/Tournament";
import { Player } from "../../models/Player";

// Mock Mongoose models
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
            _id: playerId,
            name: "Test Player",
        };

        (Tournament.findById as jest.Mock).mockResolvedValue(mockTournament);
        (Player.findById as jest.Mock).mockResolvedValue(mockPlayer);
    });

    describe("registerPlayer", () => {
        it("should register a player successfully when open and spots available", async () => {
            const result = await TournamentRegistrationService.registerPlayer(tournId, playerId);

            expect(result.success).toBe(true);
            expect(result.position).toBe("registered");
            expect(mockTournament.registeredPlayers).toHaveLength(1);
            expect(mockTournament.registeredPlayers[0].playerId.toString()).toBe(playerId);
            expect(mockTournament.save).toHaveBeenCalled();
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
            const result = await TournamentRegistrationService.registerPlayer(tournId, "bad-player");
            // The catch block might catch the ID casting error for "bad-player" 
            // but if we pass a valid ID that isn't found:
            const result2 = await TournamentRegistrationService.registerPlayer(tournId, otherPlayerId);
            expect(result2.success).toBe(false);
            expect(result2.message).toBe("Player not found");
        });

        it("should fail if already registered", async () => {
            mockTournament.registeredPlayers = [{ playerId: { toString: () => playerId } }];
            const result = await TournamentRegistrationService.registerPlayer(tournId, playerId);
            expect(result.success).toBe(false);
            expect(result.message).toContain("already registered");
        });

        it("should fail if on waitlist", async () => {
            mockTournament.waitlistPlayers = [{ playerId: { toString: () => playerId } }];
            const result = await TournamentRegistrationService.registerPlayer(tournId, playerId);
            expect(result.success).toBe(false);
            expect(result.message).toContain("already on waitlist");
        });

        it("should add to waitlist if full", async () => {
            mockTournament.maxPlayers = 1;
            mockTournament.registeredPlayers = [{ playerId: { toString: () => otherPlayerId } }];

            const result = await TournamentRegistrationService.registerPlayer(tournId, playerId);

            expect(result.success).toBe(true);
            expect(result.position).toBe("waitlist");
            expect(mockTournament.waitlistPlayers).toHaveLength(1);
        });
    });

    describe("unregisterPlayer", () => {
        it("should unregister player and promote from waitlist", async () => {
            mockTournament.registeredPlayers = [{ playerId: { toString: () => playerId } }];
            mockTournament.waitlistPlayers = [{ playerId: { toString: () => waitPlayerId } }];

            const result = await TournamentRegistrationService.unregisterPlayer(tournId, playerId);

            expect(result.success).toBe(true);
            expect(mockTournament.registeredPlayers).toHaveLength(1);
            expect(mockTournament.registeredPlayers[0].playerId.toString()).toBe(waitPlayerId); // Promoted
            expect(mockTournament.waitlistPlayers).toHaveLength(0);
        });

        it("should fail if tournament is active/completed", async () => {
            mockTournament.status = "active";
            const result = await TournamentRegistrationService.unregisterPlayer(tournId, playerId);
            expect(result.success).toBe(false);
        });
    });

    describe("finalizeRegistration", () => {
        it("should finalize registration successfully", async () => {
            // Mock populate
            (Tournament.findById as jest.Mock).mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    populate: jest.fn().mockResolvedValue(mockTournament) // Assuming two populat calls? No, implementation has chaining?
                    // Actually implementation: .findById(..).populate(..)
                    // So we expect one populate here for findById().populate()
                    // wait, line 193: Tournament.findById(tournamentId).populate("registeredPlayers", "name")
                })
            } as any);

            // Simplest approach: Just make findById return an object with populate that resolves to mockTournament
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
            // Verify IDs were invoked
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
            // Mock chain: findById().populate().populate()
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
            expect(result.data.isRegistrationOpen).toBe(true);
            expect(result.data.canRegister).toBe(true);
        });
    });
});
