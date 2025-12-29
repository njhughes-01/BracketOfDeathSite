import { Request, Response, NextFunction } from "express";
import { ITournamentResult, ITournamentResultFilter } from "../types/tournamentResult";
import { BaseCrudController, RequestWithAuth } from "./base";
export declare class TournamentResultController extends BaseCrudController<ITournamentResult> {
    constructor();
    protected buildFilter: (query: any) => ITournamentResultFilter;
    getAll: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    getByTournament: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    getByPlayer: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    getLeaderboard: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    getStats: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    bulkImport: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    private parseSortString;
    private calculatePlayerStats;
    private validateTournamentResultData;
    create: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    update: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Get the range of available years from tournament data
     */
    getAvailableYears: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
}
declare const _default: TournamentResultController;
export default _default;
//# sourceMappingURL=TournamentResultController.d.ts.map