import { Request, Response, NextFunction } from "express";
import { Player } from "../models/Player";
import { IPlayer, IPlayerInput, IPlayerFilter } from "../types/player";
import { BaseCrudController, RequestWithAuth } from "./base";
import { ApiResponse } from "../types/common";

export class PlayerController extends BaseCrudController<IPlayer> {
  constructor() {
    super(Player, "Player");
  }

  // Override buildFilter for player-specific filtering
  protected override buildFilter(query: any): IPlayerFilter {
    const filter: IPlayerFilter = {};
    const { page, limit, sort, select, populate, q, ...filterParams } = query;

    // Name search (case insensitive)
    if (filterParams.name) {
      filter.name = new RegExp(filterParams.name, "i");
    }

    // Numeric range filters
    const numericFields = [
      "bodsPlayed",
      "bestResult",
      "avgFinish",
      "winningPercentage",
      "totalChampionships",
      "gamesPlayed",
      "gamesWon",
    ];

    numericFields.forEach((field) => {
      const value = filterParams[field];
      const minValue = filterParams[`${field}_min`];
      const maxValue = filterParams[`${field}_max`];

      if (value !== undefined) {
        (filter as any)[field] = parseFloat(value);
      } else if (minValue !== undefined || maxValue !== undefined) {
        (filter as any)[field] = {};
        if (minValue !== undefined) {
          (filter as any)[field].$gte = parseFloat(minValue);
        }
        if (maxValue !== undefined) {
          (filter as any)[field].$lte = parseFloat(maxValue);
        }
      }
    });

    // Division filtering
    if (filterParams.division) {
      filter.division = new RegExp(filterParams.division, "i");
    }

    // City/State filtering
    if (filterParams.city) {
      filter.city = new RegExp(filterParams.city, "i");
    }
    if (filterParams.state) {
      filter.state = new RegExp(filterParams.state, "i");
    }

    return filter;
  }

  // Override buildSearchFilter for player-specific search
  protected override buildSearchFilter(searchTerm: string): any {
    return {
      $or: [
        { name: new RegExp(searchTerm, "i") },
        { pairing: new RegExp(searchTerm, "i") },
      ],
    };
  }

  // Get player statistics
  getStats = this.asyncHandler(
    async (_req: Request, res: Response): Promise<void> => {
      const stats = await Player.aggregate([
        {
          $group: {
            _id: null,
            totalPlayers: { $sum: 1 },
            avgWinningPercentage: { $avg: "$winningPercentage" },
            avgBodsPlayed: { $avg: "$bodsPlayed" },
            totalChampionships: { $sum: "$totalChampionships" },
            maxWinningPercentage: { $max: "$winningPercentage" },
            minWinningPercentage: { $min: "$winningPercentage" },
          },
        },
      ]);

      const topPlayers = await Player.find({})
        .sort({ winningPercentage: -1, totalChampionships: -1 })
        .limit(10)
        .select("name winningPercentage totalChampionships bodsPlayed");

      this.sendSuccess(res, {
        overview: stats[0] || {},
        topPlayers,
      });
    },
  );

  // Aggregate per-player scoring from matches
  getScoringSummary = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      // Aggregate from Match collection team1.playerScores / team2.playerScores
      const summary = await (this.model as any).db.model("Match").aggregate([
        {
          $match: {
            $or: [
              {
                "team1.playerScores.playerId":
                  new (require("mongoose").Types.ObjectId)(id),
              },
              {
                "team2.playerScores.playerId":
                  new (require("mongoose").Types.ObjectId)(id),
              },
            ],
          },
        },
        {
          $project: {
            _id: 1,
            tournamentId: 1,
            round: 1,
            status: 1,
            team1: 1,
            team2: 1,
            scores: {
              $concatArrays: [
                { $ifNull: ["$team1.playerScores", []] },
                { $ifNull: ["$team2.playerScores", []] },
              ],
            },
          },
        },
        { $unwind: "$scores" },
        {
          $match: {
            "scores.playerId": new (require("mongoose").Types.ObjectId)(id),
          },
        },
        {
          $group: {
            _id: "$scores.playerId",
            matchesWithPoints: { $sum: 1 },
            totalPoints: { $sum: { $ifNull: ["$scores.score", 0] } },
          },
        },
      ]);

      const data = summary[0] || { matchesWithPoints: 0, totalPoints: 0 };
      this.sendSuccess(res, data);
    },
  );

  // Get players by championship count
  getChampions = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const minChampionships = parseInt(req.query.min as string) || 1;

      const champions = await Player.find({
        totalChampionships: { $gte: minChampionships },
      })
        .sort({ totalChampionships: -1, winningPercentage: -1 })
        .select(
          "name totalChampionships individualChampionships divisionChampionships winningPercentage bodsPlayed",
        );

      this.sendSuccess(res, champions);
    },
  );

  // Get player performance trends
  getPerformanceTrends = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      const player = await Player.findById(id);
      if (!player) {
        this.sendNotFound(res, "Player");
        return;
      }

      // This would ideally query tournament results for trend analysis
      // For now, we'll return basic performance metrics
      const performanceData = {
        currentWinningPercentage: player.winningPercentage,
        championshipRatio:
          player.bodsPlayed > 0
            ? player.totalChampionships / player.bodsPlayed
            : 0,
        gamesPerBod:
          player.bodsPlayed > 0 ? player.gamesPlayed / player.bodsPlayed : 0,
        consistencyScore: this.calculateConsistencyScore(player),
      };

      this.sendSuccess(res, performanceData);
    },
  );

  // Update player statistics (for data migration/admin use)
  updateStats = this.asyncHandler(
    async (req: RequestWithAuth, res: Response): Promise<void> => {
      const { id } = req.params;
      const statsUpdate = req.body;

      // Validate that required stats are provided
      const requiredStats = ["gamesPlayed", "gamesWon"];
      const missing = this.validateRequired(requiredStats, statsUpdate);

      if (missing.length > 0) {
        this.sendError(res, `Missing required fields: ${missing.join(", ")}`);
        return;
      }

      // Ensure games won doesn't exceed games played
      if (statsUpdate.gamesWon > statsUpdate.gamesPlayed) {
        this.sendError(res, "Games won cannot exceed games played");
        return;
      }

      const updatedPlayer = await (this.model as any).findByIdAndUpdateSafe(
        id,
        statsUpdate,
      );

      if (!updatedPlayer) {
        this.sendNotFound(res, "Player");
        return;
      }

      this.sendSuccess(
        res,
        updatedPlayer,
        "Player statistics updated successfully",
      );
    },
  );

  // Bulk import players (for data migration)
  bulkImport = this.asyncHandler(
    async (req: RequestWithAuth, res: Response): Promise<void> => {
      const { players } = req.body;

      if (!Array.isArray(players) || players.length === 0) {
        this.sendError(res, "Players array is required");
        return;
      }

      const results = {
        created: 0,
        updated: 0,
        errors: [] as Array<{ name: string; error: string }>,
      };

      for (const playerData of players) {
        try {
          const existingPlayer = await Player.findOne({
            name: playerData.name,
          });

          if (existingPlayer) {
            await (Player as any).findByIdAndUpdateSafe(
              existingPlayer._id.toString(),
              playerData,
            );
            results.updated++;
          } else {
            await Player.create(playerData);
            results.created++;
          }
        } catch (error: any) {
          results.errors.push({
            name: playerData.name || "Unknown",
            error: error.message,
          });
        }
      }

      this.sendSuccess(
        res,
        results,
        `Bulk import completed: ${results.created} created, ${results.updated} updated, ${results.errors.length} errors`,
      );
    },
  );

  // Helper method to calculate consistency score
  private calculateConsistencyScore(player: IPlayer): number {
    // Simple consistency score based on the relationship between
    // best result and average finish
    if (!player.bestResult || !player.avgFinish || player.avgFinish === 0) {
      return 0;
    }

    // Lower ratio = more consistent (best result closer to average)
    const ratio = player.bestResult / player.avgFinish;
    return Math.max(0, Math.min(1, 1 - (ratio - 1)));
  }

  // Validate player data
  private validatePlayerData(data: IPlayerInput): string[] {
    const errors: string[] = [];

    if (data.gamesWon && data.gamesPlayed && data.gamesWon > data.gamesPlayed) {
      errors.push("Games won cannot exceed games played");
    }

    if (
      data.winningPercentage &&
      (data.winningPercentage < 0 || data.winningPercentage > 1)
    ) {
      errors.push("Winning percentage must be between 0 and 1");
    }

    if (data.bestResult && data.avgFinish && data.bestResult > data.avgFinish) {
      errors.push("Best result cannot be worse than average finish");
    }

    // Active status is boolean, so no validation needed other than type check handled by mongoose

    return errors;
  }

  // Override create method to add custom validation
  override create = this.asyncHandler(
    async (req: RequestWithAuth, res: Response): Promise<void> => {
      const validationErrors = this.validatePlayerData(req.body);

      if (validationErrors.length > 0) {
        this.sendValidationError(res, validationErrors);
        return;
      }

      const item = new this.model(req.body);
      const savedItem = await item.save();
      this.sendSuccess(
        res,
        savedItem,
        `${this.modelName} created successfully`,
        undefined,
        201,
      );
    },
  );

  // Override update method to add custom validation
  override update = this.asyncHandler(
    async (req: RequestWithAuth, res: Response): Promise<void> => {
      const { id } = req.params;
      const validationErrors = this.validatePlayerData(req.body);

      if (validationErrors.length > 0) {
        this.sendValidationError(res, validationErrors);
        return;
      }

      const updatedItem = await (this.model as any).findByIdAndUpdateSafe(
        id,
        req.body,
        { new: true, runValidators: true },
      );

      if (!updatedItem) {
        this.sendNotFound(res, this.modelName);
        return;
      }

      this.sendSuccess(
        res,
        updatedItem,
        `${this.modelName} updated successfully`,
      );
    },
  );
}

export default new PlayerController();
