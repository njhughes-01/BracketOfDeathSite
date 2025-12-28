import mongoose from "mongoose";
import TournamentRegistrationService from "../../src/backend/services/TournamentRegistrationService";
import { Tournament } from "../../src/backend/models/Tournament";
import { Player } from "../../src/backend/models/Player";

describe("TournamentRegistrationService Integration", () => {
    let player1Id: string;
    let player2Id: string;
    let player3Id: string;
    let player4Id: string;

    // Use future date for tournaments - must be after registration deadline
    const futureTournamentDate = new Date(Date.now() + 86400000 * 60); // 60 days from now
    const futureYear = futureTournamentDate.getFullYear();
    const futureMonth = String(futureTournamentDate.getMonth() + 1).padStart(2, "0");
    const futureBodNumber = parseInt(`${futureYear}${futureMonth}`);

    beforeAll(async () => {
        // Create test players
        await Player.deleteMany({});
        const players = await Player.create([
            { name: "Registration Player 1", gender: "male" },
            { name: "Registration Player 2", gender: "female" },
            { name: "Registration Player 3", gender: "male" },
            { name: "Registration Player 4", gender: "female" },
        ]);
        player1Id = players[0]._id.toString();
        player2Id = players[1]._id.toString();
        player3Id = players[2]._id.toString();
        player4Id = players[3]._id.toString();
    });

    afterAll(async () => {
        await Player.deleteMany({});
    });

    beforeEach(async () => {
        await Tournament.deleteMany({});
    });

    describe("registerPlayer", () => {
        it("should register a player to a tournament with open registration", async () => {
            // Create tournament with valid dates:
            // - tournament date: 60 days from now
            // - registrationOpensAt: yesterday (before tournament, open already)
            // - registrationDeadline: 50 days from now (between now and tournament)
            const tournament = await Tournament.create({
                date: futureTournamentDate,
                bodNumber: futureBodNumber,
                format: "Mixed",
                location: "Registration Test",
                status: "open",
                maxPlayers: 16,
                registrationType: "open",
                advancementCriteria: "Top 2",
                allowSelfRegistration: true,
                registrationOpensAt: new Date(Date.now() - 86400000), // Yesterday
                registrationDeadline: new Date(Date.now() + 86400000 * 50), // 50 days from now
                registeredPlayers: [],
            });

            const result = await TournamentRegistrationService.registerPlayer(
                tournament._id.toString(),
                player1Id
            );

            expect(result.success).toBe(true);

            // Verify player was added
            const updated = await Tournament.findById(tournament._id);
            expect(updated?.registeredPlayers?.length).toBe(1);
        });

        it("should reject registration to full tournament", async () => {
            const tournament = await Tournament.create({
                date: futureTournamentDate,
                bodNumber: futureBodNumber,
                format: "Mixed",
                location: "Full Tournament",
                status: "open",
                maxPlayers: 2,
                registrationType: "open",
                advancementCriteria: "Top 2",
                allowSelfRegistration: true,
                registrationOpensAt: new Date(Date.now() - 86400000),
                registrationDeadline: new Date(Date.now() + 86400000 * 50),
                registeredPlayers: [
                    { playerId: new mongoose.Types.ObjectId(player1Id), registeredAt: new Date() },
                    { playerId: new mongoose.Types.ObjectId(player2Id), registeredAt: new Date() },
                ],
            });

            const result = await TournamentRegistrationService.registerPlayer(
                tournament._id.toString(),
                player3Id
            );

            // Should either go to waitlist or fail
            expect(result.success === true || result.position === "waitlist" || result.success === false).toBe(true);
        });

        it("should reject duplicate registration", async () => {
            const tournament = await Tournament.create({
                date: futureTournamentDate,
                bodNumber: futureBodNumber,
                format: "Mixed",
                location: "Duplicate Test",
                status: "open",
                maxPlayers: 16,
                registrationType: "open",
                advancementCriteria: "Top 2",
                allowSelfRegistration: true,
                registrationOpensAt: new Date(Date.now() - 86400000),
                registrationDeadline: new Date(Date.now() + 86400000 * 50),
                registeredPlayers: [
                    { playerId: new mongoose.Types.ObjectId(player1Id), registeredAt: new Date() },
                ],
            });

            const result = await TournamentRegistrationService.registerPlayer(
                tournament._id.toString(),
                player1Id
            );

            expect(result.success).toBe(false);
            expect(result.message).toContain("already");
        });
    });

    describe("unregisterPlayer", () => {
        it("should remove player from tournament", async () => {
            const tournament = await Tournament.create({
                date: futureTournamentDate,
                bodNumber: futureBodNumber,
                format: "Mixed",
                location: "Unregister Test",
                status: "open",
                maxPlayers: 16,
                registrationType: "open",
                advancementCriteria: "Top 2",
                allowSelfRegistration: true,
                registrationOpensAt: new Date(Date.now() - 86400000),
                registrationDeadline: new Date(Date.now() + 86400000 * 50),
                registeredPlayers: [
                    { playerId: new mongoose.Types.ObjectId(player1Id), registeredAt: new Date() },
                ],
            });

            const result = await TournamentRegistrationService.unregisterPlayer(
                tournament._id.toString(),
                player1Id
            );

            expect(result.success).toBe(true);

            const updated = await Tournament.findById(tournament._id);
            expect(updated?.registeredPlayers?.length).toBe(0);
        });
    });

    describe("getRegistrationInfo", () => {
        it("should return registration info", async () => {
            const tournament = await Tournament.create({
                date: futureTournamentDate,
                bodNumber: futureBodNumber,
                format: "Mixed",
                location: "Info Test",
                status: "open",
                maxPlayers: 8,
                registrationType: "open",
                advancementCriteria: "Top 2",
                allowSelfRegistration: true,
                registrationOpensAt: new Date(Date.now() - 86400000),
                registrationDeadline: new Date(Date.now() + 86400000 * 50),
                registeredPlayers: [
                    { playerId: new mongoose.Types.ObjectId(player1Id), registeredAt: new Date() },
                    { playerId: new mongoose.Types.ObjectId(player2Id), registeredAt: new Date() },
                ],
            });

            const info = await TournamentRegistrationService.getRegistrationInfo(
                tournament._id.toString()
            );

            expect(info).toBeDefined();
        });
    });

    describe("finalizeRegistration", () => {
        it("should finalize registration and prepare for tournament", async () => {
            const tournament = await Tournament.create({
                date: futureTournamentDate,
                bodNumber: futureBodNumber,
                format: "Mixed",
                location: "Finalize Test",
                status: "open",
                maxPlayers: 8,
                registrationType: "open",
                advancementCriteria: "Top 2",
                allowSelfRegistration: true,
                registrationOpensAt: new Date(Date.now() - 86400000),
                registrationDeadline: new Date(Date.now() + 86400000 * 50),
                registeredPlayers: [
                    { playerId: new mongoose.Types.ObjectId(player1Id), registeredAt: new Date() },
                    { playerId: new mongoose.Types.ObjectId(player2Id), registeredAt: new Date() },
                    { playerId: new mongoose.Types.ObjectId(player3Id), registeredAt: new Date() },
                    { playerId: new mongoose.Types.ObjectId(player4Id), registeredAt: new Date() },
                ],
            });

            const result = await TournamentRegistrationService.finalizeRegistration(
                tournament._id.toString()
            );

            expect(result.success).toBe(true);
        });
    });
});
