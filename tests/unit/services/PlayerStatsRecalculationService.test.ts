import { Types, type PipelineStage } from "mongoose";
import { PlayerStatsRecalculationService } from "../../../src/backend/services/PlayerStatsRecalculationService";
import { Player } from "../../../src/backend/models/Player";
import { TournamentResult } from "../../../src/backend/models/TournamentResult";

jest.mock("../../../src/backend/models/Player");
jest.mock("../../../src/backend/models/TournamentResult");

describe("PlayerStatsRecalculationService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("recalculateForPlayer", () => {
        it("recalculates snapshot stats for a player", async () => {
            const playerId = new Types.ObjectId();
            const aggregatedStats = [
                {
                    _id: playerId,
                    bodsPlayed: 2,
                    bestResult: 1,
                    avgFinish: 1.5,
                    gamesPlayed: 10,
                    gamesWon: 7,
                    winningPercentage: 0.7,
                    totalChampionships: 1,
                    individualChampionships: 1,
                    divisionChampionships: 0,
                },
            ];

            (TournamentResult.aggregate as jest.Mock).mockResolvedValue(
                aggregatedStats,
            );
            (TournamentResult.countDocuments as jest.Mock).mockResolvedValue(2);
            (Player.updateOne as jest.Mock).mockResolvedValue({
                matchedCount: 1,
                modifiedCount: 1,
            });

            const result =
                await PlayerStatsRecalculationService.recalculateForPlayer(
                    playerId.toString(),
                );

            const countQuery = (TournamentResult.countDocuments as jest.Mock).mock
                .calls[0][0] as { players: Types.ObjectId };
            expect(countQuery.players.toString()).toBe(playerId.toString());

            const pipeline = (TournamentResult.aggregate as jest.Mock).mock
                .calls[0][0] as PipelineStage[];
            const hasGroupStage = pipeline.some((stage) =>
                Object.prototype.hasOwnProperty.call(stage, "$group"),
            );
            expect(hasGroupStage).toBe(true);

            const updateFilter = (Player.updateOne as jest.Mock).mock.calls[0][0] as {
                _id: Types.ObjectId;
            };
            expect(updateFilter._id.toString()).toBe(playerId.toString());

            const updatePayload = (Player.updateOne as jest.Mock).mock.calls[0][1] as {
                $set: Record<string, number>;
            };
            expect(updatePayload.$set).toEqual({
                bodsPlayed: 2,
                bestResult: 1,
                avgFinish: 1.5,
                gamesPlayed: 10,
                gamesWon: 7,
                winningPercentage: 0.7,
                totalChampionships: 1,
                individualChampionships: 1,
                divisionChampionships: 0,
            });

            expect(result).toEqual({ playersUpdated: 1, resultsProcessed: 2 });
        });

        it("resets stats when player has no results", async () => {
            const playerId = new Types.ObjectId();

            (TournamentResult.aggregate as jest.Mock).mockResolvedValue([]);
            (TournamentResult.countDocuments as jest.Mock).mockResolvedValue(0);
            (Player.updateOne as jest.Mock).mockResolvedValue({
                matchedCount: 1,
                modifiedCount: 1,
            });

            const result =
                await PlayerStatsRecalculationService.recalculateForPlayer(
                    playerId.toString(),
                );

            const updatePayload = (Player.updateOne as jest.Mock).mock.calls[0][1] as {
                $set: Record<string, number>;
            };
            expect(updatePayload.$set).toEqual({
                bodsPlayed: 0,
                bestResult: 0,
                avgFinish: 0,
                gamesPlayed: 0,
                gamesWon: 0,
                winningPercentage: 0,
                totalChampionships: 0,
                individualChampionships: 0,
                divisionChampionships: 0,
            });

            expect(result).toEqual({ playersUpdated: 1, resultsProcessed: 0 });
        });

        it("is idempotent for repeated runs", async () => {
            const playerId = new Types.ObjectId();
            const aggregatedStats = [
                {
                    _id: playerId,
                    bodsPlayed: 3,
                    bestResult: 2,
                    avgFinish: 2.5,
                    gamesPlayed: 12,
                    gamesWon: 8,
                    winningPercentage: 0.6666667,
                    totalChampionships: 0,
                    individualChampionships: 0,
                    divisionChampionships: 0,
                },
            ];

            (TournamentResult.aggregate as jest.Mock).mockResolvedValue(
                aggregatedStats,
            );
            (TournamentResult.countDocuments as jest.Mock).mockResolvedValue(3);
            (Player.updateOne as jest.Mock).mockResolvedValue({
                matchedCount: 1,
                modifiedCount: 1,
            });

            await PlayerStatsRecalculationService.recalculateForPlayer(
                playerId.toString(),
            );
            await PlayerStatsRecalculationService.recalculateForPlayer(
                playerId.toString(),
            );

            const firstUpdate = (Player.updateOne as jest.Mock).mock.calls[0][1] as {
                $set: Record<string, number>;
            };
            const secondUpdate = (Player.updateOne as jest.Mock).mock.calls[1][1] as {
                $set: Record<string, number>;
            };

            expect(firstUpdate.$set).toEqual(secondUpdate.$set);
        });
    });

    describe("recalculateForTournament", () => {
        it("recalculates stats for all players in a tournament", async () => {
            const tournamentId = new Types.ObjectId();
            const playerOne = new Types.ObjectId();
            const playerTwo = new Types.ObjectId();

            (TournamentResult.distinct as jest.Mock).mockResolvedValue([
                playerOne,
                playerTwo,
            ]);
            (TournamentResult.aggregate as jest.Mock).mockResolvedValue([
                {
                    _id: playerOne,
                    bodsPlayed: 2,
                    bestResult: 1,
                    avgFinish: 1.5,
                    gamesPlayed: 8,
                    gamesWon: 6,
                    winningPercentage: 0.75,
                    totalChampionships: 1,
                    individualChampionships: 1,
                    divisionChampionships: 0,
                },
                {
                    _id: playerTwo,
                    bodsPlayed: 4,
                    bestResult: 3,
                    avgFinish: 3.5,
                    gamesPlayed: 20,
                    gamesWon: 11,
                    winningPercentage: 0.55,
                    totalChampionships: 0,
                    individualChampionships: 0,
                    divisionChampionships: 0,
                },
            ]);
            (TournamentResult.countDocuments as jest.Mock).mockResolvedValue(5);
            (Player.updateOne as jest.Mock).mockResolvedValue({
                matchedCount: 1,
                modifiedCount: 1,
            });

            const result =
                await PlayerStatsRecalculationService.recalculateForTournament(
                    tournamentId.toString(),
                );

            const distinctArgs = (TournamentResult.distinct as jest.Mock).mock
                .calls[0] as [string, { tournamentId: Types.ObjectId }];
            expect(distinctArgs[0]).toBe("players");
            expect(distinctArgs[1].tournamentId.toString()).toBe(
                tournamentId.toString(),
            );

            expect(Player.updateOne).toHaveBeenCalledTimes(2);
            expect(result).toEqual({ playersUpdated: 2, resultsProcessed: 5 });
        });
    });
});
