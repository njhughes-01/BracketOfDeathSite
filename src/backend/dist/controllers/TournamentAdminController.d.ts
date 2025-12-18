import { Request, Response, NextFunction } from 'express';
import { ITournament } from '../types/tournament';
import { BaseController, RequestWithAuth } from './base';
export declare class TournamentAdminController extends BaseController<ITournament> {
    constructor();
    /**
     * Update tournament status with validation
     */
    updateStatus: (req: RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Add players to a tournament
     */
    addPlayers: (req: RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Remove a player from a tournament
     */
    removePlayer: (req: RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Generate matches for a tournament (create bracket)
     */
    generateMatches: (req: RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Update match score
     */
    updateMatchScore: (req: RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Finalize tournament (mark as completed)
     */
    finalizeTournament: (req: RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Register a player for a tournament
     */
    registerPlayer: (req: RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Unregister a player from a tournament
     */
    unregisterPlayer: (req: RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Get tournament registration information
     */
    getRegistrationInfo: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Finalize tournament registration and move to player selection
     */
    finalizeRegistration: (req: RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Get seeding preview for tournament
     */
    getSeedingPreview: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Get tournament with matches and results
     */
    getTournamentWithMatches: (req: Request, res: Response, next: NextFunction) => Promise<void>;
<<<<<<< HEAD
    private createSeededBracketMatches;
    private generateSeededBracketForTeams;
    /**
     * Arrange teams for proper tournament bracket seeding
     * Ensures that top seeds don't meet until later rounds
     */
    private arrangeTeamsForBracket;
=======
    /**
     * Delete a scheduled tournament with enterprise-grade cascade deletion
     * Implements compensation patterns, audit trails, and robust error handling
     */
    deleteTournament: (req: RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    private createBracketMatches;
    private generateBracketForTeams;
>>>>>>> new-ui
    private getRoundName;
    private updateTournamentResults;
    private updateTeamResult;
    private calculatePlayerPoints;
    private updatePlayerStatistics;
}
export default TournamentAdminController;
//# sourceMappingURL=TournamentAdminController.d.ts.map