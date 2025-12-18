import { Request, Response, NextFunction } from 'express';
import { Player } from '../models/Player';
import { IPlayer, IPlayerInput, IPlayerFilter } from '../types/player';
import { BaseController, RequestWithAuth } from './base';
import { ApiResponse } from '../types/common';

export class PlayerController extends BaseController<IPlayer> {
  constructor() {
    super(Player, 'Player');
  }

  // Override buildFilter for player-specific filtering
  protected override buildFilter(query: any): IPlayerFilter {
    const filter: IPlayerFilter = {};
    const { page, limit, sort, select, populate, q, ...filterParams } = query;

    // Name search (case insensitive)
    if (filterParams.name) {
      filter.name = new RegExp(filterParams.name, 'i');
    }

    // Numeric range filters
    const numericFields = ['bodsPlayed', 'bestResult', 'avgFinish', 'winningPercentage', 'totalChampionships', 'gamesPlayed', 'gamesWon'];

    numericFields.forEach(field => {
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
      filter.division = new RegExp(filterParams.division, 'i');
    }

    // City/State filtering
    if (filterParams.city) {
      filter.city = new RegExp(filterParams.city, 'i');
    }
    if (filterParams.state) {
      filter.state = new RegExp(filterParams.state, 'i');
    }

    return filter;
  }

  // Override buildSearchFilter for player-specific search
  protected override buildSearchFilter(searchTerm: string): any {
    return {
      $or: [
        { name: new RegExp(searchTerm, 'i') },
        { pairing: new RegExp(searchTerm, 'i') },
      ],
    };
  }

  // Get player statistics
  getStats = this.asyncHandler(async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await Player.aggregate([
        {
          $group: {
            _id: null,
            totalPlayers: { $sum: 1 },
            avgWinningPercentage: { $avg: '$winningPercentage' },
            avgBodsPlayed: { $avg: '$bodsPlayed' },
            totalChampionships: { $sum: '$totalChampionships' },
            maxWinningPercentage: { $max: '$winningPercentage' },
            minWinningPercentage: { $min: '$winningPercentage' },
          },
        },
      ]);

      const topPlayers = await Player.find({})
        .sort({ winningPercentage: -1, totalChampionships: -1 })
        .limit(10)
        .select('name winningPercentage totalChampionships bodsPlayed');

      const response: ApiResponse = {
        success: true,
        data: {
          overview: stats[0] || {},
          topPlayers,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  });

  // Aggregate per-player scoring from matches
  getScoringSummary = this.asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      // Aggregate from Match collection team1.playerScores / team2.playerScores
      const summary = await (this.model as any).db.model('Match').aggregate([
        {
          $match: {
            $or: [
              { 'team1.playerScores.playerId': new (require('mongoose').Types.ObjectId)(id) },
              { 'team2.playerScores.playerId': new (require('mongoose').Types.ObjectId)(id) }
            ]
          }
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
                { $ifNull: ['$team1.playerScores', []] },
                { $ifNull: ['$team2.playerScores', []] }
              ]
            }
          }
        },
        { $unwind: '$scores' },
        { $match: { 'scores.playerId': new (require('mongoose').Types.ObjectId)(id) } },
        {
          $group: {
            _id: '$scores.playerId',
            matchesWithPoints: { $sum: 1 },
            totalPoints: { $sum: { $ifNull: ['$scores.score', 0] } },
          }
        }
      ]);

      const data = summary[0] || { matchesWithPoints: 0, totalPoints: 0 };

      const response: ApiResponse = {
        success: true,
        data,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  });

  // Get players by championship count
  getChampions = this.asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const minChampionships = parseInt(req.query.min as string) || 1;

      const champions = await Player.find({
        totalChampionships: { $gte: minChampionships }
      })
        .sort({ totalChampionships: -1, winningPercentage: -1 })
        .select('name totalChampionships individualChampionships divisionChampionships winningPercentage bodsPlayed');

      const response: ApiResponse = {
        success: true,
        data: champions,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  });

  // Get player performance trends
  getPerformanceTrends = this.asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const player = await Player.findById(id);
      if (!player) {
        this.sendError(res, 404, 'Player not found');
        return;
      }

      // This would ideally query tournament results for trend analysis
      // For now, we'll return basic performance metrics
      const performanceData = {
        currentWinningPercentage: player.winningPercentage,
        championshipRatio: player.bodsPlayed > 0 ? player.totalChampionships / player.bodsPlayed : 0,
        gamesPerBod: player.bodsPlayed > 0 ? player.gamesPlayed / player.bodsPlayed : 0,
        consistencyScore: this.calculateConsistencyScore(player),
      };

      const response: ApiResponse = {
        success: true,
        data: performanceData,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  });

  // Update player statistics (for data migration/admin use)
  updateStats = this.asyncHandler(async (req: RequestWithAuth, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const statsUpdate = req.body;

      // Validate that required stats are provided
      const requiredStats = ['gamesPlayed', 'gamesWon'];
      const missing = this.validateRequired(requiredStats, statsUpdate);

      if (missing.length > 0) {
        this.sendError(res, 400, `Missing required fields: ${missing.join(', ')}`);
        return;
      }

      // Ensure games won doesn't exceed games played
      if (statsUpdate.gamesWon > statsUpdate.gamesPlayed) {
        this.sendError(res, 400, 'Games won cannot exceed games played');
        return;
      }

      const updatedPlayer = await Player.findByIdAndUpdateSafe(id, statsUpdate);

      if (!updatedPlayer) {
        this.sendError(res, 404, 'Player not found');
        return;
      }

      this.sendSuccess(res, updatedPlayer, 'Player statistics updated successfully');
    } catch (error) {
      next(error);
    }
  });

  // Bulk import players (for data migration)
  bulkImport = this.asyncHandler(async (req: RequestWithAuth, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { players } = req.body;

      if (!Array.isArray(players) || players.length === 0) {
        this.sendError(res, 400, 'Players array is required');
        return;
      }

      const results = {
        created: 0,
        updated: 0,
        errors: [] as Array<{ name: string; error: string }>,
      };

      for (const playerData of players) {
        try {
          const existingPlayer = await Player.findOne({ name: playerData.name });

          if (existingPlayer) {
            await Player.findByIdAndUpdateSafe(existingPlayer._id.toString(), playerData);
            results.updated++;
          } else {
            await Player.create(playerData);
            results.created++;
          }
        } catch (error: any) {
          results.errors.push({
            name: playerData.name || 'Unknown',
            error: error.message,
          });
        }
      }

      const response: ApiResponse = {
        success: true,
        data: results,
        message: `Bulk import completed: ${results.created} created, ${results.updated} updated, ${results.errors.length} errors`,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  });

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
      errors.push('Games won cannot exceed games played');
    }

    if (data.winningPercentage && (data.winningPercentage < 0 || data.winningPercentage > 1)) {
      errors.push('Winning percentage must be between 0 and 1');
    }

    if (data.bestResult && data.avgFinish && data.bestResult > data.avgFinish) {
      errors.push('Best result cannot be worse than average finish');
    }

    // Active status is boolean, so no validation needed other than type check handled by mongoose

    return errors;
  }

  // Override create method to add custom validation
  override async create(req: RequestWithAuth, res: Response, next: NextFunction): Promise<void> {
    try {
      const validationErrors = this.validatePlayerData(req.body);

      if (validationErrors.length > 0) {
        this.sendError(res, 400, validationErrors.join(', '));
        return;
      }

      // Call parent create method
      await super.create(req, res, next);
    } catch (error) {
      next(error);
    }
  }

  // Override update method to add custom validation
  override async update(req: RequestWithAuth, res: Response, next: NextFunction): Promise<void> {
    try {
      const validationErrors = this.validatePlayerData(req.body);

      if (validationErrors.length > 0) {
        this.sendError(res, 400, validationErrors.join(', '));
        return;
      }

      // Call parent update method
      await super.update(req, res, next);
    } catch (error) {
      next(error);
    }
  }
}

export const playerController = new PlayerController();
