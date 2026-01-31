import { Types, type PipelineStage } from "mongoose";
import { Player } from "../models/Player";
import { TournamentResult } from "../models/TournamentResult";

export type PlayerStatsRecalculationSummary = {
  playersUpdated: number;
  resultsProcessed: number;
};

type AggregatedPlayerStats = {
  _id: Types.ObjectId;
  bodsPlayed: number;
  bestResult: number;
  avgFinish: number;
  gamesPlayed: number;
  gamesWon: number;
  winningPercentage: number;
  totalChampionships: number;
  individualChampionships: number;
  divisionChampionships: number;
};

type PlayerStatsSnapshot = Omit<AggregatedPlayerStats, "_id">;

type ResultsQuery =
  | { players: Types.ObjectId }
  | { players: { $in: Types.ObjectId[] } };

export class PlayerStatsRecalculationService {
  /**
   * Recalculate career stats for all players in a tournament.
   */
  static async recalculateForTournament(
    tournamentId: string,
  ): Promise<PlayerStatsRecalculationSummary> {
    const tournamentObjectId = this.requireObjectId(
      tournamentId,
      "tournamentId",
    );
    const rawPlayerIds = (await TournamentResult.distinct("players", {
      tournamentId: tournamentObjectId,
    })) as Array<Types.ObjectId | string>;
    const playerIds = this.normalizeObjectIds(rawPlayerIds);

    if (playerIds.length === 0) {
      return { playersUpdated: 0, resultsProcessed: 0 };
    }

    return this.recalculateForPlayers(playerIds, {
      players: { $in: playerIds },
    });
  }

  /**
   * Recalculate career stats for a single player.
   */
  static async recalculateForPlayer(
    playerId: string,
  ): Promise<PlayerStatsRecalculationSummary> {
    const playerObjectId = this.requireObjectId(playerId, "playerId");
    return this.recalculateForPlayers([playerObjectId], {
      players: playerObjectId,
    });
  }

  private static async recalculateForPlayers(
    playerIds: Types.ObjectId[],
    resultsQuery: ResultsQuery,
  ): Promise<PlayerStatsRecalculationSummary> {
    const resultsProcessed = await TournamentResult.countDocuments(resultsQuery);
    const aggregatedStats = await this.aggregatePlayerStats(playerIds);
    const statsByPlayerId = new Map<string, AggregatedPlayerStats>(
      aggregatedStats.map((stat) => [stat._id.toString(), stat]),
    );

    let playersUpdated = 0;

    for (const playerId of playerIds) {
      const stats = statsByPlayerId.get(playerId.toString());
      const update = stats
        ? this.toPlayerStatsSnapshot(stats)
        : this.emptyPlayerStatsSnapshot();

      const updateResult = await Player.updateOne(
        { _id: playerId },
        { $set: update },
        { runValidators: true },
      );

      playersUpdated += updateResult.matchedCount;
    }

    return { playersUpdated, resultsProcessed };
  }

  private static async aggregatePlayerStats(
    playerIds: Types.ObjectId[],
  ): Promise<AggregatedPlayerStats[]> {
    const pipeline: PipelineStage[] = [
      { $match: { players: { $in: playerIds } } },
      {
        $addFields: {
          finishValue: {
            $ifNull: ["$totalStats.bodFinish", "$totalStats.finalRank"],
          },
        },
      },
      { $unwind: "$players" },
      { $match: { players: { $in: playerIds } } },
      {
        $lookup: {
          from: "tournaments",
          localField: "tournamentId",
          foreignField: "_id",
          as: "tournament",
        },
      },
      {
        $addFields: {
          tournamentFormat: {
            $ifNull: [{ $arrayElemAt: ["$tournament.format", 0] }, null],
          },
        },
      },
      {
        $group: {
          _id: "$players",
          gamesPlayed: { $sum: { $ifNull: ["$totalStats.totalPlayed", 0] } },
          gamesWon: { $sum: { $ifNull: ["$totalStats.totalWon", 0] } },
          tournaments: { $addToSet: "$tournamentId" },
          finishSum: {
            $sum: {
              $cond: [{ $ne: ["$finishValue", null] }, "$finishValue", 0],
            },
          },
          finishCount: {
            $sum: { $cond: [{ $ne: ["$finishValue", null] }, 1, 0] },
          },
          bestResultRaw: {
            $min: { $ifNull: ["$finishValue", 9999] },
          },
          divisionChampionships: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$finishValue", 1] },
                    { $in: ["$tournamentFormat", ["M", "W"]] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          individualChampionships: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$finishValue", 1] },
                    { $not: [{ $in: ["$tournamentFormat", ["M", "W"]] }] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          gamesPlayed: 1,
          gamesWon: 1,
          bodsPlayed: { $size: "$tournaments" },
          avgFinish: {
            $cond: [
              { $gt: ["$finishCount", 0] },
              { $divide: ["$finishSum", "$finishCount"] },
              0,
            ],
          },
          bestResult: {
            $cond: [{ $gt: ["$finishCount", 0] }, "$bestResultRaw", 0],
          },
          divisionChampionships: 1,
          individualChampionships: 1,
        },
      },
      {
        $addFields: {
          totalChampionships: {
            $add: ["$divisionChampionships", "$individualChampionships"],
          },
          winningPercentage: {
            $cond: [
              { $gt: ["$gamesPlayed", 0] },
              { $divide: ["$gamesWon", "$gamesPlayed"] },
              0,
            ],
          },
        },
      },
    ];

    return TournamentResult.aggregate<AggregatedPlayerStats>(pipeline);
  }

  private static toPlayerStatsSnapshot(
    stats: AggregatedPlayerStats,
  ): PlayerStatsSnapshot {
    return {
      bodsPlayed: stats.bodsPlayed,
      bestResult: stats.bestResult,
      avgFinish: stats.avgFinish,
      gamesPlayed: stats.gamesPlayed,
      gamesWon: stats.gamesWon,
      winningPercentage: stats.winningPercentage,
      totalChampionships: stats.totalChampionships,
      individualChampionships: stats.individualChampionships,
      divisionChampionships: stats.divisionChampionships,
    };
  }

  private static emptyPlayerStatsSnapshot(): PlayerStatsSnapshot {
    return {
      bodsPlayed: 0,
      bestResult: 0,
      avgFinish: 0,
      gamesPlayed: 0,
      gamesWon: 0,
      winningPercentage: 0,
      totalChampionships: 0,
      individualChampionships: 0,
      divisionChampionships: 0,
    };
  }

  private static normalizeObjectIds(
    values: Array<Types.ObjectId | string>,
  ): Types.ObjectId[] {
    const unique = new Map<string, Types.ObjectId>();
    values.forEach((value) => {
      const objectId = new Types.ObjectId(value);
      unique.set(objectId.toString(), objectId);
    });
    return Array.from(unique.values());
  }

  private static requireObjectId(
    value: string,
    fieldName: string,
  ): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
      throw new Error(`Invalid ${fieldName} value`);
    }
    return new Types.ObjectId(value);
  }
}

export default PlayerStatsRecalculationService;
