import { Request, Response, NextFunction } from 'express';
import { ITournament, ITournamentFilter } from '../types/tournament';
import { BaseController, RequestWithAuth } from './base';
export declare class TournamentController extends BaseController<ITournament> {
    constructor();
    protected buildFilter(query: any): ITournamentFilter;
    protected buildSearchFilter(searchTerm: string): any;
    getStats: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => void;
    getByYear: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => void;
    getByFormat: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => void;
    getWithResults: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => void;
    getUpcoming: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => void;
    getRecent: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => void;
    getNextBodNumber: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => void;
    generatePlayerSeeds: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => void;
    generateTeams: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => void;
    setupTournament: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => void;
    bulkImport: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => void;
    private validateTournamentData;
    private getAllPlayersWithStats;
    private getPlayersById;
    private getPlayerStatistics;
    private calculateHistoricalSeeds;
    private calculateRecentFormSeeds;
    private calculateEloSeeds;
    private formTeams;
    private handlePreformedTeams;
    private handleDraftTeams;
    private handleStatisticalPairing;
    private handleRandomPairing;
    private handleManualTeams;
    create(req: RequestWithAuth, res: Response, next: NextFunction): Promise<void>;
    update(req: RequestWithAuth, res: Response, next: NextFunction): Promise<void>;
    delete: (req: RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
}
export declare const tournamentController: TournamentController;
//# sourceMappingURL=TournamentController.d.ts.map