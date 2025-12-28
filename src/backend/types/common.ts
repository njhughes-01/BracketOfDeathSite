import { Document, Types } from "mongoose";

// Base interface for all models
export interface BaseDocument extends Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Common validation patterns
export const ValidationPatterns = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  NAME: /^[a-zA-Z\s'-]{2,50}$/,
  PHONE: /^\+?[\d\s-()]{10,20}$/,
} as const;

// Common error messages
export const ErrorMessages = {
  REQUIRED: "This field is required",
  INVALID_FORMAT: "Invalid format",
  INVALID_EMAIL: "Invalid email format",
  INVALID_NAME:
    "Name must be 2-50 characters and contain only letters, spaces, hyphens, and apostrophes",
  INVALID_PHONE: "Invalid phone number format",
  NOT_FOUND: "Resource not found",
  DUPLICATE_ENTRY: "Duplicate entry",
  VALIDATION_ERROR: "Validation error",
} as const;

// Common response interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: string[];
  errors?: string[];
  pagination?: {
    current: number;
    pages: number;
    count: number;
    total: number;
  };
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
