"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = (err, _req, res, _next) => {
    let error = { ...err };
    error.message = err.message;
    console.error('Error:', err);
    let statusCode = error.statusCode || 500;
    let message = error.message || 'Internal Server Error';
    if (err.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid ID format';
    }
    if (err.name === 'MongoServerError' && err.code === 11000) {
        statusCode = 400;
        message = 'Duplicate field value';
    }
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = Object.values(err.errors).map((val) => val.message).join(', ');
    }
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    }
    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
    }
    res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map