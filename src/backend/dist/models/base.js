"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIndexes = exports.createPreSaveMiddleware = exports.createStringValidator = exports.createPercentageValidator = exports.createNumericValidator = exports.baseStatics = exports.baseMethods = exports.commonFields = exports.baseSchemaOptions = void 0;
// Base schema options
exports.baseSchemaOptions = {
    timestamps: true,
    toJSON: {
        virtuals: true,
        versionKey: false,
        transform: function (_doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        },
    },
    toObject: {
        virtuals: true,
        versionKey: false,
    },
};
// Common schema fields
exports.commonFields = {
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
};
// Base schema methods
exports.baseMethods = {
    toJSON: function () {
        const obj = this.toObject();
        obj.id = obj._id;
        delete obj._id;
        delete obj.__v;
        return obj;
    },
};
// Base schema statics
exports.baseStatics = {
    // Pagination helper
    async paginate(filter = {}, options = {}) {
        const { page = 1, limit = 10, sort = "-createdAt", select = "" } = options;
        const skip = (page - 1) * limit;
        const query = this.find(filter);
        if (select) {
            query.select(select);
        }
        const [results, total] = await Promise.all([
            query.sort(sort).skip(skip).limit(limit).exec(),
            this.countDocuments(filter).exec(),
        ]);
        const pages = Math.ceil(total / limit);
        return {
            success: true,
            data: results,
            pagination: {
                current: page,
                pages,
                count: results.length,
                total,
            },
        };
    },
    // Safe update methods that handle common validation
    async findByIdAndUpdateSafe(id, update, options = {}) {
        const defaultOptions = {
            new: true,
            runValidators: true,
            context: "query",
        };
        return this.findByIdAndUpdate(id, update, {
            ...defaultOptions,
            ...options,
        });
    },
    async findOneAndUpdateSafe(filter, update, options = {}) {
        const defaultOptions = {
            new: true,
            runValidators: true,
            context: "query",
        };
        return this.findOneAndUpdate(filter, update, {
            ...defaultOptions,
            ...options,
        });
    },
};
// Validation helpers
const createNumericValidator = (min = 0, max) => ({
    validator: (value) => {
        if (value < min)
            return false;
        if (max !== undefined && value > max)
            return false;
        return true;
    },
    message: `Value must be between ${min}${max ? ` and ${max}` : " and above"}`,
});
exports.createNumericValidator = createNumericValidator;
const createPercentageValidator = () => ({
    validator: (value) => value >= 0 && value <= 1,
    message: "Percentage must be between 0 and 1",
});
exports.createPercentageValidator = createPercentageValidator;
const createStringValidator = (minLength = 1, maxLength = 100) => ({
    validator: (value) => {
        if (!value || value.trim().length < minLength)
            return false;
        if (value.trim().length > maxLength)
            return false;
        return true;
    },
    message: `String must be between ${minLength} and ${maxLength} characters`,
});
exports.createStringValidator = createStringValidator;
// Pre-save middleware factory
const createPreSaveMiddleware = (calculations) => {
    return function (next) {
        this.updatedAt = new Date();
        if (calculations) {
            calculations(this);
        }
        next();
    };
};
exports.createPreSaveMiddleware = createPreSaveMiddleware;
// Index creation helper
const createIndexes = (schema, indexes) => {
    indexes.forEach(({ fields, options }) => {
        schema.index(fields, options);
    });
};
exports.createIndexes = createIndexes;
//# sourceMappingURL=base.js.map