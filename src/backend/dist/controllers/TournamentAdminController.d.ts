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
     * Get tournament with matches and results
     */
    getTournamentWithMatches: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    private createBracketMatches;
    private generateBracketForTeams;
    private getRoundName;
    private updateTournamentResults;
    private updateTeamResult;
    private calculatePlayerPoints;
    private updatePlayerStatistics;
}
export default TournamentAdminController;
//# sourceMappingURL=TournamentAdminController.d.ts.map