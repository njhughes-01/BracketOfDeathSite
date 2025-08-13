import { Schema, Model, Document, QueryOptions } from 'mongoose';
import { PaginationOptions, PaginatedResponse } from '../types/common';
export interface BaseModelMethods {
    toJSON(): any;
}
export interface BaseModelStatics<T extends Document> extends Model<T> {
    paginate(filter: any, options: PaginationOptions): Promise<PaginatedResponse<T>>;
    findByIdAndUpdateSafe(id: string, update: any, options?: QueryOptions): Promise<T | null>;
    findOneAndUpdateSafe(filter: any, update: any, options?: QueryOptions): Promise<T | null>;
}
export declare const baseSchemaOptions: {
    timestamps: boolean;
    toJSON: {
        virtuals: boolean;
        versionKey: boolean;
        transform: (_doc: any, ret: any) => any;
    };
    toObject: {
        virtuals: boolean;
        versionKey: boolean;
    };
};
export declare const commonFields: {
    createdAt: {
        type: DateConstructor;
        default: () => number;
    };
    updatedAt: {
        type: DateConstructor;
        default: () => number;
    };
};
export declare const baseMethods: {
    toJSON: (this: any) => any;
};
export declare const baseStatics: {
    paginate<T extends Document>(this: Model<T>, filter?: any, options?: PaginationOptions): Promise<PaginatedResponse<T>>;
    findByIdAndUpdateSafe<T extends Document>(this: Model<T>, id: string, update: any, options?: QueryOptions): Promise<T | null>;
    findOneAndUpdateSafe<T extends Document>(this: Model<T>, filter: any, update: any, options?: QueryOptions): Promise<T | null>;
};
export declare const createNumericValidator: (min?: number, max?: number) => {
    validator: (value: number) => boolean;
    message: string;
};
export declare const createPercentageValidator: () => {
    validator: (value: number) => boolean;
    message: string;
};
export declare const createStringValidator: (minLength?: number, maxLength?: number) => {
    validator: (value: string) => boolean;
    message: string;
};
export declare const createPreSaveMiddleware: (calculations?: (doc: any) => void) => (this: any, next: any) => void;
export declare const createIndexes: (schema: Schema, indexes: Array<{
    fields: any;
    options?: any;
}>) => void;
//# sourceMappingURL=base.d.ts.map