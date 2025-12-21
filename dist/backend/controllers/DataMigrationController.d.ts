import { Response, NextFunction } from 'express';
import { RequestWithAuth } from './base';
export declare class DataMigrationController {
    migrateAll: (_req: RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    migratePlayers: (_req: RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    migrateTournaments: (_req: RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    migrateResults: (_req: RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    getMigrationStatus: (_req: RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    previewMigration: (_req: RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    createBackup: (_req: RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    restoreBackup: (_req: RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    validateData: (_req: RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=DataMigrationController.d.ts.map