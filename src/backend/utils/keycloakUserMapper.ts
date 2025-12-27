/**
 * Keycloak User Mapper Utility
 *
 * Extracts the repeated user transformation logic from UserController.ts.
 * This utility converts Keycloak user representations to the application's User type.
 */

import { User } from "../types/user";

/**
 * Keycloak user representation interface
 * Matches the structure returned by Keycloak Admin API
 */
export interface KeycloakUserRepresentation {
    id?: string;
    username?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    enabled?: boolean;
    emailVerified?: boolean;
    realmRoles?: string[];
    attributes?: {
        playerId?: string[];
        gender?: string[];
        [key: string]: string[] | undefined;
    };
}

/**
 * Maps a single Keycloak user representation to the application's User type
 */
export function mapKeycloakUser(kcUser: KeycloakUserRepresentation): User {
    const roles = kcUser.realmRoles || [];

    return {
        id: kcUser.id!,
        username: kcUser.username,
        email: kcUser.email,
        firstName: kcUser.firstName,
        lastName: kcUser.lastName,
        fullName:
            [kcUser.firstName, kcUser.lastName].filter(Boolean).join(" ") ||
            kcUser.username,
        enabled: kcUser.enabled ?? true,
        emailVerified: kcUser.emailVerified,
        roles,
        isAdmin: roles.includes("admin") || roles.includes("superadmin"),
        isSuperAdmin: roles.includes("superadmin"),
        playerId: kcUser.attributes?.playerId?.[0],
        gender: kcUser.attributes?.gender?.[0],
    };
}

/**
 * Maps an array of Keycloak user representations to the application's User type
 */
export function mapKeycloakUsers(
    kcUsers: KeycloakUserRepresentation[]
): User[] {
    return kcUsers.map(mapKeycloakUser);
}

/**
 * Checks if a user has admin privileges based on roles
 */
export function hasAdminRole(roles: string[]): boolean {
    return roles.includes("admin") || roles.includes("superadmin");
}

/**
 * Checks if a user has superadmin privileges based on roles
 */
export function hasSuperAdminRole(roles: string[]): boolean {
    return roles.includes("superadmin");
}

/**
 * Generates a full name from first and last name with fallback to username
 */
export function getFullName(
    firstName?: string,
    lastName?: string,
    username?: string
): string {
    const name = [firstName, lastName].filter(Boolean).join(" ");
    return name || username || "";
}
