import { Schema, Model, Document, QueryOptions } from "mongoose";
import { PaginationOptions, PaginatedResponse } from "../types/common";

export interface BaseModelMethods {
  toJSON(): any;
}

export interface BaseModelStatics<T extends Document> extends Model<T> {
  paginate(
    filter: any,
    options: PaginationOptions,
  ): Promise<PaginatedResponse<T>>;
  findByIdAndUpdateSafe(
    id: string,
    update: any,
    options?: QueryOptions,
  ): Promise<T | null>;
  findOneAndUpdateSafe(
    filter: any,
    update: any,
    options?: QueryOptions,
  ): Promise<T | null>;
}

// Base schema options
export const baseSchemaOptions = {
  timestamps: true,
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: function (_doc: any, ret: any) {
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
export const commonFields = {
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
export const baseMethods = {
  toJSON: function (this: any): any {
    const obj: any = this.toObject();
    obj.id = obj._id;
    delete obj._id;
    delete obj.__v;
    return obj;
  },
};

// Base schema statics
export const baseStatics = {
  // Pagination helper
  async paginate<T extends Document>(
    this: Model<T>,
    filter: any = {},
    options: PaginationOptions = {},
  ): Promise<PaginatedResponse<T>> {
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
  async findByIdAndUpdateSafe<T extends Document>(
    this: Model<T>,
    id: string,
    update: any,
    options: QueryOptions = {},
  ): Promise<T | null> {
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

  async findOneAndUpdateSafe<T extends Document>(
    this: Model<T>,
    filter: any,
    update: any,
    options: QueryOptions = {},
  ): Promise<T | null> {
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
export const createNumericValidator = (min: number = 0, max?: number) => ({
  validator: (value: number) => {
    if (value < min) return false;
    if (max !== undefined && value > max) return false;
    return true;
  },
  message: `Value must be between ${min}${max ? ` and ${max}` : " and above"}`,
});

export const createPercentageValidator = () => ({
  validator: (value: number) => value >= 0 && value <= 1,
  message: "Percentage must be between 0 and 1",
});

export const createStringValidator = (
  minLength: number = 1,
  maxLength: number = 100,
) => ({
  validator: (value: string) => {
    if (!value || value.trim().length < minLength) return false;
    if (value.trim().length > maxLength) return false;
    return true;
  },
  message: `String must be between ${minLength} and ${maxLength} characters`,
});

// Pre-save middleware factory
export const createPreSaveMiddleware = (calculations?: (doc: any) => void) => {
  return function (this: any, next: any) {
    this.updatedAt = new Date();

    if (calculations) {
      calculations(this);
    }

    next();
  };
};

// Index creation helper
export const createIndexes = (
  schema: Schema,
  indexes: Array<{ fields: any; options?: any }>,
) => {
  indexes.forEach(({ fields, options }) => {
    schema.index(fields, options);
  });
};
