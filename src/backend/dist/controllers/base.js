"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseCrudController = exports.BaseController = void 0;
/**
 * BaseController provides shared utility methods for all controllers,
 * specifically for standardized response formatting and error handling.
 */
class BaseController {
    /**
     * Handle errors consistently across all controllers
     */
    handleError(res, error, message, statusCode = 500) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`${message}:`, error);
        const response = {
            success: false,
            error: errorMessage || message,
        };
        res.status(statusCode).json(response);
    }
    /**
     * Send a success response
     */
    sendSuccess(res, data, message, pagination, status = 200) {
        const response = {
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
    sendError(res, error, statusCode = 400) {
        const response = {
            success: false,
            error,
        };
        res.status(statusCode).json(response);
    }
    /**
     * Send a not found response
     */
    sendNotFound(res, resource = "Resource") {
        this.sendError(res, `${resource} not found`, 404);
    }
    /**
     * Send an unauthorized response
     */
    sendUnauthorized(res, message = "Unauthorized") {
        this.sendError(res, message, 401);
    }
    /**
     * Send a forbidden response
     */
    sendForbidden(res, message = "Access denied") {
        this.sendError(res, message, 403);
    }
    /**
     * Send a validation error response
     */
    sendValidationError(res, errors) {
        const response = {
            success: false,
            error: "Validation failed",
            errors,
        };
        res.status(400).json(response);
    }
    /**
     * Async wrapper for better error handling in route handlers
     */
    asyncHandler = (fn) => {
        return (req, res, next) => {
            return Promise.resolve(fn(req, res, next)).catch(next);
        };
    };
}
exports.BaseController = BaseController;
/**
 * BaseCrudController extends BaseController with generic CRUD operations for Mongoose models.
 */
class BaseCrudController extends BaseController {
    model;
    modelName;
    constructor(model, modelName) {
        super();
        this.model = model;
        this.modelName = modelName;
    }
    // Get all items with pagination
    getAll = async (req, res, next) => {
        try {
            const options = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 10,
                sort: req.query.sort || "-createdAt",
                select: req.query.select,
            };
            const filter = this.buildFilter(req.query);
            if (typeof this.model.paginate === "function") {
                const result = await this.model.paginate(filter, options);
                res.status(200).json(result);
            }
            else {
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
        }
        catch (error) {
            next(error);
        }
    };
    // Get single item by ID
    getById = async (req, res, next) => {
        try {
            const { id } = req.params;
            const populate = req.query.populate;
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
        }
        catch (error) {
            next(error);
        }
    };
    // Create new item
    create = async (req, res, next) => {
        try {
            const item = new this.model(req.body);
            const savedItem = await item.save();
            this.sendSuccess(res, savedItem, `${this.modelName} created successfully`, undefined, 201);
        }
        catch (error) {
            next(error);
        }
    };
    // Update item by ID
    update = async (req, res, next) => {
        try {
            const { id } = req.params;
            const updatedItem = await this.model.findByIdAndUpdateSafe(id, req.body, { new: true, runValidators: true });
            if (!updatedItem) {
                this.sendNotFound(res, this.modelName);
                return;
            }
            this.sendSuccess(res, updatedItem, `${this.modelName} updated successfully`);
        }
        catch (error) {
            next(error);
        }
    };
    // Delete item by ID
    delete = async (req, res, next) => {
        try {
            const { id } = req.params;
            const deletedItem = await this.model.findByIdAndDelete(id);
            if (!deletedItem) {
                this.sendNotFound(res, this.modelName);
                return;
            }
            this.sendSuccess(res, null, `${this.modelName} deleted successfully`);
        }
        catch (error) {
            next(error);
        }
    };
    // Search items
    search = async (req, res, next) => {
        try {
            const { q } = req.query;
            if (!q || typeof q !== "string") {
                this.sendError(res, "Search query is required");
                return;
            }
            const searchFilter = this.buildSearchFilter(q);
            const options = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 10,
                sort: req.query.sort || "-createdAt",
            };
            const result = await this.model.paginate(searchFilter, options);
            res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    };
    buildFilter(query) {
        const filter = {};
        const { page, limit, sort, select, populate, q, ...filterParams } = query;
        Object.keys(filterParams).forEach((key) => {
            if (filterParams[key] !== undefined && filterParams[key] !== "") {
                filter[key] = filterParams[key];
            }
        });
        return filter;
    }
    buildSearchFilter(searchTerm) {
        return { $text: { $search: searchTerm } };
    }
    validateRequired(fields, body) {
        const missing = [];
        fields.forEach((field) => {
            if (!body[field] ||
                (typeof body[field] === "string" && body[field].trim() === "")) {
                missing.push(field);
            }
        });
        return missing;
    }
}
exports.BaseCrudController = BaseCrudController;
//# sourceMappingURL=base.js.map