/**
 * BaseController
 *
 * Centralized controller utilities for error handling and response formatting.
 * Extracted from repeated patterns in UserController, SystemController, ProfileController.
 */

import { Response } from "express";
import { ApiResponse } from "../types/common";

/**
 * Abstract base controller with shared functionality
 */
export abstract class BaseController {
    /**
     * Handle errors consistently across all controllers
     * @param res - Express response object
     * @param error - The caught error
     * @param message - User-friendly error message
     * @param statusCode - HTTP status code (default: 500)
     */
    protected handleError(
        res: Response,
        error: unknown,
        message: string,
        statusCode: number = 500
    ): void {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        console.error(`${message}:`, error);

        const response: ApiResponse = {
            success: false,
            error: errorMessage || message,
        };

        res.status(statusCode).json(response);
    }

    /**
     * Send a success response
     * @param res - Express response object
     * @param data - Response data
     * @param message - Optional success message
     * @param statusCode - HTTP status code (default: 200)
     */
    protected sendSuccess<T>(
        res: Response,
        data: T,
        message?: string,
        statusCode: number = 200
    ): void {
        const response: ApiResponse<T> = {
            success: true,
            data,
            message,
        };

        res.status(statusCode).json(response);
    }

    /**
     * Send an error response
     * @param res - Express response object
     * @param error - Error message
     * @param statusCode - HTTP status code (default: 400)
     */
    protected sendError(
        res: Response,
        error: string,
        statusCode: number = 400
    ): void {
        const response: ApiResponse = {
            success: false,
            error,
        };

        res.status(statusCode).json(response);
    }

    /**
     * Send a not found response
     * @param res - Express response object
     * @param resource - Name of the resource that wasn't found
     */
    protected sendNotFound(res: Response, resource: string = "Resource"): void {
        this.sendError(res, `${resource} not found`, 404);
    }

    /**
     * Send an unauthorized response
     * @param res - Express response object
     * @param message - Optional custom message
     */
    protected sendUnauthorized(
        res: Response,
        message: string = "Unauthorized"
    ): void {
        this.sendError(res, message, 401);
    }

    /**
     * Send a forbidden response
     * @param res - Express response object
     * @param message - Optional custom message
     */
    protected sendForbidden(
        res: Response,
        message: string = "Access denied"
    ): void {
        this.sendError(res, message, 403);
    }

    /**
     * Send a validation error response
     * @param res - Express response object
     * @param errors - Array of validation error messages
     */
    protected sendValidationError(res: Response, errors: string[]): void {
        const response: ApiResponse = {
            success: false,
            error: "Validation failed",
            errors,
        };

        res.status(400).json(response);
    }
}

export default BaseController;
