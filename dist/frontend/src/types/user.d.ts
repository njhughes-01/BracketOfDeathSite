export interface Permission {
    id: string;
    name: string;
    description: string;
    category: 'tournament' | 'player' | 'user' | 'system';
}
export interface Role {
    id: string;
    name: string;
    description: string;
    permissions: Permission[];
    isSystemRole: boolean;
}
export interface User {
    id: string;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    enabled: boolean;
    emailVerified?: boolean;
    roles: string[];
    isAdmin: boolean;
    createdAt?: Date;
    lastLogin?: Date;
}
export interface UserProfile {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    fullName: string;
    roles: Role[];
    permissions: Permission[];
    isActive: boolean;
    isEmailVerified: boolean;
    createdAt: string;
    lastLogin?: string;
}
export interface CreateUserInput {
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    password?: string;
    temporary?: boolean;
    roles?: string[];
}
export interface UpdateUserInput {
    firstName?: string;
    lastName?: string;
    email?: string;
    enabled?: boolean;
    roles?: string[];
}
export interface CreateUserRequest {
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    roleIds: string[];
    isActive: boolean;
}
export interface UpdateUserRequest {
    username?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    roleIds?: string[];
    isActive?: boolean;
}
export interface ResetPasswordInput {
    newPassword: string;
    temporary?: boolean;
}
export interface UserRole {
    id: string;
    name: string;
    description?: string;
}
export interface UserFilters {
    search?: string;
    enabled?: boolean;
    role?: string;
}
export interface UserManagementPermissions {
    canCreateUsers: boolean;
    canEditUsers: boolean;
    canDeleteUsers: boolean;
    canManageRoles: boolean;
    canViewUsers: boolean;
}
export declare const PERMISSIONS: {
    readonly TOURNAMENT_CREATE: "tournament:create";
    readonly TOURNAMENT_EDIT: "tournament:edit";
    readonly TOURNAMENT_DELETE: "tournament:delete";
    readonly TOURNAMENT_VIEW: "tournament:view";
    readonly TOURNAMENT_MANAGE_BRACKETS: "tournament:manage-brackets";
    readonly TOURNAMENT_FINALIZE: "tournament:finalize";
    readonly PLAYER_CREATE: "player:create";
    readonly PLAYER_EDIT: "player:edit";
    readonly PLAYER_DELETE: "player:delete";
    readonly PLAYER_VIEW: "player:view";
    readonly PLAYER_MANAGE_STATS: "player:manage-stats";
    readonly USER_CREATE: "user:create";
    readonly USER_EDIT: "user:edit";
    readonly USER_DELETE: "user:delete";
    readonly USER_VIEW: "user:view";
    readonly USER_MANAGE_ROLES: "user:manage-roles";
    readonly SYSTEM_ADMIN: "system:admin";
    readonly SYSTEM_VIEW_LOGS: "system:view-logs";
    readonly SYSTEM_MANAGE_SETTINGS: "system:manage-settings";
};
export type PermissionValue = typeof PERMISSIONS[keyof typeof PERMISSIONS];
//# sourceMappingURL=user.d.ts.map