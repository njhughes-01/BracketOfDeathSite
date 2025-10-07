import { Request, Response, NextFunction } from 'express';
import { Tournament } from '../models/Tournament';
import { Player } from '../models/Player';
import { Match } from '../models/Match';
import { TournamentResult } from '../models/TournamentResult';
import { ITournament, TournamentStatus } from '../types/tournament';
import { IMatch, MatchRound, calculateBracketMatches } from '../types/match';
import { BaseController, RequestWithAuth } from './base';
import { ApiResponse, ErrorMessages } from '../types/common';
import { Types } from 'mongoose';
import { TournamentDeletionService, TournamentDeletionError } from '../services/TournamentDeletionService';

export class TournamentAdminController extends BaseController<ITournament> {
  constructor() {
    super(Tournament, 'Tournament');
  }

  /**
   * Update tournament status with validation
   */
  public updateStatus = async (req: RequestWithAuth, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body as { status: TournamentStatus };

      if (!status) {
        res.status(400).json({
          success: false,
          message: 'Status is required',
          data: null,
        });
        return;
      }

      const tournament = await Tournament.findById(id);
      if (!tournament) {
        res.status(404).json({
          success: false,
          message: 'Tournament not found',
          data: null,
        });
        return;
      }

      // Validate status transition
      const oldStatus = tournament.status;
      tournament.status = status;

      try {
        await tournament.save();
      } catch (error: any) {
        if (error.message.includes('Invalid status transition')) {
          res.status(400).json({
            success: false,
            message: `Cannot transition from ${oldStatus} to ${status}`,
            data: null,
          });
          return;
        }
        throw error;
      }

      const response: ApiResponse<ITournament> = {
        success: true,
        message: `Tournament status updated to ${status}`,
        data: tournament,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Add players to a tournament
   */
  public addPlayers = async (req: RequestWithAuth, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { playerIds } = req.body as { playerIds: string[] };

      if (!playerIds || !Array.isArray(playerIds)) {
        res.status(400).json({
          success: false,
          message: 'Player IDs array is required',
          data: null,
        });
        return;
      }

      const tournament = await Tournament.findById(id).populate('players', 'name');
      if (!tournament) {
        res.status(404).json({
          success: false,
          message: 'Tournament not found',
          data: null,
        });
        return;
      }

      // Check if tournament allows player additions
      if (!['scheduled', 'open'].includes(tournament.status)) {
        res.status(400).json({
          success: false,
          message: 'Players can only be added to scheduled or open tournaments',
          data: null,
        });
        return;
      }

      // Validate players exist
      const objectIds = playerIds.map(id => new Types.ObjectId(id));
      const players = await Player.find({ _id: { $in: objectIds } });
      
      if (players.length !== playerIds.length) {
        res.status(400).json({
          success: false,
          message: 'One or more players not found',
          data: null,
        });
        return;
      }

      // Add new players (avoid duplicates)
      const existingPlayerIds = tournament.players?.map(p => p.toString()) || [];
      const newPlayerIds = objectIds.filter(id => !existingPlayerIds.includes(id.toString()));
      
      if (newPlayerIds.length === 0) {
        res.status(400).json({
          success: false,
          message: 'All players are already registered for this tournament',
          data: null,
        });
        return;
      }

      tournament.players = [...(tournament.players || []), ...newPlayerIds];

      // Check max players limit
      if (tournament.maxPlayers && tournament.players.length > tournament.maxPlayers) {
        res.status(400).json({
          success: false,
          message: `Tournament is limited to ${tournament.maxPlayers} players`,
          data: null,
        });
        return;
      }

      await tournament.save();

      const updatedTournament = await Tournament.findById(id).populate('players', 'name firstName lastName');

      const response: ApiResponse<ITournament> = {
        success: true,
        message: `Added ${newPlayerIds.length} players to tournament`,
        data: updatedTournament!,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Remove a player from a tournament
   */
  public removePlayer = async (req: RequestWithAuth, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id, playerId } = req.params;

      const tournament = await Tournament.findById(id);
      if (!tournament) {
        res.status(404).json({
          success: false,
          message: 'Tournament not found',
          data: null,
        });
        return;
      }

      // Check if tournament allows player removal
      if (!['scheduled', 'open'].includes(tournament.status)) {
        res.status(400).json({
          success: false,
          message: 'Players can only be removed from scheduled or open tournaments',
          data: null,
        });
        return;
      }

      const playerObjectId = new Types.ObjectId(playerId);
      const playerIndex = tournament.players?.findIndex(p => p.toString() === playerId);

      if (playerIndex === undefined || playerIndex === -1) {
        res.status(404).json({
          success: false,
          message: 'Player not found in this tournament',
          data: null,
        });
        return;
      }

      tournament.players?.splice(playerIndex, 1);
      await tournament.save();

      const updatedTournament = await Tournament.findById(id).populate('players', 'name firstName lastName');

      const response: ApiResponse<ITournament> = {
        success: true,
        message: 'Player removed from tournament',
        data: updatedTournament!,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Generate matches for a tournament (create bracket)
   */
  public generateMatches = async (req: RequestWithAuth, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { bracketType = 'single-elimination' } = req.body as { bracketType?: string };

      const tournament = await Tournament.findById(id).populate('players', 'name firstName lastName');
      if (!tournament) {
        res.status(404).json({
          success: false,
          message: 'Tournament not found',
          data: null,
        });
        return;
      }

      // Check if tournament can start
      if (tournament.status !== 'open') {
        res.status(400).json({
          success: false,
          message: 'Tournament must be open to generate matches',
          data: null,
        });
        return;
      }

      const playerCount = tournament.players?.length || 0;
      if (playerCount < 2) {
        res.status(400).json({
          success: false,
          message: 'Tournament needs at least 2 players to generate matches',
          data: null,
        });
        return;
      }

      // Check if matches already exist
      const existingMatches = await Match.find({ tournamentId: id });
      if (existingMatches.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Matches already exist for this tournament',
          data: null,
        });
        return;
      }

      // For doubles tournaments, we need an even number of players (teams of 2)
      const isDoubles = ['Mixed', 'Men\'s Doubles', 'Women\'s Doubles'].includes(tournament.format);
      if (isDoubles && playerCount % 2 !== 0) {
        res.status(400).json({
          success: false,
          message: 'Doubles tournaments require an even number of players',
          data: null,
        });
        return;
      }

      // Generate bracket matches
      const matches = await this.createBracketMatches(tournament, isDoubles);

      // Update tournament status to active
      tournament.status = 'active';
      await tournament.save();

      const response: ApiResponse<{ tournament: ITournament; matches: IMatch[] }> = {
        success: true,
        message: `Generated ${matches.length} matches for tournament`,
        data: { tournament, matches },
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update match score
   */
  public updateMatchScore = async (req: RequestWithAuth, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { matchId } = req.params;
      const { team1Score, team2Score, notes } = req.body;

      const match = await Match.findById(matchId).populate('tournamentId', 'status');
      if (!match) {
        res.status(404).json({
          success: false,
          message: 'Match not found',
          data: null,
        });
        return;
      }

      // Verify tournament is active
      const tournament = match.tournamentId as any;
      if (tournament.status !== 'active') {
        res.status(400).json({
          success: false,
          message: 'Can only update scores for active tournaments',
          data: null,
        });
        return;
      }

      // Update scores
      if (team1Score !== undefined) match.team1.score = team1Score;
      if (team2Score !== undefined) match.team2.score = team2Score;
      if (notes !== undefined) match.notes = notes;

      // Save will trigger automatic winner calculation and status update
      await match.save();

      // If this match is completed, update tournament results
      if (match.status === 'completed') {
        await this.updateTournamentResults(match);
      }

      const response: ApiResponse<IMatch> = {
        success: true,
        message: 'Match score updated',
        data: match,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Finalize tournament (mark as completed)
   */
  public finalizeTournament = async (req: RequestWithAuth, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const tournament = await Tournament.findById(id);
      if (!tournament) {
        res.status(404).json({
          success: false,
          message: 'Tournament not found',
          data: null,
        });
        return;
      }

      if (tournament.status !== 'active') {
        res.status(400).json({
          success: false,
          message: 'Only active tournaments can be finalized',
          data: null,
        });
        return;
      }

      // Check if all matches are completed
      const incompleteMatches = await Match.find({
        tournamentId: id,
        status: { $ne: 'completed' }
      });

      if (incompleteMatches.length > 0) {
        res.status(400).json({
          success: false,
          message: `Tournament has ${incompleteMatches.length} incomplete matches`,
          data: null,
        });
        return;
      }

      // Find the champion (winner of the final match)
      const finalMatch = await Match.findOne({
        tournamentId: id,
        round: 'final'
      }).populate('team1.players team2.players', 'name firstName lastName');

      if (finalMatch && finalMatch.winner) {
        const winningTeam = finalMatch.winner === 'team1' ? finalMatch.team1 : finalMatch.team2;
        const championPlayer = winningTeam.players[0] as any;
        
        tournament.champion = {
          playerId: championPlayer._id,
          playerName: championPlayer.name || `${championPlayer.firstName} ${championPlayer.lastName}`,
        };
      }

      // Update status to completed
      tournament.status = 'completed';
      await tournament.save();

      // Update player statistics
      await this.updatePlayerStatistics(tournament);

      const response: ApiResponse<ITournament> = {
        success: true,
        message: 'Tournament finalized successfully',
        data: tournament,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get tournament with matches and results
   */
  public getTournamentWithMatches = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const tournament = await Tournament.findById(id).populate('players', 'name firstName lastName');
      if (!tournament) {
        res.status(404).json({
          success: false,
          message: 'Tournament not found',
          data: null,
        });
        return;
      }

      const matches = await Match.find({ tournamentId: id }).sort({ roundNumber: 1, matchNumber: 1 });
      const results = await TournamentResult.find({ tournamentId: id }).populate('players', 'name firstName lastName');

      const response: ApiResponse<{
        tournament: ITournament;
        matches: IMatch[];
        results: any[];
      }> = {
        success: true,
        message: 'Tournament details retrieved',
        data: {
          tournament,
          matches,
          results,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete a scheduled tournament with enterprise-grade cascade deletion
   * Implements compensation patterns, audit trails, and robust error handling
   */
  public deleteTournament = async (req: RequestWithAuth, res: Response, next: NextFunction): Promise<void> => {
    const deletionService = new TournamentDeletionService();
    const correlationId = req.headers['x-correlation-id'] as string || undefined;
    
    try {
      const { id } = req.params;
      const adminUserId = req.user?.id;

      if (!adminUserId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          data: null,
        });
        return;
      }

      // Use the enhanced deletion service
      const result = await deletionService.deleteTournament(id, adminUserId, correlationId);
      
      const response: ApiResponse<{
        tournamentId: string;
        operation: {
          correlationId: string;
          steps: Array<{
            name: string;
            status: string;
            expectedCount?: number;
            actualCount?: number;
          }>;
          duration: number;
        };
        tournamentInfo: {
          format: string;
          date: string;
        };
      }> = {
        success: true,
        message: `Tournament "${result.tournamentInfo?.format} - ${result.tournamentInfo?.date}" has been permanently deleted`,
        data: {
          tournamentId: id,
          operation: {
            correlationId: result.operation.correlationId,
            steps: result.operation.steps.map(step => ({
              name: step.name,
              status: step.status,
              expectedCount: step.expectedCount,
              actualCount: step.actualCount,
            })),
            duration: result.operation.endTime 
              ? result.operation.endTime.getTime() - result.operation.startTime.getTime()
              : 0,
          },
          tournamentInfo: result.tournamentInfo!,
        },
      };

      res.status(200).json(response);

    } catch (error) {
      // Handle different types of errors appropriately
      if (error instanceof TournamentDeletionError) {
        const deletionError = error;
        
        // Map deletion error codes to HTTP status codes
        let statusCode = 500;
        switch (deletionError.code) {
          case 'INVALID_ID':
            statusCode = 400;
            break;
          case 'NOT_FOUND':
          case 'TOURNAMENT_NOT_FOUND_FOR_DELETION':
            statusCode = 404;
            break;
          case 'INVALID_STATUS':
            statusCode = 409;
            break;
          case 'MATCHES_DELETION_FAILED':
          case 'RESULTS_DELETION_FAILED':
          case 'TOURNAMENT_DELETION_FAILED':
            statusCode = 500;
            break;
        }

        // Add retry information for retryable errors
        const responseHeaders: any = {};
        if (deletionService.isRetryable(deletionError)) {
          responseHeaders['Retry-After'] = '60'; // Suggest retry after 60 seconds
          responseHeaders['X-Retryable'] = 'true';
        }

        Object.entries(responseHeaders).forEach(([key, value]) => {
          res.setHeader(key, String(value));
        });

        res.status(statusCode).json({
          success: false,
          message: deletionError.message,
          data: {
            code: deletionError.code,
            retryable: deletionError.retryable,
            operation: deletionError.operation ? deletionService.getOperationSummary(deletionError.operation) : null,
          },
        });
        return;
      }

      // Log unexpected errors
      console.error('Unexpected error in tournament deletion:', {
        tournamentId: req.params.id,
        adminUserId: req.user?.id,
        correlationId,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : error,
      });
      
      // Let Express error handler deal with unexpected errors
      next(error);
    }
  };

  // Private helper methods

  private async createBracketMatches(tournament: ITournament, isDoubles: boolean): Promise<IMatch[]> {
    const players = tournament.players || [];
    const matches: IMatch[] = [];

    if (isDoubles) {
      // Create teams from pairs of players
      const teams = [];
      for (let i = 0; i < players.length; i += 2) {
        const player1 = players[i] as any;
        const player2 = players[i + 1] as any;
        teams.push({
          players: [player1._id, player2._id],
          playerNames: [player1.name, player2.name],
          seed: Math.floor(i / 2) + 1,
        });
      }

      // Generate bracket matches for teams
      await this.generateBracketForTeams(tournament._id, teams, matches);
    } else {
      // Singles tournament - each player is a "team"
      const teams = players.map((player: any, index: number) => ({
        players: [player._id],
        playerNames: [player.name],
        seed: index + 1,
      }));

      await this.generateBracketForTeams(tournament._id, teams, matches);
    }

    // Save all matches
    const savedMatches = await Match.insertMany(matches);
    return savedMatches;
  }

  private async generateBracketForTeams(
    tournamentId: Types.ObjectId,
    teams: any[],
    matches: any[]
  ): Promise<void> {
    const teamCount = teams.length;
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(teamCount)));
    
    // Shuffle teams for random bracket seeding
    const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
    
    // Pad with byes if needed
    while (shuffledTeams.length < bracketSize) {
      shuffledTeams.push(null); // bye
    }

    let currentRound = shuffledTeams;
    let roundNumber = 1;
    let matchNumber = 1;

    // Generate rounds until we have a winner
    while (currentRound.length > 1) {
      const nextRound = [];
      const roundName = this.getRoundName(currentRound.length);

      for (let i = 0; i < currentRound.length; i += 2) {
        const team1 = currentRound[i];
        const team2 = currentRound[i + 1];

        if (team1 && team2) {
          // Both teams present - create match
          matches.push({
            tournamentId,
            matchNumber: matchNumber++,
            round: roundName,
            roundNumber,
            team1: { ...team1, score: 0 },
            team2: { ...team2, score: 0 },
            status: 'scheduled',
          });
          nextRound.push(null); // TBD winner
        } else if (team1) {
          // Team1 gets a bye
          nextRound.push(team1);
        } else if (team2) {
          // Team2 gets a bye
          nextRound.push(team2);
        }
      }

      currentRound = nextRound;
      roundNumber++;
    }
  }

  private getRoundName(teamsRemaining: number): MatchRound {
    switch (teamsRemaining) {
      case 64: return 'round-of-64';
      case 32: return 'round-of-32';
      case 16: return 'round-of-16';
      case 8: return 'quarterfinal';
      case 4: return 'semifinal';
      case 2: return 'final';
      default: return 'round-of-16'; // fallback
    }
  }

  private async updateTournamentResults(match: IMatch): Promise<void> {
    try {
      if (!match.tournamentId || !match.winner) return;

      const tournament = await Tournament.findById(match.tournamentId);
      if (!tournament) return;

      // Determine teams involved
      const winningTeam = match.winner === 'team1' ? match.team1 : match.team2;
      const losingTeam = match.winner === 'team1' ? match.team2 : match.team1;

      // Update or create TournamentResult for winning team
      await this.updateTeamResult(tournament, winningTeam, true, match);
      
      // Update or create TournamentResult for losing team  
      await this.updateTeamResult(tournament, losingTeam, false, match);

    } catch (error) {
      console.error('Error updating tournament results:', error);
    }
  }

  private async updateTeamResult(tournament: ITournament, team: any, won: boolean, match: IMatch): Promise<void> {
    try {
      // For each player in the team
      for (const playerId of team.players) {
        // Find or create TournamentResult
        let result = await TournamentResult.findOne({
          tournamentId: tournament._id,
          players: playerId
        });

        if (!result) {
          // Create new result record
          result = new TournamentResult({
            tournamentId: tournament._id,
            players: team.players.length > 1 ? team.players : [playerId], // Team or individual
            division: tournament.format,
            seed: team.seed || 0,
            roundRobinScores: {
              rrWon: 0,
              rrLost: 0,
              rrPlayed: 0,
              rrWinPercentage: 0,
              rrRank: 0,
            },
            bracketScores: {
              bracketWon: 0,
              bracketLost: 0,
              bracketPlayed: 0,
            },
            totalStats: {
              totalWon: 0,
              totalLost: 0,
              totalPlayed: 0,
              winPercentage: 0,
            },
          });
        }

        // Initialize nested objects if they don't exist
        if (!result.bracketScores) {
          result.bracketScores = {
            bracketWon: 0,
            bracketLost: 0,
            bracketPlayed: 0,
          };
        }
        if (!result.totalStats) {
          result.totalStats = {
            totalWon: 0,
            totalLost: 0,
            totalPlayed: 0,
            winPercentage: 0,
          };
        }

        // Update bracket statistics based on match round and outcome
        result.bracketScores.bracketPlayed = (result.bracketScores.bracketPlayed || 0) + 1;
        
        if (won) {
          result.bracketScores.bracketWon = (result.bracketScores.bracketWon || 0) + 1;
          
          // Set finish position based on round
          if (match.round === 'final') {
            result.totalStats.bodFinish = 1; // Champion
          } else if (match.round === 'semifinal') {
            result.totalStats.bodFinish = 2; // Finalist
          }
        } else {
          result.bracketScores.bracketLost = (result.bracketScores.bracketLost || 0) + 1;
          
          // Set finish position for losing rounds
          if (match.round === 'final') {
            result.totalStats.bodFinish = 2; // Runner-up
          } else if (match.round === 'semifinal') {
            result.totalStats.bodFinish = 3; // Semifinalist
          }
        }

        // Update total stats
        result.totalStats.totalPlayed = (result.bracketScores.bracketPlayed || 0) + (result.roundRobinScores?.rrPlayed || 0);
        result.totalStats.totalWon = (result.bracketScores.bracketWon || 0) + (result.roundRobinScores?.rrWon || 0);
        result.totalStats.totalLost = (result.bracketScores.bracketLost || 0) + (result.roundRobinScores?.rrLost || 0);
        
        if (result.totalStats.totalPlayed > 0) {
          result.totalStats.winPercentage = result.totalStats.totalWon / result.totalStats.totalPlayed;
        }

        await result.save();
      }
    } catch (error) {
      console.error('Error updating team result:', error);
    }
  }

  private calculatePlayerPoints(result: any): number {
    let points = 0;
    
    // Points for round robin
    points += (result.roundRobinScores?.rrWon || 0) * 2; // 2 points per win
    points += (result.roundRobinScores?.rrLost || 0) * 1; // 1 point per loss (participation)
    
    // Points for bracket performance
    points += (result.bracketScores?.bracketWon || 0) * 3; // 3 points per bracket win
    
    // Bonus points for final position
    const finish = result.totalStats?.bodFinish;
    if (finish === 1) {
      points += 20; // Champion
    } else if (finish === 2) {
      points += 15; // Runner-up
    } else if (finish === 3) {
      points += 10; // Semifinalist
    }
    
    return points;
  }

  private async updatePlayerStatistics(tournament: ITournament): Promise<void> {
    try {
      // Get all tournament results for this tournament
      const results = await TournamentResult.find({ tournamentId: tournament._id });

      // For each result, update each player's career stats
      for (const result of results) {
        const players = result.players as any[];
        const totalPlayed = result.totalStats?.totalPlayed || 0;
        const totalWon = result.totalStats?.totalWon || 0;
        const bodFinish = result.totalStats?.bodFinish || result.totalStats?.finalRank || 0;
        const isChampion = bodFinish === 1;

        for (const playerId of players) {
          const existingPlayer = await Player.findById(playerId);
          if (!existingPlayer) continue;

          const newBods = (existingPlayer.bodsPlayed || 0) + 1;
          const newGamesPlayed = (existingPlayer.gamesPlayed || 0) + totalPlayed;
          const newGamesWon = (existingPlayer.gamesWon || 0) + totalWon;
          const newWinningPct = newGamesPlayed > 0 ? newGamesWon / newGamesPlayed : 0;

          const prevFinishTotal = (existingPlayer.avgFinish || 0) * (existingPlayer.bodsPlayed || 0);
          const newAvgFinish = newBods > 0 ? (prevFinishTotal + (bodFinish || 0)) / newBods : existingPlayer.avgFinish || 0;

          let divisionChamps = existingPlayer.divisionChampionships || 0;
          let individualChamps = existingPlayer.individualChampionships || 0;
          if (isChampion) {
            if (tournament.format === 'M' || tournament.format === 'W') divisionChamps += 1;
            else individualChamps += 1;
          }

          const update = {
            bodsPlayed: newBods,
            gamesPlayed: newGamesPlayed,
            gamesWon: newGamesWon,
            winningPercentage: newWinningPct,
            avgFinish: newAvgFinish,
            totalChampionships: (existingPlayer.totalChampionships || 0) + (isChampion ? 1 : 0),
            bestResult: existingPlayer.bestResult ? Math.min(existingPlayer.bestResult, bodFinish || existingPlayer.bestResult) : (bodFinish || 0),
            divisionChampionships: divisionChamps,
            individualChampionships: individualChamps,
          };

          await Player.findByIdAndUpdate(playerId, update);
        }
      }
    } catch (error) {
      console.error('Error updating player statistics:', error);
    }
  }
}

export default TournamentAdminController;
