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
  isSystemRole: boolean; // System roles cannot be deleted
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
  playerId?: string;
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
  playerId?: string;
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  enabled?: boolean;
  roles?: string[];
  playerId?: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  roleIds: string[];
  isActive: boolean;
  playerId?: string;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  roleIds?: string[];
  isActive?: boolean;
  playerId?: string;
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

// Permission constants
export const PERMISSIONS = {
  // Tournament permissions
  TOURNAMENT_CREATE: 'tournament:create',
  TOURNAMENT_EDIT: 'tournament:edit',
  TOURNAMENT_DELETE: 'tournament:delete',
  TOURNAMENT_VIEW: 'tournament:view',
  TOURNAMENT_MANAGE_BRACKETS: 'tournament:manage-brackets',
  TOURNAMENT_FINALIZE: 'tournament:finalize',

  // Player permissions
  PLAYER_CREATE: 'player:create',
  PLAYER_EDIT: 'player:edit',
  PLAYER_DELETE: 'player:delete',
  PLAYER_VIEW: 'player:view',
  PLAYER_MANAGE_STATS: 'player:manage-stats',

  // User management permissions
  USER_CREATE: 'user:create',
  USER_EDIT: 'user:edit',
  USER_DELETE: 'user:delete',
  USER_VIEW: 'user:view',
  USER_MANAGE_ROLES: 'user:manage-roles',

  // System permissions
  SYSTEM_ADMIN: 'system:admin',
  SYSTEM_VIEW_LOGS: 'system:view-logs',
  SYSTEM_MANAGE_SETTINGS: 'system:manage-settings',
} as const;

export type PermissionValue = typeof PERMISSIONS[keyof typeof PERMISSIONS];