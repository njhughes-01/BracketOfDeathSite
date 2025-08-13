import { Request, Response, NextFunction } from 'express';
import { Tournament } from '../models/Tournament';
import { Match } from '../models/Match';
import { TournamentResult } from '../models/TournamentResult';
import { Player } from '../models/Player';
import { ITournament } from '../types/tournament';
import { IMatch, isRoundRobinRound, getNextRoundRobinRound, getRoundNumber } from '../types/match';
import { BaseController, RequestWithAuth } from './base';
import { ApiResponse } from '../types/common';
import { LiveStatsService } from '../services/LiveStatsService';

interface TournamentPhase {
  phase: 'setup' | 'registration' | 'check_in' | 'round_robin' | 'bracket' | 'completed';
  currentRound?: 'RR_R1' | 'RR_R2' | 'RR_R3' | 'QF' | 'SF' | 'Finals';
  roundStatus: 'not_started' | 'in_progress' | 'completed';
  totalMatches: number;
  completedMatches: number;
  canAdvance: boolean;
}

interface LiveTournament {
  _id: string;
  date: Date;
  bodNumber: number;
  format: string;
  location: string;
  advancementCriteria: string;
  notes?: string;
  photoAlbums?: string;
  status: string;
  players?: string[];
  maxPlayers?: number;
  champion?: any;
  phase: TournamentPhase;
  teams: any[];
  matches: IMatch[];
  currentStandings: any[];
  bracketProgression: {
    quarterFinalists: string[];
    semiFinalists: string[];
    finalists: string[];
    champion?: string | undefined;
  };
  checkInStatus: {
    [teamId: string]: {
      checkedIn: boolean;
      checkInTime?: string;
      present: boolean;
    };
  };
}

interface TournamentAction {
  action: 'start_registration' | 'close_registration' | 'start_checkin' | 'start_round_robin' | 
          'advance_round' | 'start_bracket' | 'complete_tournament' | 'reset_tournament';
}

export class LiveTournamentController extends BaseController<ITournament> {
  constructor() {
    super(Tournament, 'LiveTournament');
  }

  // Get live tournament with all live data
  getLiveTournament = this.asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const tournament = await Tournament.findById(id).populate('players', 'name');
      if (!tournament) {
        this.sendError(res, 404, 'Tournament not found');
        return;
      }

      // Get all matches for this tournament
      const matches = await Match.find({ tournamentId: id })
        .populate('team1.players team2.players', 'name')
        .sort({ roundNumber: 1, matchNumber: 1 });

      // Get current tournament results/standings
      const standings = await TournamentResult.find({ tournamentId: id })
        .populate('players', 'name')
        .sort({ 'totalStats.finalRank': 1 });

      // Build live tournament data
      const tournamentObj = tournament.toObject();
      const liveTournament: LiveTournament = {
        _id: tournamentObj._id.toString(),
        date: tournamentObj.date,
        bodNumber: tournamentObj.bodNumber,
        format: tournamentObj.format,
        location: tournamentObj.location,
        advancementCriteria: tournamentObj.advancementCriteria,
        notes: tournamentObj.notes,
        photoAlbums: tournamentObj.photoAlbums,
        status: tournamentObj.status,
        players: tournamentObj.players?.map((p: any) => p.toString()),
        maxPlayers: tournamentObj.maxPlayers,
        champion: tournamentObj.champion,
        phase: this.calculateTournamentPhase(tournament, matches),
        teams: await this.generateTeamData(tournament),
        matches,
        currentStandings: standings,
        bracketProgression: this.calculateBracketProgression(matches),
        checkInStatus: await this.getCheckInStatus(tournament)
      };

      const response: ApiResponse = {
        success: true,
        data: liveTournament,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  });

  // Execute tournament actions (start registration, advance rounds, etc.)
  executeTournamentAction = this.asyncHandler(async (req: RequestWithAuth, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { action }: TournamentAction = req.body;

      const tournament = await Tournament.findById(id);
      if (!tournament) {
        this.sendError(res, 404, 'Tournament not found');
        return;
      }

      let updatedTournament: ITournament;

      switch (action) {
        case 'start_registration':
          updatedTournament = await this.startRegistration(tournament);
          break;
        case 'close_registration':
          updatedTournament = await this.closeRegistration(tournament);
          break;
        case 'start_checkin':
          updatedTournament = await this.startCheckIn(tournament);
          break;
        case 'start_round_robin':
          updatedTournament = await this.startRoundRobin(tournament);
          break;
        case 'advance_round':
          updatedTournament = await this.advanceRound(tournament);
          break;
        case 'start_bracket':
          updatedTournament = await this.startBracket(tournament);
          break;
        case 'complete_tournament':
          updatedTournament = await this.completeTournament(tournament);
          break;
        case 'reset_tournament':
          updatedTournament = await this.resetTournament(tournament);
          break;
        default:
          this.sendError(res, 400, `Unknown action: ${action}`);
          return;
      }

      // Return updated live tournament data
      const matches = await Match.find({ tournamentId: id })
        .populate('team1.players team2.players', 'name')
        .sort({ roundNumber: 1, matchNumber: 1 });

      const standings = await TournamentResult.find({ tournamentId: id })
        .populate('players', 'name')
        .sort({ 'totalStats.finalRank': 1 });

      const updatedTournamentObj = updatedTournament.toObject();
      const liveTournament: LiveTournament = {
        _id: updatedTournamentObj._id.toString(),
        date: updatedTournamentObj.date,
        bodNumber: updatedTournamentObj.bodNumber,
        format: updatedTournamentObj.format,
        location: updatedTournamentObj.location,
        advancementCriteria: updatedTournamentObj.advancementCriteria,
        notes: updatedTournamentObj.notes,
        photoAlbums: updatedTournamentObj.photoAlbums,
        status: updatedTournamentObj.status,
        players: updatedTournamentObj.players?.map((p: any) => p.toString()),
        maxPlayers: updatedTournamentObj.maxPlayers,
        champion: updatedTournamentObj.champion,
        phase: this.calculateTournamentPhase(updatedTournament, matches),
        teams: await this.generateTeamData(updatedTournament),
        matches,
        currentStandings: standings,
        bracketProgression: this.calculateBracketProgression(matches),
        checkInStatus: await this.getCheckInStatus(updatedTournament)
      };

      const response: ApiResponse = {
        success: true,
        data: liveTournament,
        message: `Tournament action '${action}' completed successfully`,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  });

  // Get matches for a tournament (optionally filtered by round)
  getTournamentMatches = this.asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { round } = req.query;

      const filter: any = { tournamentId: id };
      if (round && typeof round === 'string') {
        filter.round = round;
      }

      const matches = await Match.find(filter)
        .populate('team1.players team2.players', 'name')
        .sort({ roundNumber: 1, matchNumber: 1 });

      const response: ApiResponse = {
        success: true,
        data: matches,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  });

  // Update match scores and status
  updateMatch = this.asyncHandler(async (req: RequestWithAuth, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { matchId } = req.params;
      const updateData = req.body;

      // Process individual player scores and calculate team scores
      const processedUpdateData = this.processMatchUpdate(updateData);

      const match = await Match.findByIdAndUpdate(matchId, processedUpdateData, { 
        new: true, 
        runValidators: true 
      }).populate('team1.players team2.players', 'name');

      if (!match) {
        this.sendError(res, 404, 'Match not found');
        return;
      }

      // If match is completed, update tournament statistics
      if (match.status === 'completed') {
        await this.updateTournamentStatistics(match);
        
        // Trigger live stats update for real-time updates
        await LiveStatsService.updateLiveStats(matchId);
      }

      const response: ApiResponse = {
        success: true,
        data: match,
        message: 'Match updated successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  });

  // Team check-in for tournaments
  checkInTeam = this.asyncHandler(async (req: RequestWithAuth, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { teamId, present = true } = req.body;

      // This would typically update a check-in collection or tournament field
      // For now, we'll return success - would need to implement proper check-in storage

      const response: ApiResponse = {
        success: true,
        data: { teamId, present, checkInTime: new Date().toISOString() },
        message: `Team ${present ? 'checked in' : 'marked absent'} successfully`,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  });

  // Generate matches for a specific round
  generateMatches = this.asyncHandler(async (req: RequestWithAuth, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { round } = req.body;

      const tournament = await Tournament.findById(id);
      if (!tournament) {
        this.sendError(res, 404, 'Tournament not found');
        return;
      }

      const matches = await this.createMatchesForRound(tournament, round);

      const response: ApiResponse = {
        success: true,
        data: matches,
        message: `Matches generated for ${round}`,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  });

  // Get live tournament statistics
  getLiveStats = this.asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      // Use the LiveStatsService to get comprehensive statistics
      const liveStats = await LiveStatsService.calculateLiveTournamentStats(id);
      
      if (!liveStats) {
        this.sendError(res, 404, 'Tournament not found or no statistics available');
        return;
      }

      const response: ApiResponse<typeof liveStats> = {
        success: true,
        data: liveStats,
        message: 'Live tournament statistics retrieved successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  });

  // Helper methods
  private calculateTournamentPhase(tournament: ITournament, matches: IMatch[]): TournamentPhase {
    const completedMatches = matches.filter(m => m.status === 'completed').length;
    const totalMatches = matches.length;
    
    let phase: TournamentPhase['phase'] = 'setup';
    let currentRound: TournamentPhase['currentRound'] = undefined;
    let roundStatus: TournamentPhase['roundStatus'] = 'not_started';

    // Determine phase based on tournament status and matches
    switch (tournament.status) {
      case 'scheduled':
        phase = 'setup';
        break;
      case 'open':
        phase = 'registration';
        break;
      case 'active':
        if (matches.length === 0) {
          // Check if players are already preselected from tournament setup
          const hasPreselectedPlayers = tournament.players && tournament.players.length > 0;
          const hasGeneratedTeams = tournament.generatedTeams && tournament.generatedTeams.length > 0;
          
          if (hasPreselectedPlayers || hasGeneratedTeams) {
            // Skip check-in for preselected tournaments - ready to start round robin
            phase = 'round_robin';
            currentRound = 'RR_R1';
            roundStatus = 'not_started';
          } else {
            // Normal flow - need check-in
            phase = 'check_in';
          }
        } else {
          // Determine if we're in round robin or bracket phase
          const hasRoundRobinMatches = matches.some(m => isRoundRobinRound(m.round));
          const hasBracketMatches = matches.some(m => ['quarterfinal', 'semifinal', 'final'].includes(m.round));
          
          if (hasRoundRobinMatches && !hasBracketMatches) {
            phase = 'round_robin';
            currentRound = this.getCurrentRoundRobinRound(matches);
          } else if (hasBracketMatches) {
            phase = 'bracket';
            currentRound = this.getCurrentBracketRound(matches);
          }
          
          roundStatus = completedMatches === totalMatches ? 'completed' : 
                       completedMatches > 0 ? 'in_progress' : 'not_started';
        }
        break;
      case 'completed':
        phase = 'completed';
        roundStatus = 'completed';
        break;
    }

    return {
      phase,
      currentRound,
      roundStatus,
      totalMatches,
      completedMatches,
      canAdvance: this.canAdvanceRound(matches, roundStatus)
    };
  }

  private getCurrentRoundRobinRound(matches: IMatch[]): 'RR_R1' | 'RR_R2' | 'RR_R3' {
    // Logic to determine current round robin round
    return 'RR_R1'; // Placeholder
  }

  private getCurrentBracketRound(matches: IMatch[]): 'QF' | 'SF' | 'Finals' {
    // Logic to determine current bracket round
    return 'QF'; // Placeholder
  }

  private canAdvanceRound(matches: IMatch[], roundStatus: string): boolean {
    return roundStatus === 'completed';
  }

  private calculateBracketProgression(matches: IMatch[]): {
    quarterFinalists: string[];
    semiFinalists: string[];
    finalists: string[];
    champion?: string | undefined;
  } {
    // Prevent unused parameter warning
    void matches;
    
    return {
      quarterFinalists: [],
      semiFinalists: [],
      finalists: [],
      champion: undefined
    };
  }

  private async generateTeamData(tournament: ITournament) {
    try {
      // Convert stored generatedTeams to live team format with runtime status
      const storedTeams = tournament.generatedTeams || [];
      
      if (storedTeams.length === 0) {
        console.log('No generated teams found in tournament setup data');
        return [];
      }

      // Get current tournament phase to determine team status
      const matches = await Match.find({ tournamentId: tournament._id });
      const phase = this.calculateTournamentPhase(tournament, matches);

      // Convert each stored team to live team format
      const liveTeams = storedTeams.map((storedTeam: any) => {
        // Determine if team is still active based on match results
        const teamMatches = matches.filter(m => 
          this.teamInMatch(storedTeam.teamId, m)
        );

        const isEliminated = this.isTeamEliminated(storedTeam.teamId, matches, phase.phase);
        const hasAdvanced = this.hasTeamAdvanced(storedTeam.teamId, matches, phase.phase);

        return {
          teamId: storedTeam.teamId,
          teamName: storedTeam.teamName,
          players: storedTeam.players.map((player: any) => ({
            playerId: player.playerId,
            playerName: player.playerName,
            seed: player.seed,
            statistics: player.statistics
          })),
          combinedSeed: storedTeam.combinedSeed,
          combinedStatistics: storedTeam.combinedStatistics,
          
          // Live tournament status
          status: isEliminated ? 'eliminated' : hasAdvanced ? 'advanced' : 'active',
          matchesPlayed: teamMatches.filter(m => m.status === 'completed').length,
          matchesWon: teamMatches.filter(m => 
            m.status === 'completed' && this.isTeamWinner(storedTeam.teamId, m)
          ).length,
          currentRound: phase.currentRound || 'setup',
          checkedIn: phase.phase !== 'check_in' ? true : false, // Default to true unless in check-in phase
          present: true // Default to present
        };
      });

      console.log(`Generated live team data for ${liveTeams.length} teams`);
      return liveTeams;
    } catch (error) {
      console.error('Error generating team data:', error);
      return [];
    }
  }

  // Helper method to check if a team is in a specific match
  private teamInMatch(teamId: string, match: any): boolean {
    return match.team1?.players?.includes(teamId) || 
           match.team2?.players?.includes(teamId) ||
           match.team1?.teamName?.includes(teamId) ||
           match.team2?.teamName?.includes(teamId);
  }

  // Helper method to determine if team is eliminated
  private isTeamEliminated(teamId: string, matches: any[], phase: string): boolean {
    if (phase !== 'bracket') return false;
    
    // In bracket play, losing a match eliminates you
    const teamMatches = matches.filter(m => 
      this.teamInMatch(teamId, m) && 
      m.status === 'completed' &&
      ['quarterfinal', 'semifinal', 'final'].includes(m.round)
    );

    return teamMatches.some(m => !this.isTeamWinner(teamId, m));
  }

  // Helper method to determine if team has advanced
  private hasTeamAdvanced(teamId: string, matches: any[], phase: string): boolean {
    if (phase !== 'bracket') return false;

    const teamMatches = matches.filter(m => 
      this.teamInMatch(teamId, m) && 
      m.status === 'completed' &&
      ['quarterfinal', 'semifinal'].includes(m.round)
    );

    return teamMatches.some(m => this.isTeamWinner(teamId, m));
  }

  // Helper method to check if team won a match
  private isTeamWinner(teamId: string, match: any): boolean {
    if (!match.winner) return false;
    
    if (match.winner === 'team1' && this.teamInMatch(teamId, { team1: match.team1 })) {
      return true;
    }
    if (match.winner === 'team2' && this.teamInMatch(teamId, { team2: match.team2 })) {
      return true;
    }
    return false;
  }

  private async getCheckInStatus(tournament: ITournament) {
    try {
      // Get teams from tournament setup data
      const teams = tournament.generatedTeams || [];
      const checkInStatus: Record<string, any> = {};

      // For now, default all teams to checked in unless we're in check-in phase
      // In a real implementation, this would come from a separate check-in collection
      teams.forEach(team => {
        checkInStatus[team.teamId] = {
          checkedIn: tournament.status !== 'open', // Auto check-in unless registration is open
          checkInTime: tournament.status !== 'open' ? new Date().toISOString() : undefined,
          present: true
        };
      });

      return checkInStatus;
    } catch (error) {
      console.error('Error getting check-in status:', error);
      return {};
    }
  }

  // Tournament action handlers
  private async startRegistration(tournament: ITournament): Promise<ITournament> {
    // Check if players are already preselected from tournament setup
    const hasPreselectedPlayers = tournament.players && tournament.players.length > 0;
    const hasGeneratedTeams = tournament.generatedTeams && tournament.generatedTeams.length > 0;
    
    if (hasPreselectedPlayers || hasGeneratedTeams) {
      // Skip registration and go directly to check-in/round-robin
      console.log('Players already preselected, skipping registration phase');
      tournament.status = 'active';
      return await tournament.save();
    } else {
      // Normal registration flow
      tournament.status = 'open';
      return await tournament.save();
    }
  }

  private async closeRegistration(tournament: ITournament): Promise<ITournament> {
    tournament.status = 'active';
    return await tournament.save();
  }

  private async startCheckIn(tournament: ITournament): Promise<ITournament> {
    // Implement check-in logic
    return tournament;
  }

  private async startRoundRobin(tournament: ITournament): Promise<ITournament> {
    // Generate round robin matches for first round
    await this.createMatchesForRound(tournament, 'RR_R1');
    return tournament;
  }

  private async advanceRound(tournament: ITournament): Promise<ITournament> {
    try {
      console.log('Advancing tournament to next round');

      // Get current matches to determine current round and progression
      const matches = await Match.find({ tournamentId: tournament._id });
      const phase = this.calculateTournamentPhase(tournament, matches);

      if (!phase.canAdvance) {
        console.log('Tournament round cannot advance - matches not completed');
        return tournament;
      }

      // Advance based on current phase
      if (phase.phase === 'round_robin') {
        return await this.advanceRoundRobin(tournament, phase.currentRound);
      } else if (phase.phase === 'bracket') {
        return await this.advanceBracketRound(tournament, phase.currentRound);
      }

      return tournament;
    } catch (error) {
      console.error('Error advancing round:', error);
      return tournament;
    }
  }

  // Advance round-robin rounds (R1 -> R2 -> R3 -> Bracket)
  private async advanceRoundRobin(tournament: ITournament, currentRound?: string): Promise<ITournament> {
    try {
      const nextRound = getNextRoundRobinRound(currentRound as any);
      
      if (nextRound === 'bracket') {
        // Round robin complete, determine qualifiers and start bracket
        console.log('Round robin complete, starting bracket phase');
        
        // Calculate final round-robin standings
        await this.calculateRoundRobinStandings(tournament);
        
        // Generate bracket matches with qualified teams
        await this.createMatchesForRound(tournament, 'quarterfinal');
        
        tournament.status = 'active'; // Ensure tournament is active for bracket play
        return await tournament.save();
      } else {
        // Generate next round-robin matches
        console.log(`Advancing to ${nextRound}`);
        await this.createMatchesForRound(tournament, nextRound);
        return tournament;
      }
    } catch (error) {
      console.error('Error advancing round robin:', error);
      return tournament;
    }
  }

  // Advance bracket rounds (QF -> SF -> Finals -> Complete)
  private async advanceBracketRound(tournament: ITournament, currentRound?: string): Promise<ITournament> {
    try {
      const nextRound = this.getNextBracketRound(currentRound);
      
      if (!nextRound) {
        // Tournament complete
        console.log('Tournament complete!');
        tournament.status = 'completed';
        
        // Set tournament champion
        await this.setTournamentChampion(tournament);
        
        // Update player career statistics
        await this.updatePlayerCareerStats(tournament);
        
        return await tournament.save();
      } else {
        // Generate next bracket round matches
        console.log(`Advancing to bracket ${nextRound}`);
        
        // Get winners from current round
        const advancingTeams = await this.getBracketAdvancingTeams(tournament, currentRound);
        
        // Generate matches for next round
        await this.generateBracketMatchesForRound(tournament, advancingTeams, nextRound);
        
        return tournament;
      }
    } catch (error) {
      console.error('Error advancing bracket round:', error);
      return tournament;
    }
  }

  // Process match update data to handle individual player scores
  private processMatchUpdate(updateData: any): any {
    const processedData = { ...updateData };

    // Process team 1 player scores
    if (updateData.team1PlayerScores && Array.isArray(updateData.team1PlayerScores)) {
      processedData['team1.playerScores'] = updateData.team1PlayerScores;
      
      // Calculate team 1 total score from individual player scores
      const team1Total = updateData.team1PlayerScores.reduce((sum: number, player: any) => {
        return sum + (player.score || 0);
      }, 0);
      processedData['team1.score'] = team1Total;
      
      // Remove the original field to avoid conflicts
      delete processedData.team1PlayerScores;
    }

    // Process team 2 player scores
    if (updateData.team2PlayerScores && Array.isArray(updateData.team2PlayerScores)) {
      processedData['team2.playerScores'] = updateData.team2PlayerScores;
      
      // Calculate team 2 total score from individual player scores
      const team2Total = updateData.team2PlayerScores.reduce((sum: number, player: any) => {
        return sum + (player.score || 0);
      }, 0);
      processedData['team2.score'] = team2Total;
      
      // Remove the original field to avoid conflicts
      delete processedData.team2PlayerScores;
    }

    // Handle legacy team score updates (if individual scores not provided)
    if (updateData.team1Score !== undefined) {
      processedData['team1.score'] = updateData.team1Score;
      delete processedData.team1Score;
    }

    if (updateData.team2Score !== undefined) {
      processedData['team2.score'] = updateData.team2Score;
      delete processedData.team2Score;
    }

    // Determine winner if both team scores are provided
    if (processedData['team1.score'] !== undefined && processedData['team2.score'] !== undefined) {
      const team1Score = processedData['team1.score'];
      const team2Score = processedData['team2.score'];
      
      if (team1Score > team2Score) {
        processedData.winner = 'team1';
      } else if (team2Score > team1Score) {
        processedData.winner = 'team2';
      }
      // If scores are tied, don't set winner
    }

    console.log('Processed match update:', JSON.stringify(processedData, null, 2));
    return processedData;
  }

  // Helper methods for round progression

  private getNextBracketRound(currentRound?: string): string | null {
    const roundOrder = ['quarterfinal', 'semifinal', 'final'];
    const currentIndex = currentRound ? roundOrder.indexOf(currentRound) : -1;
    
    if (currentIndex === -1) return 'quarterfinal';
    if (currentIndex >= roundOrder.length - 1) return null; // Tournament complete
    
    return roundOrder[currentIndex + 1];
  }

  // Calculate and save round-robin standings
  private async calculateRoundRobinStandings(tournament: ITournament): Promise<void> {
    try {
      // Get all round-robin matches
      const rrMatches = await Match.find({
        tournamentId: tournament._id,
        round: { $in: ['RR_R1', 'RR_R2', 'RR_R3'] },
        status: 'completed'
      });

      // Calculate standings for each team
      const teams = tournament.generatedTeams || [];
      const standings = teams.map(team => {
        const teamMatches = rrMatches.filter(m => 
          this.teamInMatch(team.teamId, m)
        );

        const wins = teamMatches.filter(m => 
          this.isTeamWinner(team.teamId, m)
        ).length;

        const losses = teamMatches.length - wins;
        const winPercentage = teamMatches.length > 0 ? wins / teamMatches.length : 0;

        return {
          ...team,
          rrWins: wins,
          rrLosses: losses,
          rrPlayed: teamMatches.length,
          rrWinPercentage: winPercentage,
          qualified: wins >= Math.floor(teamMatches.length / 2) // Simple qualification rule
        };
      });

      // Sort by win percentage, then by seed
      standings.sort((a, b) => {
        if (a.rrWinPercentage !== b.rrWinPercentage) {
          return b.rrWinPercentage - a.rrWinPercentage;
        }
        return a.combinedSeed - b.combinedSeed;
      });

      console.log('Round-robin standings calculated:', standings.length, 'teams');
    } catch (error) {
      console.error('Error calculating round-robin standings:', error);
    }
  }

  // Get teams advancing from current bracket round
  private async getBracketAdvancingTeams(tournament: ITournament, currentRound?: string): Promise<any[]> {
    if (!currentRound) return [];

    const matches = await Match.find({
      tournamentId: tournament._id,
      round: currentRound,
      status: 'completed'
    });

    const advancingTeams: any[] = [];
    
    matches.forEach(match => {
      if (match.winner) {
        const winningTeam = match.winner === 'team1' ? match.team1 : match.team2;
        advancingTeams.push({
          teamId: `${winningTeam.playerNames.join('_')}`,
          teamName: winningTeam.playerNames.join(' & '),
          players: winningTeam.players.map((playerId, index) => ({
            playerId,
            playerName: winningTeam.playerNames[index] || 'Unknown',
            seed: winningTeam.seed
          })),
          combinedSeed: winningTeam.seed || 0
        });
      }
    });

    console.log(`${advancingTeams.length} teams advancing from ${currentRound}`);
    return advancingTeams;
  }

  // Generate bracket matches for specific round with advancing teams
  private async generateBracketMatchesForRound(tournament: ITournament, teams: any[], round: string): Promise<void> {
    // Use existing bracket match generation but with specific advancing teams
    const matches = await this.generateBracketMatches(tournament, teams, round, 1);
    await Match.insertMany(matches);
    console.log(`Generated ${matches.length} matches for ${round}`);
  }

  // Set tournament champion when tournament completes
  private async setTournamentChampion(tournament: ITournament): Promise<void> {
    try {
      const finalMatch = await Match.findOne({
        tournamentId: tournament._id,
        round: 'final',
        status: 'completed'
      });

      if (finalMatch && finalMatch.winner) {
        const winningTeam = finalMatch.winner === 'team1' ? finalMatch.team1 : finalMatch.team2;
        
        tournament.champion = {
          playerId: winningTeam.players[0], // First player as representative
          playerName: winningTeam.playerNames.join(' & '),
        };

        console.log(`Tournament champion set: ${tournament.champion.playerName}`);
      }
    } catch (error) {
      console.error('Error setting tournament champion:', error);
    }
  }

  // Update player career statistics (placeholder for Phase 3.2)
  private async updatePlayerCareerStats(tournament: ITournament): Promise<void> {
    try {
      console.log(`Updating career statistics for tournament ${tournament._id}`);
      
      // Get all completed matches for this tournament
      const allMatches = await Match.find({ 
        tournamentId: tournament._id,
        status: 'completed'
      });

      if (allMatches.length === 0) {
        console.log('No completed matches found, skipping career stats update');
        return;
      }

      // Get teams from tournament setup
      const teams = tournament.generatedTeams || [];
      if (teams.length === 0) {
        console.log('No teams found in tournament setup');
        return;
      }

      // Calculate final results for each team
      const teamResults = await this.calculateFinalTeamResults(teams, allMatches, tournament);

      // Create tournament result records and update player stats
      for (const teamResult of teamResults) {
        // Create TournamentResult record
        await this.createTournamentResultRecord(tournament, teamResult);
        
        // Update career stats for each player in the team
        for (const player of teamResult.team.players) {
          await this.updateIndividualPlayerStats(player, teamResult, tournament);
        }
      }

      console.log(`Career statistics updated for ${teamResults.length} teams`);
    } catch (error) {
      console.error('Error updating career statistics:', error);
    }
  }

  private async calculateFinalTeamResults(teams: any[], matches: any[], tournament: ITournament) {
    const teamResults = [];

    for (const team of teams) {
      // Get all matches for this team
      const teamMatches = matches.filter(m => this.teamInMatch(team.teamId, m));
      
      // Separate round-robin and bracket matches
      const rrMatches = teamMatches.filter(m => isRoundRobinRound(m.round));
      const bracketMatches = teamMatches.filter(m => 
        ['quarterfinal', 'semifinal', 'final'].includes(m.round)
      );

      // Calculate round-robin stats
      const rrStats = this.calculateRoundRobinStats(team, rrMatches);
      
      // Calculate bracket stats
      const bracketStats = this.calculateBracketStats(team, bracketMatches);

      // Calculate total stats
      const totalWon = rrStats.rrWon + bracketStats.bracketWon;
      const totalLost = rrStats.rrLost + bracketStats.bracketLost;
      const totalPlayed = totalWon + totalLost;
      const winPercentage = totalPlayed > 0 ? totalWon / totalPlayed : 0;

      // Determine final ranking based on bracket performance and round-robin record
      const finalRank = this.calculateFinalRank(team, rrStats, bracketStats, teams.length);
      
      teamResults.push({
        team,
        roundRobinScores: rrStats,
        bracketScores: bracketStats,
        totalStats: {
          totalWon,
          totalLost,
          totalPlayed,
          winPercentage,
          finalRank,
          bodFinish: finalRank,
          home: tournament.location === 'Home' // Assuming Home tournaments are tracked
        }
      });
    }

    // Sort by final rank to ensure correct BOD finish positions
    teamResults.sort((a, b) => a.totalStats.finalRank - b.totalStats.finalRank);
    
    return teamResults;
  }

  private calculateRoundRobinStats(team: any, rrMatches: any[]) {
    let rrWon = 0;
    let rrLost = 0;
    const roundScores: any = {};

    rrMatches.forEach(match => {
      const isWinner = this.isTeamWinner(team.teamId, match);
      if (isWinner) rrWon++;
      else rrLost++;

      // Track round-specific results if match has round info
      if (match.roundNumber) {
        const roundKey = `round${match.roundNumber}`;
        if (!roundScores[roundKey]) roundScores[roundKey] = 0;
        roundScores[roundKey] += isWinner ? 1 : 0;
      }
    });

    return {
      ...roundScores,
      rrWon,
      rrLost,
      rrPlayed: rrWon + rrLost,
      rrWinPercentage: (rrWon + rrLost) > 0 ? rrWon / (rrWon + rrLost) : 0,
      rrRank: 0 // Will be calculated after sorting all teams
    };
  }

  private calculateBracketStats(team: any, bracketMatches: any[]) {
    let bracketWon = 0;
    let bracketLost = 0;
    const roundStats: any = {};

    bracketMatches.forEach(match => {
      const isWinner = this.isTeamWinner(team.teamId, match);
      if (isWinner) bracketWon++;
      else bracketLost++;

      // Track specific bracket round results
      const roundPrefix = this.getBracketRoundPrefix(match.round);
      if (roundPrefix) {
        if (!roundStats[`${roundPrefix}Won`]) roundStats[`${roundPrefix}Won`] = 0;
        if (!roundStats[`${roundPrefix}Lost`]) roundStats[`${roundPrefix}Lost`] = 0;
        
        if (isWinner) roundStats[`${roundPrefix}Won`]++;
        else roundStats[`${roundPrefix}Lost`]++;
      }
    });

    return {
      ...roundStats,
      bracketWon,
      bracketLost,
      bracketPlayed: bracketWon + bracketLost
    };
  }

  private getBracketRoundPrefix(round: string): string | null {
    const roundMap: Record<string, string> = {
      'quarterfinal': 'qf',
      'semifinal': 'sf', 
      'final': 'finals',
      'round-of-16': 'r16'
    };
    return roundMap[round] || null;
  }

  private calculateFinalRank(team: any, rrStats: any, bracketStats: any, totalTeams: number): number {
    // Tournament finish based on bracket advancement
    if (bracketStats.finalsWon > 0) return 1; // Champion
    if (bracketStats.finalsLost > 0) return 2; // Runner-up
    if (bracketStats.sfLost > 0) return 3; // Lost in semi-final (3rd/4th place)
    if (bracketStats.qfLost > 0) return Math.min(5, totalTeams); // Lost in quarter-final (5th-8th)
    
    // If no bracket play, rank based on round-robin performance
    // Higher win percentage = better rank
    const rrRank = Math.ceil((1 - rrStats.rrWinPercentage) * totalTeams);
    return Math.max(rrRank, Math.ceil(totalTeams * 0.5)); // At least middle of pack
  }

  private async createTournamentResultRecord(tournament: ITournament, teamResult: any) {
    try {
      // Check if result already exists
      const existingResult = await TournamentResult.findOne({
        tournamentId: tournament._id,
        players: { $all: teamResult.team.players.map((p: any) => p.playerId) }
      });

      if (existingResult) {
        // Update existing result
        await TournamentResult.findByIdAndUpdate(existingResult._id, {
          roundRobinScores: teamResult.roundRobinScores,
          bracketScores: teamResult.bracketScores,
          totalStats: teamResult.totalStats,
          seed: teamResult.team.combinedSeed
        });
      } else {
        // Create new result
        await TournamentResult.create({
          tournamentId: tournament._id,
          players: teamResult.team.players.map((p: any) => p.playerId),
          division: tournament.format || 'M', // Default to Men's if not specified
          seed: teamResult.team.combinedSeed,
          roundRobinScores: teamResult.roundRobinScores,
          bracketScores: teamResult.bracketScores,
          totalStats: teamResult.totalStats
        });
      }
    } catch (error) {
      console.error('Error creating tournament result record:', error);
    }
  }

  private async updateIndividualPlayerStats(player: any, teamResult: any, tournament: ITournament) {
    try {
      const existingPlayer = await Player.findById(player.playerId);
      if (!existingPlayer) {
        console.log(`Player not found: ${player.playerId}`);
        return;
      }

      // Update career statistics
      const updatedStats = {
        bodsPlayed: existingPlayer.bodsPlayed + 1,
        gamesPlayed: existingPlayer.gamesPlayed + teamResult.totalStats.totalPlayed,
        gamesWon: existingPlayer.gamesWon + teamResult.totalStats.totalWon,
        bestResult: Math.min(existingPlayer.bestResult || 999, teamResult.totalStats.bodFinish),
        totalChampionships: existingPlayer.totalChampionships + (teamResult.totalStats.bodFinish === 1 ? 1 : 0),
        winningPercentage: 0, // Will be calculated below
        avgFinish: 0, // Will be calculated below
        divisionChampionships: existingPlayer.divisionChampionships || 0,
        individualChampionships: existingPlayer.individualChampionships || 0
      };

      // Recalculate derived statistics
      updatedStats.winningPercentage = updatedStats.gamesPlayed > 0 
        ? updatedStats.gamesWon / updatedStats.gamesPlayed 
        : 0;

      // Calculate new average finish
      const previousFinishTotal = (existingPlayer.avgFinish || 0) * (existingPlayer.bodsPlayed || 0);
      const newFinishTotal = previousFinishTotal + teamResult.totalStats.bodFinish;
      updatedStats.avgFinish = newFinishTotal / updatedStats.bodsPlayed;

      // Update individual vs division championships
      if (teamResult.totalStats.bodFinish === 1) {
        if (tournament.format === 'M' || tournament.format === 'W') {
          updatedStats.divisionChampionships = existingPlayer.divisionChampionships + 1;
        } else {
          updatedStats.individualChampionships = existingPlayer.individualChampionships + 1;
        }
      }

      // Save updated player statistics
      await Player.findByIdAndUpdate(player.playerId, updatedStats);

      console.log(`Updated career stats for player ${player.playerName}`);
    } catch (error) {
      console.error(`Error updating player stats for ${player.playerName}:`, error);
    }
  }

  private async startBracket(tournament: ITournament): Promise<ITournament> {
    // Generate bracket matches
    await this.createMatchesForRound(tournament, 'quarterfinal');
    return tournament;
  }

  private async completeTournament(tournament: ITournament): Promise<ITournament> {
    tournament.status = 'completed';
    return await tournament.save();
  }

  private async resetTournament(tournament: ITournament): Promise<ITournament> {
    // Delete all matches and reset tournament
    await Match.deleteMany({ tournamentId: tournament._id });
    tournament.status = 'scheduled';
    return await tournament.save();
  }

  private async createMatchesForRound(tournament: ITournament, round: string): Promise<IMatch[]> {
    try {
      // Clear any existing matches for this round to avoid duplicates
      await Match.deleteMany({ 
        tournamentId: tournament._id, 
        round: round as any 
      });

      // Get teams from tournament setup data
      const teams = tournament.generatedTeams || [];
      if (teams.length === 0) {
        throw new Error('No teams found in tournament setup data');
      }

      let matches: any[] = [];
      let matchNumber = 1;

      // Determine round type and generate appropriate matches
      if (isRoundRobinRound(round)) {
        matches = await this.generateRoundRobinMatches(tournament, teams, round, matchNumber);
      } else {
        // Bracket matches (quarterfinal, semifinal, final)
        matches = await this.generateBracketMatches(tournament, teams, round, matchNumber);
      }

      // Create matches in database
      const createdMatches = await Match.insertMany(matches);
      console.log(`Created ${createdMatches.length} matches for ${round}`);
      
      return createdMatches as IMatch[];
    } catch (error) {
      console.error(`Error creating matches for round ${round}:`, error);
      throw error;
    }
  }

  // Generate round-robin matches where every team plays every other team
  private async generateRoundRobinMatches(tournament: any, teams: any[], round: string, startMatchNumber: number): Promise<any[]> {
    const matches = [];
    let matchNumber = startMatchNumber;

    console.log('Team structure sample:', JSON.stringify(teams[0], null, 2));

    // Generate all possible team pairings (combinatorial)
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const team1 = teams[i];
        const team2 = teams[j];

        // Ensure player names are populated properly
        const team1PlayerNames = team1.players.map((p: any) => {
          return p.playerName || p.name || `Player ${p.playerId || p._id || p.id}`;
        });

        const team2PlayerNames = team2.players.map((p: any) => {
          return p.playerName || p.name || `Player ${p.playerId || p._id || p.id}`;
        });

        const match = {
          tournamentId: tournament._id,
          matchNumber: matchNumber++,
          round: round,
          roundNumber: getRoundNumber(round as any),
          team1: {
            players: team1.players.map((p: any) => p.playerId || p._id || p.id),
            playerNames: team1PlayerNames,
            score: 0,
            seed: team1.combinedSeed
          },
          team2: {
            players: team2.players.map((p: any) => p.playerId || p._id || p.id),
            playerNames: team2PlayerNames,
            score: 0,
            seed: team2.combinedSeed
          },
          status: 'scheduled',
          scheduledDate: new Date()
        };

        console.log(`Match ${matchNumber - 1}: ${team1PlayerNames.join(' & ')} vs ${team2PlayerNames.join(' & ')}`);
        matches.push(match);
      }
    }

    console.log(`Generated ${matches.length} round-robin matches`);
    return matches;
  }

  // Generate bracket matches based on seeding and tournament progression
  private async generateBracketMatches(tournament: any, teams: any[], round: string, startMatchNumber: number): Promise<any[]> {
    const matches = [];
    let matchNumber = startMatchNumber;

    // For bracket play, we need to determine which teams advance
    // This is a simplified version - would need to get actual standings
    let bracketTeams = teams;

    // Sort teams by performance (would use actual standings in real implementation)
    bracketTeams.sort((a: any, b: any) => a.combinedSeed - b.combinedSeed);

    // Determine number of teams for this bracket round
    const roundTeamCounts: Record<string, number> = {
      'quarterfinal': 8,
      'semifinal': 4,
      'final': 2,
      'third-place': 4 // Special case for 3rd/4th place
    };

    const requiredTeams = roundTeamCounts[round] || bracketTeams.length;
    const activeTeams = bracketTeams.slice(0, requiredTeams);

    // Generate bracket matches based on seeding
    if (round === 'quarterfinal') {
      // QF: 1v8, 4v5, 3v6, 2v7
      const pairings = [
        [0, 7], [3, 4], [2, 5], [1, 6]
      ];
      
      for (const [i, j] of pairings) {
        if (activeTeams[i] && activeTeams[j]) {
          matches.push(this.createBracketMatch(tournament, activeTeams[i], activeTeams[j], matchNumber++, round, 1));
        }
      }
    } else if (round === 'semifinal') {
      // SF: Winners from QF
      for (let i = 0; i < activeTeams.length; i += 2) {
        if (activeTeams[i] && activeTeams[i + 1]) {
          matches.push(this.createBracketMatch(tournament, activeTeams[i], activeTeams[i + 1], matchNumber++, round, 2));
        }
      }
    } else if (round === 'final') {
      // Final: Winners from SF
      if (activeTeams.length >= 2) {
        matches.push(this.createBracketMatch(tournament, activeTeams[0], activeTeams[1], matchNumber++, round, 3));
      }
    }

    console.log(`Generated ${matches.length} ${round} matches`);
    return matches;
  }


  // Helper method to create a single bracket match
  private createBracketMatch(tournament: any, team1: any, team2: any, matchNumber: number, round: string, roundNumber: number): any {
    return {
      tournamentId: tournament._id,
      matchNumber,
      round,
      roundNumber,
      team1: {
        players: team1.players.map((p: any) => p.playerId),
        playerNames: team1.players.map((p: any) => p.playerName),
        score: 0,
        seed: team1.combinedSeed
      },
      team2: {
        players: team2.players.map((p: any) => p.playerId),
        playerNames: team2.players.map((p: any) => p.playerName),
        score: 0,
        seed: team2.combinedSeed
      },
      status: 'scheduled',
      scheduledDate: new Date()
    };
  }

  private async updateTournamentStatistics(match: IMatch): Promise<void> {
    try {
      console.log(`Updating tournament statistics for match ${match.matchNumber}`);

      // Get tournament to access setup data
      const tournament = await Tournament.findById(match.tournamentId);
      if (!tournament) {
        console.error('Tournament not found for statistics update');
        return;
      }

      // Determine winner and loser
      if (!match.winner || match.team1.score === undefined || match.team2.score === undefined) {
        console.log('Match does not have winner or scores, skipping statistics update');
        return;
      }

      const winningTeam = match.winner === 'team1' ? match.team1 : match.team2;
      const losingTeam = match.winner === 'team1' ? match.team2 : match.team1;

      // Update or create tournament result records for both teams
      await this.updateTeamTournamentResult(tournament, winningTeam, match, true);
      await this.updateTeamTournamentResult(tournament, losingTeam, match, false);

      // If this is a bracket match, update bracket progression
      if (['quarterfinal', 'semifinal', 'final'].includes(match.round)) {
        await this.updateBracketProgression(tournament, match);
      }

      console.log(`Statistics updated successfully for match ${match.matchNumber}`);
    } catch (error) {
      console.error('Error updating tournament statistics:', error);
    }
  }

  // Update or create tournament result record for a team
  private async updateTeamTournamentResult(tournament: any, team: any, match: IMatch, won: boolean): Promise<void> {
    try {
      // Find existing tournament result or create new one
      let result = await TournamentResult.findOne({
        tournamentId: tournament._id,
        $or: [
          { 'players': { $in: team.players } },
          { teamName: team.playerNames.join(' & ') }
        ]
      });

      if (!result) {
        // Create new tournament result
        result = new TournamentResult({
          tournamentId: tournament._id,
          players: team.players,
          teamName: team.playerNames.join(' & '),
          seed: team.seed || 0,
          division: tournament.format,
          roundRobinScores: {
            round1: 0, round2: 0, round3: 0,
            rrWon: 0, rrLost: 0, rrPlayed: 0, rrWinPercentage: 0
          },
          bracketScores: {
            r16Won: 0, r16Lost: 0, qfWon: 0, qfLost: 0,
            sfWon: 0, sfLost: 0, finalsWon: 0, finalsLost: 0,
            bracketWon: 0, bracketLost: 0, bracketPlayed: 0
          },
          totalStats: {
            totalWon: 0, totalLost: 0, totalPlayed: 0,
            winPercentage: 0, bodFinish: 0
          }
        });
      }

      // Update scores based on match round
      if (isRoundRobinRound(match.round)) {
        result.roundRobinScores.rrPlayed += 1;
        if (won) {
          result.roundRobinScores.rrWon += 1;
        } else {
          result.roundRobinScores.rrLost += 1;
        }
        result.roundRobinScores.rrWinPercentage = 
          result.roundRobinScores.rrPlayed > 0 ? 
          result.roundRobinScores.rrWon / result.roundRobinScores.rrPlayed : 0;
      } else {
        // Bracket match
        result.bracketScores.bracketPlayed += 1;
        if (won) {
          result.bracketScores.bracketWon += 1;
          // Update specific bracket round wins
          this.updateBracketRoundScore(result, match.round, 'won');
        } else {
          result.bracketScores.bracketLost += 1;
          // Update specific bracket round losses
          this.updateBracketRoundScore(result, match.round, 'lost');
        }
      }

      // Update total stats
      result.totalStats.totalPlayed = 
        result.roundRobinScores.rrPlayed + result.bracketScores.bracketPlayed;
      result.totalStats.totalWon = 
        result.roundRobinScores.rrWon + result.bracketScores.bracketWon;
      result.totalStats.totalLost = 
        result.roundRobinScores.rrLost + result.bracketScores.bracketLost;
      result.totalStats.winPercentage = 
        result.totalStats.totalPlayed > 0 ? 
        result.totalStats.totalWon / result.totalStats.totalPlayed : 0;

      await result.save();
      // Get team name from populated players or construct from IDs
      const teamName = result.populated('players') ? 
        (result.players as any[]).map((p: any) => p.name || p.toString()).join(' & ') :
        result.players.map((p: any) => p.toString()).join(' & ');
      console.log(`Updated tournament result for team: ${teamName}`);
    } catch (error) {
      console.error('Error updating team tournament result:', error);
    }
  }

  // Helper to update specific bracket round scores
  private updateBracketRoundScore(result: any, round: string, outcome: 'won' | 'lost'): void {
    const roundMapping: Record<string, string> = {
      'round-of-16': 'r16',
      'quarterfinal': 'qf', 
      'semifinal': 'sf',
      'final': 'finals'
    };

    const roundPrefix = roundMapping[round];
    if (roundPrefix) {
      const field = `${roundPrefix}${outcome === 'won' ? 'Won' : 'Lost'}`;
      if (result.bracketScores[field] !== undefined) {
        result.bracketScores[field] += 1;
      }
    }
  }

  // Update bracket progression tracking
  private async updateBracketProgression(tournament: any, match: IMatch): Promise<void> {
    // This would update tournament's bracket progression tracking
    // For now, log the progression
    console.log(`Bracket progression: ${match.round} winner is team ${match.winner}`);
  }
}

export const liveTournamentController = new LiveTournamentController();