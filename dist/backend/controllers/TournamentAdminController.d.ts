import { Request, Response, NextFunction } from 'express';
import { ITournament } from '../types/tournament';
import { BaseController, RequestWithAuth } from './base';
export declare class TournamentAdminController extends BaseController<ITournament> {
    constructor();
    updateStatus: (req: RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    addPlayers: (req: RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    removePlayer: (req: RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    generateMatches: (req: RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    updateMatchScore: (req: RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    finalizeTournament: (req: RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    registerPlayer: (req: RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    unregisterPlayer: (req: RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    getRegistrationInfo: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    finalizeRegistration: (req: RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    getSeedingPreview: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getTournamentWithMatches: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    deleteTournament: (req: RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    private createSeededBracketMatches;
    private generateSeededBracketForTeams;
    private arrangeTeamsForBracket;
    private getRoundName;
    private updateTournamentResults;
    private updateTeamResult;
    private calculatePlayerPoints;
    private updatePlayerStatistics;
}
export default TournamentAdminController;
//# sourceMappingURL=TournamentAdminController.d.ts.map