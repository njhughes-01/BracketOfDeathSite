import mongoose from "mongoose";
import { TournamentSeedingService } from "../../src/backend/services/TournamentSeedingService";
import { Player } from "../../src/backend/models/Player";

describe("TournamentSeedingService Integration", () => {
    let experiencedPlayerId: string;
    let championPlayerId: string;
    let newPlayerId: string;
    let averagePlayerId: string;

    beforeAll(async () => {
        // Connect to MongoDB if not already connected
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(
                process.env.MONGODB_URI || "mongodb://localhost:27017/bod_test"
            );
        }

        // Clear and create test players with varied statistics
        await Player.deleteMany({});

        // Experienced player with good stats
        const experiencedPlayer = await Player.create({
            name: "Experienced Player",
            gender: "male",
            bodsPlayed: 15,
            gamesPlayed: 120,
            gamesWon: 90,
            winningPercentage: 0.75,
            totalChampionships: 3,
            avgFinish: 2.5,
            bestResult: 1,
        });
        experiencedPlayerId = experiencedPlayer._id.toString();

        // Champion with excellent stats
        const championPlayer = await Player.create({
            name: "Champion Player",
            gender: "male",
            bodsPlayed: 20,
            gamesPlayed: 200,
            gamesWon: 160,
            winningPercentage: 0.8,
            totalChampionships: 5,
            avgFinish: 1.5,
            bestResult: 1,
        });
        championPlayerId = championPlayer._id.toString();

        // New player with minimal stats
        const newPlayer = await Player.create({
            name: "New Player",
            gender: "female",
            bodsPlayed: 1,
            gamesPlayed: 5,
            gamesWon: 2,
            winningPercentage: 0.4,
            totalChampionships: 0,
        });
        newPlayerId = newPlayer._id.toString();

        // Average player
        const averagePlayer = await Player.create({
            name: "Average Player",
            gender: "female",
            bodsPlayed: 8,
            gamesPlayed: 60,
            gamesWon: 30,
            winningPercentage: 0.5,
            totalChampionships: 1,
            avgFinish: 4,
            bestResult: 2,
        });
        averagePlayerId = averagePlayer._id.toString();
    });

    afterAll(async () => {
        await Player.deleteMany({});
    });

    describe("calculateSeeding", () => {
        it("should calculate seeding for multiple players", async () => {
            const result = await TournamentSeedingService.calculateSeeding(
                [experiencedPlayerId, championPlayerId, newPlayerId, averagePlayerId],
                "M"
            );

            expect(result.success).toBe(true);
            expect(result.seeds).toBeDefined();
            expect(result.seeds?.length).toBe(4);
        });

        it("should rank champion player highest", async () => {
            const result = await TournamentSeedingService.calculateSeeding(
                [experiencedPlayerId, championPlayerId, newPlayerId, averagePlayerId],
                "M"
            );

            expect(result.success).toBe(true);
            expect(result.seeds?.[0].player.name).toBe("Champion Player");
            expect(result.seeds?.[0].seed).toBe(1);
        });

        it("should give new players neutral seeding", async () => {
            const result = await TournamentSeedingService.calculateSeeding(
                [newPlayerId],
                "M"
            );

            expect(result.success).toBe(true);
            expect(result.seeds?.[0].score).toBe(50); // Neutral score
            expect(result.seeds?.[0].reasoning).toContain("New player");
        });

        it("should return error for missing players", async () => {
            const fakeId = new mongoose.Types.ObjectId().toString();

            const result = await TournamentSeedingService.calculateSeeding(
                [fakeId],
                "M"
            );

            expect(result.success).toBe(false);
            expect(result.message).toContain("not found");
        });
    });

    describe("generateBracketPairings", () => {
        it("should generate pairings for seeded players", async () => {
            const seedingResult = await TournamentSeedingService.calculateSeeding(
                [experiencedPlayerId, championPlayerId, newPlayerId, averagePlayerId],
                "M"
            );

            expect(seedingResult.success).toBe(true);
            expect(seedingResult.seeds).toBeDefined();

            const pairingResult = await TournamentSeedingService.generateBracketPairings(
                seedingResult.seeds!
            );

            expect(pairingResult.success).toBe(true);
            expect(pairingResult.pairings).toBeDefined();
            expect(pairingResult.pairings?.length).toBeGreaterThan(0);
        });

        it("should pair highest seed with lowest seed", async () => {
            const seedingResult = await TournamentSeedingService.calculateSeeding(
                [experiencedPlayerId, championPlayerId, newPlayerId, averagePlayerId],
                "M"
            );

            const pairingResult = await TournamentSeedingService.generateBracketPairings(
                seedingResult.seeds!
            );

            expect(pairingResult.success).toBe(true);
            // First pairing should be seed 1 vs seed 4
            const firstPairing = pairingResult.pairings?.[0];
            expect(firstPairing?.team1.seed).toBe(1);
            expect(firstPairing?.team2.seed).toBe(4);
        });
    });

    describe("getSeedingPreview", () => {
        it("should return preview with bracket size info", async () => {
            const result = await TournamentSeedingService.getSeedingPreview(
                [experiencedPlayerId, championPlayerId, newPlayerId],
                "M"
            );

            expect(result.success).toBe(true);
            expect(result.preview).toBeDefined();
            expect(result.preview?.totalPlayers).toBe(3);
            expect(result.preview?.bracketSize).toBe(4); // Next power of 2
            expect(result.preview?.needsByes).toBe(true);
            expect(result.preview?.byeCount).toBe(1);
        });
    });
});
