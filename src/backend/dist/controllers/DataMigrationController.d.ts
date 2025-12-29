import { Request, Response } from "express";
import { BaseController } from "./base";
declare class DataMigrationController extends BaseController {
    constructor();
    migrateAll: (req: Request | import("./base").RequestWithAuth, res: Response, next: import("express").NextFunction) => Promise<void>;
    migratePlayers: (req: Request | import("./base").RequestWithAuth, res: Response, next: import("express").NextFunction) => Promise<void>;
    migrateTournaments: (req: Request | import("./base").RequestWithAuth, res: Response, next: import("express").NextFunction) => Promise<void>;
    migrateResults: (req: Request | import("./base").RequestWithAuth, res: Response, next: import("express").NextFunction) => Promise<void>;
    getMigrationStatus: (req: Request | import("./base").RequestWithAuth, res: Response, next: import("express").NextFunction) => Promise<void>;
    previewMigration: (req: Request | import("./base").RequestWithAuth, res: Response, next: import("express").NextFunction) => Promise<void>;
    createBackup: (req: Request | import("./base").RequestWithAuth, res: Response, next: import("express").NextFunction) => Promise<void>;
    restoreBackup: (req: Request | import("./base").RequestWithAuth, res: Response, next: import("express").NextFunction) => Promise<void>;
    validateData: (req: Request | import("./base").RequestWithAuth, res: Response, next: import("express").NextFunction) => Promise<void>;
}
declare const _default: DataMigrationController;
export default _default;
//# sourceMappingURL=DataMigrationController.d.ts.map