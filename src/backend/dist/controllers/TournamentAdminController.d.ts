import { Request, Response, NextFunction } from "express";
import { BaseController, RequestWithAuth } from "./base";
export declare class TournamentAdminController extends BaseController {
    constructor();
    /**
     * Update tournament status with validation
     */
    updateStatus: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Add players to a tournament
     */
    addPlayers: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Remove a player from a tournament
     */
    removePlayer: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Generate matches for a tournament (create bracket)
     */
    generateMatches: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Update match score
     */
    updateMatchScore: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Finalize tournament (mark as completed)
     */
    finalizeTournament: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Register a player for a tournament
     */
    registerPlayer: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Unregister a player from a tournament
     */
    unregisterPlayer: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Get tournament registration information
     */
    getRegistrationInfo: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Finalize tournament registration and move to player selection
     */
    finalizeRegistration: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Get seeding preview for tournament
     */
    getSeedingPreview: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Get tournament with matches and results
     */
    getTournamentWithMatches: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Delete a scheduled tournament with enterprise-grade cascade deletion
     * Implements compensation patterns, audit trails, and robust error handling
     */
    deleteTournament: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    private createSeededBracketMatches;
    private generateSeededBracketForTeams;
    /**
     * Arrange teams for proper tournament bracket seeding
     * Ensures that top seeds don't meet until later rounds
     */
    private arrangeTeamsForBracket;
    private getRoundName;
    private updateTournamentResults;
    private updateTeamResult;
    private calculatePlayerPoints;
    private updatePlayerStatistics;
}
declare const _default: TournamentAdminController;
export default _default;
//# sourceMappingURL=TournamentAdminController.d.ts.map