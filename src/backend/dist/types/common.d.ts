import { Document, Types } from "mongoose";
export interface BaseDocument extends Document {
    _id: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const ValidationPatterns: {
    readonly EMAIL: RegExp;
    readonly NAME: RegExp;
    readonly PHONE: RegExp;
};
export declare const ErrorMessages: {
    readonly REQUIRED: "This field is required";
    readonly INVALID_FORMAT: "Invalid format";
    readonly INVALID_EMAIL: "Invalid email format";
    readonly INVALID_NAME: "Name must be 2-50 characters and contain only letters, spaces, hyphens, and apostrophes";
    readonly INVALID_PHONE: "Invalid phone number format";
    readonly NOT_FOUND: "Resource not found";
    readonly DUPLICATE_ENTRY: "Duplicate entry";
    readonly VALIDATION_ERROR: "Validation error";
};
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    details?: string[];
    errors?: string[];
}
export interface PaginationOptions {
    page?: number;
    limit?: number;
    sort?: string;
    select?: string;
}
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        current: number;
        pages: number;
        count: number;
        total: number;
    };
}
//# sourceMappingURL=common.d.ts.map