import { Request, Response, NextFunction } from 'express';
import { Model, Document } from 'mongoose';
import { ApiResponse, PaginationOptions } from '../types/common';

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

export class BaseController<T extends Document> {
  protected model: Model<T>;
  protected modelName: string;

  constructor(model: Model<T>, modelName: string) {
    this.model = model;
    this.modelName = modelName;
  }

  // Get all items with pagination
  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const options: PaginationOptions = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        sort: (req.query.sort as string) || '-createdAt',
        select: req.query.select as string,
      };

      // Build filter from query parameters
      const filter = this.buildFilter(req.query);

      // Check if the model has paginate method, otherwise use regular find
      if (typeof (this.model as any).paginate === 'function') {
        const result = await (this.model as any).paginate(filter, options);
        res.status(200).json(result);
      } else {
        // Fallback for models without pagination
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
          this.model.countDocuments(filter)
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
  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const populate = req.query.populate as string;

      let query = this.model.findById(id);

      if (populate) {
        const populateFields = populate.split(',').map(field => field.trim());
        populateFields.forEach(field => {
          query = query.populate(field);
        });
      }

      const item = await query.exec();

      if (!item) {
        const response: ApiResponse = {
          success: false,
          error: `${this.modelName} not found`,
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<T> = {
        success: true,
        data: item,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  // Create new item
  async create(req: RequestWithAuth, res: Response, next: NextFunction): Promise<void> {
    try {
      const item = new this.model(req.body);
      const savedItem = await item.save();

      const response: ApiResponse<T> = {
        success: true,
        data: savedItem,
        message: `${this.modelName} created successfully`,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  // Update item by ID
  async update(req: RequestWithAuth, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const updatedItem = await (this.model as any).findByIdAndUpdateSafe(
        id,
        req.body,
        { new: true }
      );

      if (!updatedItem) {
        const response: ApiResponse = {
          success: false,
          error: `${this.modelName} not found`,
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<T> = {
        success: true,
        data: updatedItem,
        message: `${this.modelName} updated successfully`,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  // Delete item by ID
  delete = async (req: RequestWithAuth, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const deletedItem = await this.model.findByIdAndDelete(id);

      if (!deletedItem) {
        const response: ApiResponse = {
          success: false,
          error: `${this.modelName} not found`,
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: `${this.modelName} deleted successfully`,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  // Search items
  search = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { q } = req.query;

      if (!q || typeof q !== 'string') {
        const response: ApiResponse = {
          success: false,
          error: 'Search query is required',
        };
        res.status(400).json(response);
        return;
      }

      const searchFilter = this.buildSearchFilter(q);
      const options: PaginationOptions = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        sort: (req.query.sort as string) || '-createdAt',
      };

      const result = await (this.model as any).paginate(searchFilter, options);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  // Protected method to build filter from query parameters
  protected buildFilter(query: any): any {
    // Override in child classes for model-specific filtering
    const filter: any = {};

    // Remove pagination and other non-filter parameters
    const { page, limit, sort, select, populate, q, ...filterParams } = query;

    // Add simple equality filters
    Object.keys(filterParams).forEach(key => {
      if (filterParams[key] !== undefined && filterParams[key] !== '') {
        filter[key] = filterParams[key];
      }
    });

    return filter;
  }

  // Protected method to build search filter
  protected buildSearchFilter(searchTerm: string): any {
    // Override in child classes for model-specific search
    return { $text: { $search: searchTerm } };
  }

  // Validation helper
  protected validateRequired(fields: string[], body: any): string[] {
    const missing: string[] = [];

    fields.forEach(field => {
      if (!body[field] || (typeof body[field] === 'string' && body[field].trim() === '')) {
        missing.push(field);
      }
    });

    return missing;
  }

  // Error response helper
  protected sendError(res: Response, status: number, message: string): void {
    const response: ApiResponse = {
      success: false,
      error: message,
    };
    res.status(status).json(response);
  }

  // Success response helper
  protected sendSuccess<T>(
    res: Response,
    data?: T,
    message?: string,
    status: number = 200
  ): void {
    const response: ApiResponse<T> = {
      success: true,
      ...(data && { data }),
      ...(message && { message }),
    };
    res.status(status).json(response);
  }

  // Async wrapper for better error handling
  protected asyncHandler = (
    fn: (req: Request | RequestWithAuth, res: Response, next: NextFunction) => Promise<void>
  ) => {
    return (req: Request | RequestWithAuth, res: Response, next: NextFunction): Promise<void> => {
      return Promise.resolve(fn(req, res, next)).catch(next);
    };
  };
}