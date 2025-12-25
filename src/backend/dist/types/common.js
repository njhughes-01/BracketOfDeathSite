"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorMessages = exports.ValidationPatterns = void 0;
// Common validation patterns
exports.ValidationPatterns = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    NAME: /^[a-zA-Z\s'-]{2,50}$/,
    PHONE: /^\+?[\d\s-()]{10,20}$/,
};
// Common error messages
exports.ErrorMessages = {
    REQUIRED: "This field is required",
    INVALID_FORMAT: "Invalid format",
    INVALID_EMAIL: "Invalid email format",
    INVALID_NAME: "Name must be 2-50 characters and contain only letters, spaces, hyphens, and apostrophes",
    INVALID_PHONE: "Invalid phone number format",
    NOT_FOUND: "Resource not found",
    DUPLICATE_ENTRY: "Duplicate entry",
    VALIDATION_ERROR: "Validation error",
};
//# sourceMappingURL=common.js.map