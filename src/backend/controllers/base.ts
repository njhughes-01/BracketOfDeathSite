import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";
import { Model, Document } from "mongoose";
import { ApiResponse, PaginationOptions } from "../types/common";

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
export abstract class BaseController {
  /**
   * Handle errors consistently across all controllers
   */
  protected handleError(
    res: Response,
    error: unknown,
    message: string,
    statusCode: number = 500,
  ): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`${message}:`, error);

    const response: ApiResponse = {
      success: false,
      error: errorMessage || message,
    };

    res.status(statusCode).json(response);
  }

  /**
   * Send a success response
   */
  protected sendSuccess<T>(
    res: Response,
    data?: T,
    message?: string,
    pagination?: ApiResponse<T>["pagination"],
    status: number = 200,
  ): void {
    const response: ApiResponse<T> = {
      success: true,
      ...(data !== undefined && { data }),
      ...(message && { message }),
      ...(pagination && { pagination }),
    };

    res.status(status).json(response);
  }

  /**
   * Send a generic error response
   */
  protected sendError(
    res: Response,
    error: string,
    statusCode: number = 400,
  ): void {
    const response: ApiResponse = {
      success: false,
      error,
    };

    res.status(statusCode).json(response);
  }

  /**
   * Send a not found response
   */
  protected sendNotFound(res: Response, resource: string = "Resource"): void {
    this.sendError(res, `${resource} not found`, 404);
  }

  /**
   * Send an unauthorized response
   */
  protected sendUnauthorized(
    res: Response,
    message: string = "Unauthorized",
  ): void {
    this.sendError(res, message, 401);
  }

  /**
   * Send a forbidden response
   */
  protected sendForbidden(
    res: Response,
    message: string = "Access denied",
  ): void {
    this.sendError(res, message, 403);
  }

  /**
   * Send a validation error response
   */
  protected sendValidationError(res: Response, errors: string[]): void {
    const response: ApiResponse = {
      success: false,
      error: "Validation failed",
      errors,
    };

    res.status(400).json(response);
  }

  /**
   * Async wrapper for better error handling in route handlers
   */
  protected asyncHandler = (
    fn: (
      req: Request | RequestWithAuth,
      res: Response,
      next: NextFunction,
    ) => Promise<void>,
  ) => {
    return (
      req: Request | RequestWithAuth,
      res: Response,
      next: NextFunction,
    ): Promise<void> => {
      return Promise.resolve(fn(req, res, next)).catch(next);
    };
  };
}

/**
 * BaseCrudController extends BaseController with generic CRUD operations for Mongoose models.
 */
export class BaseCrudController<T extends Document> extends BaseController {
  protected model: Model<T>;
  protected modelName: string;

  constructor(model: Model<T>, modelName: string) {
    super();
    this.model = model;
    this.modelName = modelName;
  }

  // Get all items with pagination
  getAll = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const options: PaginationOptions = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        sort: (req.query.sort as string) || "-createdAt",
        select: req.query.select as string,
      };

      const filter = this.buildFilter(req.query);

      if (typeof (this.model as any).paginate === "function") {
        const result = await (this.model as any).paginate(filter, options);
        res.status(200).json(result);
      } else {
        const skip = (options.page - 1) * options.limit;
        let query = this.model.find(filter);

        if (options.select) {
          query = query.select(options.select);
        }

        if (options.sort) {
          query = query.sort(options.sort);
        }

        const [docs, totalDocs] = await Promise.all([
          query.skip(skip).limit(options.limit).exec(),
          this.model.countDocuments(filter),
        ]);

        const totalPages = Math.ceil(totalDocs / options.limit);

        const result = {
          docs,
          totalDocs,
          limit: options.limit,
          page: options.page,
          totalPages,
          hasNextPage: options.page < totalPages,
          hasPrevPage: options.page > 1,
          nextPage: options.page < totalPages ? options.page + 1 : null,
          prevPage: options.page > 1 ? options.page - 1 : null,
          pagingCounter: skip + 1,
        };

        res.status(200).json(result);
      }
    } catch (error) {
      next(error);
    }
  };

  // Get single item by ID
  getById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const populate = req.query.populate as string;

      let query = this.model.findById(id);

      if (populate) {
        const populateFields = populate.split(",").map((field) => field.trim());
        populateFields.forEach((field) => {
          query = query.populate(field);
        });
      }

      const item = await query.exec();

      if (!item) {
        this.sendNotFound(res, this.modelName);
        return;
      }

      this.sendSuccess(res, item);
    } catch (error) {
      next(error);
    }
  };

  // Create new item
  create = async (
    req: RequestWithAuth,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const item = new this.model(req.body);
      const savedItem = await item.save();

      this.sendSuccess(res, savedItem, `${this.modelName} created successfully`, undefined, 201);
    } catch (error) {
      next(error);
    }
  };

  // Update item by ID
  update = async (
    req: RequestWithAuth,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { id } = req.params;

      const updatedItem = await (this.model as any).findByIdAndUpdateSafe(
        id,
        req.body,
        { new: true, runValidators: true },
      );

      if (!updatedItem) {
        this.sendNotFound(res, this.modelName);
        return;
      }

      this.sendSuccess(res, updatedItem, `${this.modelName} updated successfully`);
    } catch (error) {
      next(error);
    }
  };

  // Delete item by ID
  delete = async (
    req: RequestWithAuth,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { id } = req.params;

      const deletedItem = await this.model.findByIdAndDelete(id);

      if (!deletedItem) {
        this.sendNotFound(res, this.modelName);
        return;
      }

      this.sendSuccess(res, null, `${this.modelName} deleted successfully`);
    } catch (error) {
      next(error);
    }
  };

  // Search items
  search = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { q } = req.query;

      if (!q || typeof q !== "string") {
        this.sendError(res, "Search query is required");
        return;
      }

      const searchFilter = this.buildSearchFilter(q);
      const options: PaginationOptions = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        sort: (req.query.sort as string) || "-createdAt",
      };

      const result = await (this.model as any).paginate(searchFilter, options);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  protected buildFilter(query: any): any {
    const filter: any = {};
    const { page, limit, sort, select, populate, q, ...filterParams } = query;

    Object.keys(filterParams).forEach((key) => {
      if (filterParams[key] !== undefined && filterParams[key] !== "") {
        filter[key] = filterParams[key];
      }
    });

    return filter;
  }

  protected buildSearchFilter(searchTerm: string): any {
    return { $text: { $search: searchTerm } };
  }

  protected validateRequired(fields: string[], body: any): string[] {
    const missing: string[] = [];

    fields.forEach((field) => {
      if (
        !body[field] ||
        (typeof body[field] === "string" && body[field].trim() === "")
      ) {
        missing.push(field);
      }
    });

    return missing;
  }
}
