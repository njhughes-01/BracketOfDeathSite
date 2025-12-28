import { Request, Response, NextFunction } from "express";
import {
    validateObjectId,
    validateRequired,
    validateEmail,
    validateDate,
    validateRange,
    validatePagination,
    sanitizeInput,
} from "../../../../src/backend/middleware/validation";

describe("validation middleware", () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });

        mockReq = {
            params: {},
            body: {},
            query: {},
            path: "/api/test",
            headers: {},
        };
        mockRes = {
            status: statusMock,
            json: jsonMock,
        };
        mockNext = jest.fn();
    });

    describe("validateObjectId", () => {
        it("should pass valid ObjectId", () => {
            mockReq.params = { id: "507f1f77bcf86cd799439011" };

            validateObjectId(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(statusMock).not.toHaveBeenCalled();
        });

        it("should reject invalid ObjectId", () => {
            mockReq.params = { id: "invalid-id" };

            validateObjectId(mockReq as Request, mockRes as Response, mockNext);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                error: "Invalid id format",
            });
        });

        it("should reject 'undefined' string", () => {
            mockReq.params = { id: "undefined" };

            validateObjectId(mockReq as Request, mockRes as Response, mockNext);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                error: "id is required",
            });
        });

        it("should validate multiple ID params", () => {
            mockReq.params = {
                tournamentId: "507f1f77bcf86cd799439011",
                playerId: "507f1f77bcf86cd799439012"
            };

            validateObjectId(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe("validateRequired", () => {
        it("should pass when all required fields present", () => {
            mockReq.body = { name: "Test", email: "test@test.com" };
            const middleware = validateRequired(["name", "email"]);

            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it("should fail when fields missing", () => {
            mockReq.body = { name: "Test" };
            const middleware = validateRequired(["name", "email"]);

            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                error: "Missing required fields: email",
            });
        });

        it("should reject empty strings", () => {
            mockReq.body = { name: "" };
            const middleware = validateRequired(["name"]);

            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(statusMock).toHaveBeenCalledWith(400);
        });

        it("should reject null values", () => {
            mockReq.body = { name: null };
            const middleware = validateRequired(["name"]);

            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(statusMock).toHaveBeenCalledWith(400);
        });
    });

    describe("validateEmail", () => {
        it("should pass valid email", () => {
            mockReq.body = { email: "test@example.com" };

            validateEmail(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it("should reject invalid email", () => {
            mockReq.body = { email: "not-an-email" };

            validateEmail(mockReq as Request, mockRes as Response, mockNext);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                error: "Invalid email format",
            });
        });

        it("should pass when no email provided", () => {
            mockReq.body = {};

            validateEmail(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe("validateDate", () => {
        it("should pass valid date", () => {
            mockReq.body = { startDate: "2025-01-15" };
            const middleware = validateDate("startDate");

            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it("should reject invalid date", () => {
            mockReq.body = { startDate: "not-a-date" };
            const middleware = validateDate("startDate");

            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                error: "Invalid date format for startDate",
            });
        });
    });

    describe("validateRange", () => {
        it("should pass value within range", () => {
            mockReq.body = { score: 50 };
            const middleware = validateRange("score", 0, 100);

            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it("should reject value below minimum", () => {
            mockReq.body = { score: -5 };
            const middleware = validateRange("score", 0, 100);

            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                error: "score must be at least 0",
            });
        });

        it("should reject value above maximum", () => {
            mockReq.body = { score: 150 };
            const middleware = validateRange("score", 0, 100);

            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                error: "score must be at most 100",
            });
        });

        it("should reject non-numeric values", () => {
            mockReq.body = { score: "abc" };
            const middleware = validateRange("score", 0, 100);

            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                error: "score must be a number",
            });
        });
    });

    describe("validatePagination", () => {
        it("should pass valid pagination", () => {
            mockReq.query = { page: "1", limit: "10" };

            validatePagination(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it("should reject page less than 1", () => {
            mockReq.query = { page: "0" };

            validatePagination(mockReq as Request, mockRes as Response, mockNext);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                error: "Page must be a positive integer",
            });
        });

        it("should reject limit exceeding max", () => {
            mockReq.query = { limit: "200" };

            validatePagination(mockReq as Request, mockRes as Response, mockNext);

            expect(statusMock).toHaveBeenCalledWith(400);
        });
    });

    describe("sanitizeInput", () => {
        it("should call next and preserve normal input", () => {
            mockReq.body = { name: "Test", value: 123 };

            sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockReq.body.name).toBe("Test");
            expect(mockReq.body.value).toBe(123);
        });

        it("should handle nested objects", () => {
            mockReq.body = {
                data: {
                    valid: "value",
                    nested: { deep: true }
                }
            };

            sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockReq.body.data.valid).toBe("value");
        });

        it("should handle arrays", () => {
            mockReq.body = {
                items: [
                    { name: "ok" },
                    { name: "also ok" }
                ]
            };

            sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockReq.body.items[0].name).toBe("ok");
        });

        it("should handle null body gracefully", () => {
            mockReq.body = null;

            sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });
    });
});
