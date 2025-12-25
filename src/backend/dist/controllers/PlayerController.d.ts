import { Request, Response, NextFunction } from "express";
import { IPlayer, IPlayerFilter } from "../types/player";
import { BaseController, RequestWithAuth } from "./base";
export declare class PlayerController extends BaseController<IPlayer> {
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
    create(req: RequestWithAuth, res: Response, next: NextFunction): Promise<void>;
    update(req: RequestWithAuth, res: Response, next: NextFunction): Promise<void>;
}
export declare const playerController: PlayerController;
//# sourceMappingURL=PlayerController.d.ts.map