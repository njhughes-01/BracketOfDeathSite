import { Request, Response, NextFunction } from "express";
import { notFoundHandler } from "../../../../src/backend/middleware/notFoundHandler";

describe("notFoundHandler middleware", () => {
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
            originalUrl: "/api/nonexistent",
            method: "GET",
        };
        mockRes = {
            status: statusMock,
            json: jsonMock,
        };
        mockNext = jest.fn();
    });

    it("should return 404 status", () => {
        notFoundHandler(mockReq as Request, mockRes as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(404);
    });

    it("should return proper error response", () => {
        notFoundHandler(mockReq as Request, mockRes as Response, mockNext);

        expect(jsonMock).toHaveBeenCalledWith({
            success: false,
            error: expect.stringContaining("Not Found"),
        });
    });

    it("should include original URL in error", () => {
        mockReq.originalUrl = "/api/v1/missing-resource";

        notFoundHandler(mockReq as Request, mockRes as Response, mockNext);

        expect(jsonMock).toHaveBeenCalledWith(
            expect.objectContaining({
                error: expect.stringContaining("/api/v1/missing-resource"),
            })
        );
    });

    it("should handle different HTTP methods", () => {
        mockReq.method = "POST";
        mockReq.originalUrl = "/api/submit";

        notFoundHandler(mockReq as Request, mockRes as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(404);
    });
});
