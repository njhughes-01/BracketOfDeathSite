import { Request, Response, NextFunction } from 'express';
import { Tournament } from '../models/Tournament';
import { TournamentResult } from '../models/TournamentResult';
import { Player } from '../models/Player';
import { ITournament, ITournamentInput, ITournamentFilter, TournamentFormats } from '../types/tournament';
import { BaseController, RequestWithAuth } from './base';
import { ApiResponse } from '../types/common';

export class TournamentController extends BaseController<ITournament> {
  constructor() {
    super(Tournament, 'Tournament');
  }

  // Override buildFilter for tournament-specific filtering
  protected override buildFilter(query: any): ITournamentFilter {
    const filter: ITournamentFilter = {};
    const { page, limit, sort, select, populate, q, ...filterParams } = query;

    // Date range filtering
    if (filterParams.startDate || filterParams.endDate) {
      filter.date = {};
      if (filterParams.startDate) {
        filter.date.$gte = new Date(filterParams.startDate);
      }
      if (filterParams.endDate) {
        filter.date.$lte = new Date(filterParams.endDate);
      }
    } else if (filterParams.date) {
      (filter as any).date = new Date(filterParams.date);
    }

    // Year filtering
    if (filterParams.year) {
      const year = parseInt(filterParams.year);
      filter.date = {
        $gte: new Date(`${year}-01-01`),
        $lte: new Date(`${year}-12-31`),
      };
    }

    // BOD number filtering
    if (filterParams.bodNumber) {
      filter.bodNumber = parseInt(filterParams.bodNumber);
    } else if (filterParams.bodNumber_min || filterParams.bodNumber_max) {
      filter.bodNumber = {};
      if (filterParams.bodNumber_min) {
        (filter.bodNumber as any).$gte = parseInt(filterParams.bodNumber_min);
      }
      if (filterParams.bodNumber_max) {
        (filter.bodNumber as any).$lte = parseInt(filterParams.bodNumber_max);
      }
    }

    // Format filtering
    if (filterParams.format) {
      filter.format = filterParams.format;
    }

    // Location search (case insensitive)
    if (filterParams.location) {
      filter.location = new RegExp(filterParams.location, 'i');
    }

    // Advancement criteria search
    if (filterParams.advancementCriteria) {
      filter.advancementCriteria = new RegExp(filterParams.advancementCriteria, 'i');
    }

    return filter;
  }

  // Override buildSearchFilter for tournament-specific search
  protected override buildSearchFilter(searchTerm: string): any {
    return {
      $or: [
        { location: new RegExp(searchTerm, 'i') },
        { notes: new RegExp(searchTerm, 'i') },
        { advancementCriteria: new RegExp(searchTerm, 'i') },
      ],
    };
  }

  // Get tournament statistics
  getStats = this.asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await Tournament.aggregate([
        {
          $group: {
            _id: null,
            totalTournaments: { $sum: 1 },
            formats: { $addToSet: '$format' },
            locations: { $addToSet: '$location' },
            earliestDate: { $min: '$date' },
            latestDate: { $max: '$date' },
          },
        },
      ]);

      const formatStats = await Tournament.aggregate([
        {
          $group: {
            _id: '$format',
            count: { $sum: 1 },
          },
        },
        {
          $sort: { count: -1 },
        },
      ]);

      const yearlyStats = await Tournament.aggregate([
        {
          $group: {
            _id: { $year: '$date' },
            count: { $sum: 1 },
            formats: { $addToSet: '$format' },
          },
        },
        {
          $sort: { _id: -1 },
        },
      ]);

      const response: ApiResponse = {
        success: true,
        data: {
          overview: stats[0] || {},
          formatBreakdown: formatStats,
          yearlyBreakdown: yearlyStats,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  });

  // Get tournaments by year
  getByYear = this.asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { year } = req.params;
      const yearInt = parseInt(year);

      if (isNaN(yearInt) || yearInt < 2009 || yearInt > new Date().getFullYear() + 10) {
        this.sendError(res, 400, 'Invalid year provided');
        return;
      }

      const tournaments = await Tournament.find({
        date: {
          $gte: new Date(`${yearInt}-01-01`),
          $lte: new Date(`${yearInt}-12-31`),
        },
      }).sort({ date: 1 });

      const response: ApiResponse = {
        success: true,
        data: tournaments,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  });

  // Get tournaments by format
  getByFormat = this.asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { format } = req.params;

      if (!TournamentFormats.includes(format as any)) {
        this.sendError(res, 400, `Invalid format. Must be one of: ${TournamentFormats.join(', ')}`);
        return;
      }

      const tournaments = await Tournament.find({ format }).sort({ date: -1 });

      const response: ApiResponse = {
        success: true,
        data: tournaments,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  });

  // Get tournament with results
  getWithResults = this.asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const tournament = await Tournament.findById(id);
      if (!tournament) {
        this.sendError(res, 404, 'Tournament not found');
        return;
      }

      const results = await TournamentResult.find({ tournamentId: id })
        .populate('players', 'name')
        .sort({ 'totalStats.finalRank': 1, 'totalStats.winPercentage': -1 });

      const response: ApiResponse = {
        success: true,
        data: {
          tournament,
          results,
          resultCount: results.length,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  });

  // Get upcoming tournaments
  getUpcoming = this.asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const now = new Date();
      const limit = parseInt(req.query.limit as string) || 10;

      const upcomingTournaments = await Tournament.find({
        date: { $gte: now },
      })
        .sort({ date: 1 })
        .limit(limit);

      const response: ApiResponse = {
        success: true,
        data: upcomingTournaments,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  });

  // Get recent tournaments
  getRecent = this.asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;

      const recentTournaments = await Tournament.find({})
        .sort({ date: -1 })
        .limit(limit);

      const response: ApiResponse = {
        success: true,
        data: recentTournaments,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  });

  // Get open tournaments for registration
  listOpen = this.asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const now = new Date();

      const openTournaments = await Tournament.find({
        $or: [
          { allowSelfRegistration: true },
          { registrationType: 'open' }
        ],
        status: { $in: ['scheduled', 'open'] }, // Ensure tournament isn't completed or in progress (unless late join allowed?)
        // Ensure registration window is valid if dates are set
        $and: [
          { $or: [{ registrationOpensAt: { $exists: false } }, { registrationOpensAt: { $lte: now } }] },
          { $or: [{ registrationDeadline: { $exists: false } }, { registrationDeadline: { $gte: now } }] }
        ]
      }).sort({ date: 1 });

      const response: ApiResponse = {
        success: true,
        data: openTournaments,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  });

  // Join a tournament (Self-registration)
  join = this.asyncHandler(async (req: RequestWithAuth, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { playerId } = req.body;
      const userId = req.user?.id; // Keycloak user ID

      // 1. Validate Tournament
      const tournament = await Tournament.findById(id);
      if (!tournament) {
        this.sendError(res, 404, 'Tournament not found');
        return;
      }

      // 2. Validate Registration Rules
      if (!tournament.allowSelfRegistration && tournament.registrationType !== 'open') {
        this.sendError(res, 403, 'Self-registration is not allowed for this tournament');
        return;
      }

      const now = new Date();
      if (tournament.registrationOpensAt && now < new Date(tournament.registrationOpensAt)) {
        this.sendError(res, 400, 'Registration is not yet open');
        return;
      }
      if (tournament.registrationDeadline && now > new Date(tournament.registrationDeadline)) {
        this.sendError(res, 400, 'Registration deadline has passed');
        return;
      }

      // 3. Find Player Profile
      // If playerId is provided, verify it. If not, try to find linked player for user.
      let player;

      if (playerId) {
        // Explicit playerId provided (verify user owns it or is admin?)
        // For now, assuming if they provide it, we check if it's valid. 
        // ideally we should check if this Keycloak user is linked to this player.
        // But for open simple registration, let's verify existence.
        player = await Player.findById(playerId);
      } else {
        // TODO: Look up player by Keycloak ID (userId). 
        // For now, require playerId in body or fail.
        // In ideal flow, the frontend passes the linked playerId.
        this.sendError(res, 400, 'Player ID is required for registration');
        return;
      }

      if (!player) {
        this.sendError(res, 404, 'Player profile not found');
        return;
      }

      // 4. Check Duplicate Registration
      const isRegistered = tournament.registeredPlayers.some((p: any) => p.playerId?.toString() === playerId || p.toString() === playerId);
      const isWaitlisted = tournament.waitlistPlayers.some((p: any) => p.playerId?.toString() === playerId || p.toString() === playerId);

      if (isRegistered) {
        this.sendError(res, 400, 'Player already registered');
        return;
      }
      if (isWaitlisted) {
        this.sendError(res, 400, 'Player already on waitlist');
        return;
      }

      // 5. Add to Tournament (Register or Waitlist)
      const maxPlayers = tournament.maxPlayers || 32; // Default if not set
      const currentCount = tournament.registeredPlayers.length;

      let status = 'registered';
      if (currentCount >= maxPlayers) {
        // Add to waitlist
        tournament.waitlistPlayers.push({
          playerId: player._id,
          registeredAt: now
        } as any);
        status = 'waitlisted';
      } else {
        // Register
        tournament.registeredPlayers.push({
          playerId: player._id,
          registeredAt: now
        } as any);
      }

      await tournament.save();

      const response: ApiResponse = {
        success: true,
        data: {
          tournamentId: tournament._id,
          playerId: player._id,
          status,
          message: status === 'registered' ? 'Successfully registered for tournament' : 'Tournament full. Added to waitlist.'
        }
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  });

  // Get next BOD number for tournament creation
  getNextBodNumber = this.asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Find the highest BOD number currently in use
      const latestTournament = await Tournament.findOne({})
        .sort({ bodNumber: -1 })
        .select('bodNumber');

      const nextBodNumber = latestTournament ? latestTournament.bodNumber + 1 : 1;

      const response: ApiResponse = {
        success: true,
        data: { nextBodNumber },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  });

  // Generate player seeds based on historical data
  generatePlayerSeeds = this.asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('generatePlayerSeeds called with:', req.body);
      const { method = 'historical', parameters = {} } = req.body;

      // Get all players with their career statistics
      const players = await this.getAllPlayersWithStats();
      console.log(`Found ${players.length} players for seeding`);

      if (players.length === 0) {
        this.sendError(res, 404, 'No players found for seeding');
        return;
      }

      // Calculate seeds based on the selected method
      let playerSeeds: any[] = [];

      switch (method) {
        case 'historical':
          playerSeeds = this.calculateHistoricalSeeds(players, parameters);
          break;
        case 'recent_form':
          playerSeeds = this.calculateRecentFormSeeds(players, parameters);
          break;
        case 'elo':
          playerSeeds = this.calculateEloSeeds(players, parameters);
          break;
        case 'manual':
          // Return players without automatic seeding
          playerSeeds = players.map((player, index) => ({
            playerId: player._id,
            playerName: player.name,
            seed: index + 1,
            statistics: this.getPlayerStatistics(player)
          }));
          break;
        default:
          playerSeeds = this.calculateHistoricalSeeds(players, parameters);
      }

      console.log(`Generated ${playerSeeds.length} player seeds`);

      const response: ApiResponse = {
        success: true,
        data: playerSeeds,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in generatePlayerSeeds:', error);
      next(error);
    }
  });

  // Generate teams based on seeded players
  generateTeams = this.asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { playerIds, config } = req.body;

      if (!Array.isArray(playerIds) || playerIds.length === 0) {
        this.sendError(res, 400, 'Player IDs array is required');
        return;
      }

      // Get player data for team formation
      const players = await this.getPlayersById(playerIds);

      if (players.length !== playerIds.length) {
        this.sendError(res, 400, 'Some players not found');
        return;
      }

      // Generate teams based on configuration
      const teams = await this.formTeams(players, config);

      const response: ApiResponse = {
        success: true,
        data: teams,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  });

  // Setup complete tournament with all configurations
  setupTournament = this.asyncHandler(async (req: RequestWithAuth, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('setupTournament called with body:', JSON.stringify(req.body, null, 2));

      let { basicInfo, seedingConfig, teamFormationConfig, bracketType, maxPlayers, selectedPlayers, generatedSeeds, generatedTeams } = req.body;

      // Ensure bracketType has a default if not provided
      if (!bracketType) {
        bracketType = 'round_robin_playoff'; // Default to standard format
      }

      // Validate basicInfo exists and has required fields
      if (!basicInfo) {
        this.sendError(res, 400, 'basicInfo is required');
        return;
      }

      const requiredFields = ['date', 'bodNumber', 'format', 'location', 'advancementCriteria'];
      const missingFields = requiredFields.filter(field => !basicInfo[field]);

      if (missingFields.length > 0) {
        this.sendError(res, 400, `Missing required fields in basicInfo: ${missingFields.join(', ')}`);
        return;
      }

      console.log('Creating tournament with data:', {
        ...basicInfo,
        maxPlayers,
        status: basicInfo.status || 'scheduled',
        players: selectedPlayers || [],
        seedingConfig,
        teamFormationConfig,
        bracketType,
        generatedSeeds: generatedSeeds || [],
        generatedTeams: generatedTeams || []
      });

      // Create the tournament record
      const tournament = await Tournament.create({
        ...basicInfo,
        maxPlayers,
        status: basicInfo.status || 'scheduled',
        players: selectedPlayers || [],
        seedingConfig,
        teamFormationConfig,
        bracketType,
        generatedSeeds: generatedSeeds || [],
        generatedTeams: generatedTeams || []
      });

      const response: ApiResponse = {
        success: true,
        data: tournament,
        message: 'Tournament setup completed successfully'
      };

      res.status(201).json(response);
    } catch (error: any) {
      console.error('Error in setupTournament:', error);
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map((err: any) => err.message).join(', ');
        this.sendError(res, 400, `Validation error: ${validationErrors}`);
      } else {
        next(error);
      }
    }
  });

  // Bulk import tournaments (for data migration)
  bulkImport = this.asyncHandler(async (req: RequestWithAuth, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tournaments } = req.body;

      if (!Array.isArray(tournaments) || tournaments.length === 0) {
        this.sendError(res, 400, 'Tournaments array is required');
        return;
      }

      const results = {
        created: 0,
        updated: 0,
        errors: [] as Array<{ bodNumber: number; error: string }>,
      };

      for (const tournamentData of tournaments) {
        try {
          const existingTournament = await Tournament.findOne({
            bodNumber: tournamentData.bodNumber
          });

          if (existingTournament) {
            await Tournament.findByIdAndUpdateSafe(existingTournament._id.toString(), tournamentData);
            results.updated++;
          } else {
            await Tournament.create(tournamentData);
            results.created++;
          }
        } catch (error: any) {
          results.errors.push({
            bodNumber: tournamentData.bodNumber || 0,
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

  // Validate tournament data
  private validateTournamentData(data: ITournamentInput): string[] {
    const errors: string[] = [];

    // Validate date
    if (data.date) {
      const date = new Date(data.date);
      const minDate = new Date('2009-01-01');
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 10);

      if (date < minDate || date > maxDate) {
        errors.push('Date must be between 2009 and 10 years in the future');
      }
    }

    // Validate BOD number format
    if (data.bodNumber) {
      const bodStr = data.bodNumber.toString();
      if (bodStr.length !== 6) {
        errors.push('BOD number must be 6 digits (YYYYMM)');
      } else {
        const year = parseInt(bodStr.substring(0, 4));
        const month = parseInt(bodStr.substring(4, 6));

        if (year < 2009 || month < 1 || month > 12) {
          errors.push('BOD number must be valid (YYYYMM format)');
        }
      }
    }

    // Validate format
    if (data.format && !TournamentFormats.includes(data.format as any)) {
      errors.push(`Format must be one of: ${TournamentFormats.join(', ')}`);
    }

    // Validate date and BOD number consistency
    if (data.date && data.bodNumber) {
      const date = new Date(data.date);
      const bodStr = data.bodNumber.toString();
      const bodYear = parseInt(bodStr.substring(0, 4));
      const bodMonth = parseInt(bodStr.substring(4, 6));

      if (date.getFullYear() !== bodYear || (date.getMonth() + 1) !== bodMonth) {
        errors.push('Date must match BOD number year and month');
      }
    }

    return errors;
  }

  // Helper method to get all players with career statistics
  private async getAllPlayersWithStats() {
    return Player.find({}).lean();
  }

  // Helper method to get players by IDs
  private async getPlayersById(playerIds: string[]) {
    return Player.find({ _id: { $in: playerIds } }).lean();
  }

  // Helper method to extract player statistics
  private getPlayerStatistics(player: any) {
    return {
      avgFinish: player.avgFinish || 0,
      winningPercentage: player.winningPercentage || 0,
      totalChampionships: player.totalChampionships || 0,
      bodsPlayed: player.bodsPlayed || 0,
      recentForm: player.recentForm || 0
    };
  }

  // Calculate seeds based on historical performance
  private calculateHistoricalSeeds(players: any[], parameters: any) {
    const {
      championshipWeight = 0.3,
      winPercentageWeight = 0.4,
      avgFinishWeight = 0.3
    } = parameters;

    // Calculate composite score for each player
    const playersWithScores = players.map(player => {
      const stats = this.getPlayerStatistics(player);

      // Normalize championship count (higher = better)
      const champScore = stats.totalChampionships;

      // Win percentage is already normalized (0-1)
      const winPctScore = stats.winningPercentage;

      // Average finish (lower = better, so we invert it)
      const avgFinishScore = stats.bodsPlayed > 0 ? (1 / (stats.avgFinish || 1)) : 0;

      const compositeScore =
        (champScore * championshipWeight) +
        (winPctScore * winPercentageWeight) +
        (avgFinishScore * avgFinishWeight);

      return {
        ...player,
        compositeScore,
        statistics: stats
      };
    });

    // Sort by composite score (descending) and assign seeds
    playersWithScores.sort((a, b) => b.compositeScore - a.compositeScore);

    return playersWithScores.map((player, index) => ({
      playerId: player._id,
      playerName: player.name,
      seed: index + 1,
      statistics: player.statistics
    }));
  }

  // Calculate seeds based on recent form (last N tournaments)
  private calculateRecentFormSeeds(players: any[], parameters: any) {
    // For now, use similar logic to historical but could be enhanced
    // to actually look at recent tournament results
    return this.calculateHistoricalSeeds(players, parameters);
  }

  // Calculate seeds based on ELO rating
  private calculateEloSeeds(players: any[], parameters: any) {
    // For now, use historical method as ELO would require match-by-match data
    return this.calculateHistoricalSeeds(players, parameters);
  }

  // Form teams based on configuration
  private async formTeams(players: any[], config: any) {
    const { method = 'manual', parameters = {} } = config;

    switch (method) {
      case 'preformed':
        return this.handlePreformedTeams(players, parameters);
      case 'draft':
        return this.handleDraftTeams(players, parameters);
      case 'statistical_pairing':
        return this.handleStatisticalPairing(players, parameters);
      case 'random':
        return this.handleRandomPairing(players);
      case 'manual':
      default:
        return this.handleManualTeams(players);
    }
  }

  // Handle preformed teams
  private handlePreformedTeams(players: any[], parameters: any) {
    // Placeholder - would need team formation data
    return this.handleManualTeams(players);
  }

  // Handle draft-style team formation
  private handleDraftTeams(players: any[], parameters: any) {
    // Placeholder - would implement snake draft algorithm
    return this.handleStatisticalPairing(players, parameters);
  }

  // Handle statistical pairing for balanced teams
  private handleStatisticalPairing(players: any[], parameters: any) {
    const { skillBalancing = true } = parameters;

    if (!skillBalancing) {
      return this.handleRandomPairing(players);
    }

    // Sort players by skill level (composite score)
    const sortedPlayers = players.map(player => ({
      ...player,
      skillScore: (player.winningPercentage || 0) * 100 + (player.totalChampionships || 0) * 10
    })).sort((a, b) => b.skillScore - a.skillScore);

    // Pair high with low skill players for balance
    const teams = [];
    const teamCount = Math.floor(sortedPlayers.length / 2);

    for (let i = 0; i < teamCount; i++) {
      const highSkillPlayer = sortedPlayers[i];
      const lowSkillPlayer = sortedPlayers[sortedPlayers.length - 1 - i];

      const combinedSeed = Math.ceil((i + 1 + (teamCount - i)) / 2);

      teams.push({
        teamId: `team_${i + 1}`,
        players: [
          {
            playerId: highSkillPlayer._id,
            playerName: highSkillPlayer.name,
            seed: i + 1,
            statistics: this.getPlayerStatistics(highSkillPlayer)
          },
          {
            playerId: lowSkillPlayer._id,
            playerName: lowSkillPlayer.name,
            seed: sortedPlayers.length - i,
            statistics: this.getPlayerStatistics(lowSkillPlayer)
          }
        ],
        combinedSeed,
        teamName: `${highSkillPlayer.name} & ${lowSkillPlayer.name}`,
        combinedStatistics: {
          avgFinish: ((highSkillPlayer.avgFinish || 0) + (lowSkillPlayer.avgFinish || 0)) / 2,
          combinedWinPercentage: ((highSkillPlayer.winningPercentage || 0) + (lowSkillPlayer.winningPercentage || 0)) / 2,
          totalChampionships: (highSkillPlayer.totalChampionships || 0) + (lowSkillPlayer.totalChampionships || 0),
          combinedBodsPlayed: (highSkillPlayer.bodsPlayed || 0) + (lowSkillPlayer.bodsPlayed || 0)
        }
      });
    }

    return teams;
  }

  // Handle random pairing
  private handleRandomPairing(players: any[]) {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const teams = [];

    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 < shuffled.length) {
        const player1 = shuffled[i];
        const player2 = shuffled[i + 1];

        teams.push({
          teamId: `team_${Math.floor(i / 2) + 1}`,
          players: [
            {
              playerId: player1._id,
              playerName: player1.name,
              seed: i + 1,
              statistics: this.getPlayerStatistics(player1)
            },
            {
              playerId: player2._id,
              playerName: player2.name,
              seed: i + 2,
              statistics: this.getPlayerStatistics(player2)
            }
          ],
          combinedSeed: Math.floor(i / 2) + 1,
          teamName: `${player1.name} & ${player2.name}`,
          combinedStatistics: {
            avgFinish: ((player1.avgFinish || 0) + (player2.avgFinish || 0)) / 2,
            combinedWinPercentage: ((player1.winningPercentage || 0) + (player2.winningPercentage || 0)) / 2,
            totalChampionships: (player1.totalChampionships || 0) + (player2.totalChampionships || 0),
            combinedBodsPlayed: (player1.bodsPlayed || 0) + (player2.bodsPlayed || 0)
          }
        });
      }
    }

    return teams;
  }

  // Handle manual team assignment
  private handleManualTeams(players: any[]) {
    // Return individual players as "teams" for manual assignment
    return players.map((player, index) => ({
      teamId: `player_${player._id}`,
      players: [{
        playerId: player._id,
        playerName: player.name,
        seed: index + 1,
        statistics: this.getPlayerStatistics(player)
      }],
      combinedSeed: index + 1,
      teamName: player.name,
      combinedStatistics: this.getPlayerStatistics(player)
    }));
  }

  // Override create method to add custom validation
  override create = async (req: RequestWithAuth, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validationErrors = this.validateTournamentData(req.body);

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
  override update = async (req: RequestWithAuth, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validationErrors = this.validateTournamentData(req.body);

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

  // Delete tournament with cascade delete of results
  override delete = async (req: RequestWithAuth, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { cascade } = req.query;

      const tournament = await Tournament.findById(id);
      if (!tournament) {
        this.sendError(res, 404, 'Tournament not found');
        return;
      }

      // Check if tournament has results
      const resultsCount = await TournamentResult.countDocuments({ tournamentId: id });

      if (resultsCount > 0 && cascade !== 'true') {
        this.sendError(res, 400,
          `Tournament has ${resultsCount} results. Use ?cascade=true to delete tournament and all results.`);
        return;
      }

      // Delete results first if cascade is true
      if (cascade === 'true' && resultsCount > 0) {
        await TournamentResult.deleteMany({ tournamentId: id });
      }

      // Delete the tournament
      await Tournament.findByIdAndDelete(id);

      const response: ApiResponse = {
        success: true,
        message: cascade === 'true' && resultsCount > 0
          ? `Tournament and ${resultsCount} results deleted successfully`
          : 'Tournament deleted successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}

export const tournamentController = new TournamentController();