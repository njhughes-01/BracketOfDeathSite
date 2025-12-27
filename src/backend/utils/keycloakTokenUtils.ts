/**
 * Keycloak Token Utilities
 *
 * Centralized utilities for Keycloak token operations.
 * Extracted from repeated patterns in UserController.ts, ProfileController.ts, and Login.tsx.
 */

import axios, { AxiosError } from "axios";

/**
 * Keycloak token response interface
 */
export interface KeycloakTokenResponse {
    access_token: string;
    expires_in: number;
    refresh_expires_in: number;
    refresh_token: string;
    token_type: string;
    "not-before-policy"?: number;
    session_state?: string;
    scope?: string;
}

/**
 * Token request configuration
 */
export interface TokenRequestConfig {
    keycloakUrl: string;
    realm: string;
    clientId: string;
    clientSecret?: string;
}

/**
 * Get the Keycloak token endpoint URL
 */
export function getTokenEndpoint(config: TokenRequestConfig): string {
    return `${config.keycloakUrl}/realms/${config.realm}/protocol/openid-connect/token`;
}

/**
 * Request an access token using client credentials grant
 */
export async function getClientCredentialsToken(
    config: TokenRequestConfig
): Promise<KeycloakTokenResponse> {
    const tokenEndpoint = getTokenEndpoint(config);

    const params = new URLSearchParams({
        grant_type: "client_credentials",
        client_id: config.clientId,
        client_secret: config.clientSecret || "",
    });

    const response = await axios.post<KeycloakTokenResponse>(
        tokenEndpoint,
        params.toString(),
        {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        }
    );

    return response.data;
}

/**
 * Request an access token using resource owner password credentials grant
 */
export async function getPasswordToken(
    config: TokenRequestConfig,
    username: string,
    password: string
): Promise<KeycloakTokenResponse> {
    const tokenEndpoint = getTokenEndpoint(config);

    const params = new URLSearchParams({
        grant_type: "password",
        client_id: config.clientId,
        username,
        password,
    });

    if (config.clientSecret) {
        params.append("client_secret", config.clientSecret);
    }

    const response = await axios.post<KeycloakTokenResponse>(
        tokenEndpoint,
        params.toString(),
        {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        }
    );

    return response.data;
}

/**
 * Refresh an access token
 */
export async function refreshAccessToken(
    config: TokenRequestConfig,
    refreshToken: string
): Promise<KeycloakTokenResponse> {
    const tokenEndpoint = getTokenEndpoint(config);

    const params = new URLSearchParams({
        grant_type: "refresh_token",
        client_id: config.clientId,
        refresh_token: refreshToken,
    });

    if (config.clientSecret) {
        params.append("client_secret", config.clientSecret);
    }

    const response = await axios.post<KeycloakTokenResponse>(
        tokenEndpoint,
        params.toString(),
        {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        }
    );

    return response.data;
}

/**
 * Check if a token is expired or about to expire
 * @param expiresIn - Seconds until token expires
 * @param leewaySeconds - Buffer time before expiration (default: 60)
 */
export function isTokenExpiring(
    expiresIn: number,
    leewaySeconds: number = 60
): boolean {
    return expiresIn <= leewaySeconds;
}

/**
 * Extract error message from Keycloak error response
 */
export function extractKeycloakError(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{
            error?: string;
            error_description?: string;
        }>;

        if (axiosError.response?.data) {
            const data = axiosError.response.data;
            return data.error_description || data.error || "Authentication failed";
        }

        if (axiosError.response?.status === 401) {
            return "Invalid credentials";
        }

        if (axiosError.response?.status === 403) {
            return "Access denied";
        }
    }

    return error instanceof Error ? error.message : "Unknown error";
}

/**
 * Get default Keycloak configuration from environment
 */
export function getDefaultKeycloakConfig(): TokenRequestConfig {
    return {
        keycloakUrl: process.env.KEYCLOAK_URL || "http://localhost:8080",
        realm: process.env.KEYCLOAK_REALM || "bracketofdeathsite",
        clientId: process.env.KEYCLOAK_CLIENT_ID || "bod-app",
        clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
    };
}
