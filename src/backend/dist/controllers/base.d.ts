import { Request, Response, NextFunction } from "express";
import { Model, Document } from "mongoose";
import { ApiResponse } from "../types/common";
/**
 * RequestWithAuth extends the standard Express Request with user information
 */
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
/**
 * BaseController provides shared utility methods for all controllers,
 * specifically for standardized response formatting and error handling.
 */
export declare abstract class BaseController {
    /**
     * Handle errors consistently across all controllers
     */
    protected handleError(res: Response, error: unknown, message: string, statusCode?: number): void;
    /**
     * Send a success response
     */
    protected sendSuccess<T>(res: Response, data?: T, message?: string, pagination?: ApiResponse<T>["pagination"], status?: number): void;
    /**
     * Send a generic error response
     */
    protected sendError(res: Response, error: string, statusCode?: number): void;
    /**
     * Send a not found response
     */
    protected sendNotFound(res: Response, resource?: string): void;
    /**
     * Send an unauthorized response
     */
    protected sendUnauthorized(res: Response, message?: string): void;
    /**
     * Send a forbidden response
     */
    protected sendForbidden(res: Response, message?: string): void;
    /**
     * Send a validation error response
     */
    protected sendValidationError(res: Response, errors: string[]): void;
    /**
     * Async wrapper for better error handling in route handlers
     */
    protected asyncHandler: (fn: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => Promise<void>) => (req: Request | RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
}
/**
 * BaseCrudController extends BaseController with generic CRUD operations for Mongoose models.
 */
export declare class BaseCrudController<T extends Document> extends BaseController {
    protected model: Model<T>;
    protected modelName: string;
    constructor(model: Model<T>, modelName: string);
    getAll: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    create: (req: RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    update: (req: RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    delete: (req: RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
    search: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    protected buildFilter(query: any): any;
    protected buildSearchFilter(searchTerm: string): any;
    protected validateRequired(fields: string[], body: any): string[];
}
//# sourceMappingURL=base.d.ts.map