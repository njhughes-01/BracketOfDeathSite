import { TournamentSeedingService } from "../../services/TournamentSeedingService";
import { Player } from "../../models/Player";

jest.mock("../../models/Player");

describe("TournamentSeedingService", () => {
    const p1 = { _id: "507f1f77bcf86cd799439001", winningPercentage: 0.8, totalChampionships: 2, avgFinish: 1, bodsPlayed: 10 }; // High
    const p2 = { _id: "507f1f77bcf86cd799439002", winningPercentage: 0.5, totalChampionships: 0, avgFinish: 5, bodsPlayed: 5 }; // Mid
    const p3 = { _id: "507f1f77bcf86cd799439003", winningPercentage: 0.1, totalChampionships: 0, avgFinish: 8, bodsPlayed: 2 }; // Low
    const pNew = { _id: "507f1f77bcf86cd799439004", bodsPlayed: 1 }; // New

    beforeEach(() => {
        jest.clearAllMocks();
        (Player.find as jest.Mock).mockResolvedValue([p1, p2, p3, pNew]);
    });

    it("should calculate seeding correctly", async () => {
        const playerIds = ["507f1f77bcf86cd799439001", "507f1f77bcf86cd799439002", "507f1f77bcf86cd799439003", "507f1f77bcf86cd799439004"];
        const result = await TournamentSeedingService.calculateSeeding(playerIds, "Singles");

        expect(result.success).toBe(true);
        expect(result.seeds).toHaveLength(4);

        // p1 should be #1
        expect(result.seeds![0].playerId.toString()).toBe("507f1f77bcf86cd799439001");
        expect(result.seeds![0].seed).toBe(1);

        // pNew should be handled (neutral score)
        const newSeed = result.seeds!.find(s => s.playerId.toString() === "507f1f77bcf86cd799439004");
        expect(newSeed!.score).toBe(50);
    });

    it("should generate bracket pairings", async () => {
        const seeds: any = [
            { playerId: "1", seed: 1 },
            { playerId: "2", seed: 2 },
            { playerId: "3", seed: 3 },
            { playerId: "4", seed: 4 }
        ];

        const result = await TournamentSeedingService.generateBracketPairings(seeds);

        expect(result.success).toBe(true);
        // 1 vs 4, 2 vs 3
        expect(result.pairings).toHaveLength(2);

        const pair1 = result.pairings!.find(p => p.team1.seed === 1);
        expect(pair1!.team2.seed).toBe(4);
    });

    it("should handle odd number of players in seeding preview", async () => {
        // Fix mock to return filtered
        (Player.find as jest.Mock).mockResolvedValue([p1, p2, p3]);

        const preview = await TournamentSeedingService.getSeedingPreview(["507f1f77bcf86cd799439001", "507f1f77bcf86cd799439002", "507f1f77bcf86cd799439003"], "Singles");

        expect(preview.success).toBe(true);
        expect(preview.preview!.totalPlayers).toBe(3);
        expect(preview.preview!.bracketSize).toBe(4);
        expect(preview.preview!.needsByes).toBe(true);
        expect(preview.preview!.byeCount).toBe(1);
    });
});
