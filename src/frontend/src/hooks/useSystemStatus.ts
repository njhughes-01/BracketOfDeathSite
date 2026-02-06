import logger from "../utils/logger";
/**
 * useSystemStatus Hook
 *
 * Centralizes the system initialization status check logic that was duplicated
 * across Setup.tsx, Login.tsx, Onboarding.tsx, and Home.tsx.
 *
 * This hook provides:
 * - Loading state while checking system status
 * - Initialized status boolean
 * - Error handling for failed status checks
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../services/api";

export interface SystemStatusResult {
    /** Whether the system status check is in progress */
    isLoading: boolean;
    /** Whether the system has been initialized (superadmin claimed) */
    isInitialized: boolean | null;
    /** Any error that occurred during status check */
    error: Error | null;
    /** Manually trigger a status refresh */
    refresh: () => Promise<void>;
}

export interface UseSystemStatusOptions {
    /** Whether to automatically redirect based on status */
    autoRedirect?: boolean;
    /** Where to redirect if initialized (default: '/login') */
    redirectIfInitialized?: string;
    /** Where to redirect if not initialized (default: '/setup') */
    redirectIfNotInitialized?: string;
    /** Skip the initial status check */
    skipInitialCheck?: boolean;
}

/**
 * Hook to check system initialization status
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { isLoading, isInitialized, error } = useSystemStatus();
 *
 * // With auto-redirect
 * const { isLoading, isInitialized } = useSystemStatus({
 *   autoRedirect: true,
 *   redirectIfInitialized: '/dashboard'
 * });
 *
 * // Manual refresh
 * const { refresh } = useSystemStatus();
 * await refresh();
 * ```
 */
export function useSystemStatus(
    options: UseSystemStatusOptions = {}
): SystemStatusResult {
    const {
        autoRedirect = false,
        redirectIfInitialized = "/login",
        redirectIfNotInitialized = "/setup",
        skipInitialCheck = false,
    } = options;

    const [isLoading, setIsLoading] = useState(!skipInitialCheck);
    const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const navigate = useNavigate();

    const checkStatus = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const status = await apiClient.getSystemStatus();
            const initialized = status.data?.initialized ?? false;
            setIsInitialized(initialized);

            if (autoRedirect) {
                if (initialized) {
                    navigate(redirectIfInitialized, { replace: true });
                } else {
                    navigate(redirectIfNotInitialized, { replace: true });
                }
            }
        } catch (err) {
            logger.error("Failed to check system status:", err);
            setError(
                err instanceof Error ? err : new Error("Failed to check system status")
            );
            // Default to initialized on error to prevent redirect loops
            setIsInitialized(true);
        } finally {
            setIsLoading(false);
        }
    }, [autoRedirect, navigate, redirectIfInitialized, redirectIfNotInitialized]);

    useEffect(() => {
        if (!skipInitialCheck) {
            checkStatus();
        }
    }, [checkStatus, skipInitialCheck]);

    return {
        isLoading,
        isInitialized,
        error,
        refresh: checkStatus,
    };
}

/**
 * Simplified hook for checking if system initialization is required
 * Useful for conditional rendering of setup UI
 */
export function useRequiresSetup(): boolean | null {
    const { isInitialized, isLoading } = useSystemStatus({
        skipInitialCheck: false,
    });

    if (isLoading) return null;
    return !isInitialized;
}

export default useSystemStatus;
