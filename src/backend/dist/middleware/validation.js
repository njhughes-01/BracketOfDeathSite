"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeInput = exports.validatePagination = exports.validateRange = exports.validateDate = exports.validateEmail = exports.validateRequired = exports.validateObjectId = exports.validateRequest = void 0;
const mongoose_1 = require("mongoose");
const express_validator_1 = require("express-validator");
// Express-validator middleware
const validateRequest = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        const response = {
            success: false,
            message: 'Validation failed',
            error: errors.array().map(err => err.msg).join(', '),
        };
        res.status(400).json(response);
        return;
    }
    next();
};
exports.validateRequest = validateRequest;
// Validate MongoDB ObjectId
const validateObjectId = (req, res, next) => {
    const { id, tournamentId, playerId, matchId } = req.params;
    const idsToValidate = [
        { name: 'id', value: id },
        { name: 'tournamentId', value: tournamentId },
        { name: 'playerId', value: playerId },
        { name: 'matchId', value: matchId },
    ].filter(item => item.value);
    for (const { name, value } of idsToValidate) {
        if (value && value !== 'undefined' && !mongoose_1.Types.ObjectId.isValid(value)) {
            const response = {
                success: false,
                error: `Invalid ${name} format`,
            };
            res.status(400).json(response);
            return;
        }
        // Check for the specific case of 'undefined' string
        if (value === 'undefined') {
            const response = {
                success: false,
                error: `${name} is required`,
            };
            res.status(400).json(response);
            return;
        }
    }
    next();
};
exports.validateObjectId = validateObjectId;
// Validate required fields
const validateRequired = (fields) => {
    return (req, res, next) => {
        const missing = [];
        fields.forEach(field => {
            const value = req.body[field];
            if (value === undefined || value === null ||
                (typeof value === 'string' && value.trim() === '')) {
                missing.push(field);
            }
        });
        if (missing.length > 0) {
            const response = {
                success: false,
                error: `Missing required fields: ${missing.join(', ')}`,
            };
            res.status(400).json(response);
            return;
        }
        next();
    };
};
exports.validateRequired = validateRequired;
// Validate email format
const validateEmail = (req, res, next) => {
    const { email } = req.body;
    if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            const response = {
                success: false,
                error: 'Invalid email format',
            };
            res.status(400).json(response);
            return;
        }
    }
    next();
};
exports.validateEmail = validateEmail;
// Validate date format
const validateDate = (field) => {
    return (req, res, next) => {
        const dateValue = req.body[field];
        if (dateValue) {
            const date = new Date(dateValue);
            if (isNaN(date.getTime())) {
                const response = {
                    success: false,
                    error: `Invalid date format for ${field}`,
                };
                res.status(400).json(response);
                return;
            }
        }
        next();
    };
};
exports.validateDate = validateDate;
// Validate numeric range
const validateRange = (field, min, max) => {
    return (req, res, next) => {
        const value = req.body[field];
        if (value !== undefined && value !== null) {
            const numValue = Number(value);
            if (isNaN(numValue)) {
                const response = {
                    success: false,
                    error: `${field} must be a number`,
                };
                res.status(400).json(response);
                return;
            }
            if (min !== undefined && numValue < min) {
                const response = {
                    success: false,
                    error: `${field} must be at least ${min}`,
                };
                res.status(400).json(response);
                return;
            }
            if (max !== undefined && numValue > max) {
                const response = {
                    success: false,
                    error: `${field} must be at most ${max}`,
                };
                res.status(400).json(response);
                return;
            }
        }
        next();
    };
};
exports.validateRange = validateRange;
// Validate pagination parameters
const validatePagination = (req, res, next) => {
    const { page, limit } = req.query;
    if (page) {
        const pageNum = Number(page);
        if (isNaN(pageNum) || pageNum < 1) {
            const response = {
                success: false,
                error: 'Page must be a positive integer',
            };
            res.status(400).json(response);
            return;
        }
    }
    if (limit) {
        const limitNum = Number(limit);
        // Allow higher limits for admin requests (up to 1000), regular requests limited to 100
        const maxLimit = req.path.includes('/admin/') || req.headers.authorization ? 1000 : 100;
        if (isNaN(limitNum) || limitNum < 1 || limitNum > maxLimit) {
            const response = {
                success: false,
                error: `Limit must be between 1 and ${maxLimit}`,
            };
            res.status(400).json(response);
            return;
        }
    }
    next();
};
exports.validatePagination = validatePagination;
// Sanitize input
const sanitizeInput = (req, _res, next) => {
    // Remove potentially dangerous fields
    const dangerousFields = ['__proto__', 'constructor', 'prototype'];
    const sanitizeObject = (obj) => {
        if (typeof obj !== 'object' || obj === null) {
            return obj;
        }
        if (Array.isArray(obj)) {
            return obj.map(sanitizeObject);
        }
        const sanitized = {};
        for (const key in obj) {
            if (!dangerousFields.includes(key)) {
                sanitized[key] = sanitizeObject(obj[key]);
            }
        }
        return sanitized;
    };
    req.body = sanitizeObject(req.body);
    next();
};
exports.sanitizeInput = sanitizeInput;
//# sourceMappingURL=validation.js.map