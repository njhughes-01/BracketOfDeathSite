"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseController = void 0;
class BaseController {
    model;
    modelName;
    constructor(model, modelName) {
        this.model = model;
        this.modelName = modelName;
    }
    getAll = async (req, res, next) => {
        try {
            const options = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 10,
                sort: req.query.sort || '-createdAt',
                select: req.query.select,
            };
            const filter = this.buildFilter(req.query);
            if (typeof this.model.paginate === 'function') {
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
        }
        catch (error) {
            next(error);
        }
    };
    getById = async (req, res, next) => {
        try {
            const { id } = req.params;
            const populate = req.query.populate;
            let query = this.model.findById(id);
            if (populate) {
                const populateFields = populate.split(',').map(field => field.trim());
                populateFields.forEach(field => {
                    query = query.populate(field);
                });
            }
            const item = await query.exec();
            if (!item) {
                const response = {
                    success: false,
                    error: `${this.modelName} not found`,
                };
                res.status(404).json(response);
                return;
            }
            const response = {
                success: true,
                data: item,
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    };
    async create(req, res, next) {
        try {
            const item = new this.model(req.body);
            const savedItem = await item.save();
            const response = {
                success: true,
                data: savedItem,
                message: `${this.modelName} created successfully`,
            };
            res.status(201).json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            const { id } = req.params;
            const updatedItem = await this.model.findByIdAndUpdateSafe(id, req.body, { new: true });
            if (!updatedItem) {
                const response = {
                    success: false,
                    error: `${this.modelName} not found`,
                };
                res.status(404).json(response);
                return;
            }
            const response = {
                success: true,
                data: updatedItem,
                message: `${this.modelName} updated successfully`,
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    }
    delete = async (req, res, next) => {
        try {
            const { id } = req.params;
            const deletedItem = await this.model.findByIdAndDelete(id);
            if (!deletedItem) {
                const response = {
                    success: false,
                    error: `${this.modelName} not found`,
                };
                res.status(404).json(response);
                return;
            }
            const response = {
                success: true,
                message: `${this.modelName} deleted successfully`,
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    };
    search = async (req, res, next) => {
        try {
            const { q } = req.query;
            if (!q || typeof q !== 'string') {
                const response = {
                    success: false,
                    error: 'Search query is required',
                };
                res.status(400).json(response);
                return;
            }
            const searchFilter = this.buildSearchFilter(q);
            const options = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 10,
                sort: req.query.sort || '-createdAt',
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
        Object.keys(filterParams).forEach(key => {
            if (filterParams[key] !== undefined && filterParams[key] !== '') {
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
        fields.forEach(field => {
            if (!body[field] || (typeof body[field] === 'string' && body[field].trim() === '')) {
                missing.push(field);
            }
        });
        return missing;
    }
    sendError(res, status, message) {
        const response = {
            success: false,
            error: message,
        };
        res.status(status).json(response);
    }
    sendSuccess(res, data, message, status = 200) {
        const response = {
            success: true,
            ...(data && { data }),
            ...(message && { message }),
        };
        res.status(status).json(response);
    }
    asyncHandler = (fn) => {
        return (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    };
}
exports.BaseController = BaseController;
//# sourceMappingURL=base.js.map