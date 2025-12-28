import { Request, Response, NextFunction } from "express";
import { errorHandler, AppError } from "../../../../src/backend/middleware/errorHandler";

describe("errorHandler middleware", () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });

        mockReq = {};
        mockRes = {
            status: statusMock,
            json: jsonMock,
        };
        mockNext = jest.fn();

        // Suppress console.error in tests
        jest.spyOn(console, "error").mockImplementation(() => { });
    });

    it("should handle generic Error with 500 status", () => {
        const error: AppError = new Error("Something went wrong");

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(500);
        expect(jsonMock).toHaveBeenCalledWith({
            success: false,
            error: "Something went wrong",
        });
    });

    it("should use provided statusCode", () => {
        const error: AppError = new Error("Not found");
        error.statusCode = 404;

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(404);
    });

    it("should handle CastError (invalid ObjectId)", () => {
        const error: AppError = new Error("Cast to ObjectId failed");
        error.name = "CastError";

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
            success: false,
            error: "Invalid ID format",
        });
    });

    it("should handle MongoDB duplicate key error", () => {
        const error: AppError & { code?: number } = new Error("Duplicate");
        error.name = "MongoServerError";
        (error as any).code = 11000;

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
            success: false,
            error: "Duplicate field value",
        });
    });

    it("should handle Mongoose ValidationError", () => {
        const error: AppError & { errors?: Record<string, { message: string }> } = new Error("Validation failed");
        error.name = "ValidationError";
        (error as any).errors = {
            name: { message: "Name is required" },
            email: { message: "Invalid email format" },
        };

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
            success: false,
            error: "Name is required, Invalid email format",
        });
    });

    it("should handle JsonWebTokenError", () => {
        const error: AppError = new Error("Invalid signature");
        error.name = "JsonWebTokenError";

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({
            success: false,
            error: "Invalid token",
        });
    });

    it("should handle TokenExpiredError", () => {
        const error: AppError = new Error("jwt expired");
        error.name = "TokenExpiredError";

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({
            success: false,
            error: "Token expired",
        });
    });

    it("should include stack trace in development", () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = "development";

        const error: AppError = new Error("Dev error");
        error.stack = "Error: Dev error\n    at test.js:1:1";

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        expect(jsonMock).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                error: "Dev error",
                stack: expect.any(String),
            })
        );

        process.env.NODE_ENV = originalEnv;
    });

    it("should not include stack trace in production", () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = "production";

        const error: AppError = new Error("Prod error");
        error.stack = "Error: Prod error\n    at test.js:1:1";

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        expect(jsonMock).toHaveBeenCalledWith({
            success: false,
            error: "Prod error",
        });

        process.env.NODE_ENV = originalEnv;
    });
});
