import { Request, Response, NextFunction } from "express";
import { IPlayer, IPlayerFilter } from "../types/player";
import { BaseCrudController, RequestWithAuth } from "./base";
export declare class PlayerController extends BaseCrudController<IPlayer> {
    constructor();
    protected buildFilter(query: any): IPlayerFilter;
    protected buildSearchFilter(searchTerm: string): any;
    getStats: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    getScoringSummary: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    getChampions: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    getPerformanceTrends: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    updateStats: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    bulkImport: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    private calculateConsistencyScore;
    private validatePlayerData;
    create: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    update: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
}
declare const _default: PlayerController;
export default _default;
//# sourceMappingURL=PlayerController.d.ts.map