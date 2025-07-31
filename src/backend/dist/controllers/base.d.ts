import { Request, Response, NextFunction } from 'express';
import { Model, Document } from 'mongoose';
export interface RequestWithAuth extends Request {
    user?: {
        id: string;
        email: string;
        username: string;
        name: string;
        isAuthorized: boolean;
        isAdmin: boolean;
        roles: string[];
    };
}
export declare class BaseController<T extends Document> {
    protected model: Model<T>;
    protected modelName: string;
    constructor(model: Model<T>, modelName: string);
    getAll: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    create(req: RequestWithAuth, res: Response, next: NextFunction): Promise<void>;
    update(req: RequestWithAuth, res: Response, next: NextFunction): Promise<void>;
    delete: (req: RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    search: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    protected buildFilter(query: any): any;
    protected buildSearchFilter(searchTerm: string): any;
    protected validateRequired(fields: string[], body: any): string[];
    protected sendError(res: Response, status: number, message: string): void;
    protected sendSuccess<T>(res: Response, data?: T, message?: string, status?: number): void;
    protected asyncHandler: (fn: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => Promise<void>) => (req: Request | RequestWithAuth, res: Response, next: NextFunction) => void;
}
//# sourceMappingURL=base.d.ts.map