import { Request, Response, NextFunction } from "express";
import { ITournamentResult, ITournamentResultFilter } from "../types/tournamentResult";
import { BaseController, RequestWithAuth } from "./base";
export declare class TournamentResultController extends BaseController<ITournamentResult> {
    constructor();
    protected buildFilter(query: any): ITournamentResultFilter;
    getAll: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getByTournament: any;
    getByPlayer: any;
    getLeaderboard: any;
    getStats: any;
    bulkImport: any;
    private parseSortString;
    private calculatePlayerStats;
    private validateTournamentResultData;
    create(req: RequestWithAuth, res: Response, next: NextFunction): Promise<void>;
    update(req: RequestWithAuth, res: Response, next: NextFunction): Promise<void>;
    /**
     * Get the range of available years from tournament data
     */
    getAvailableYears: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
export declare const tournamentResultController: TournamentResultController;
//# sourceMappingURL=TournamentResultController.d.ts.map