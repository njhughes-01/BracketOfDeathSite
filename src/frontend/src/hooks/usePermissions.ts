import { useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { PERMISSIONS, type PermissionValue } from "../types/user";

export interface UsePermissionsReturn {
  hasPermission: (permission: PermissionValue) => boolean;
  hasAnyPermission: (permissions: PermissionValue[]) => boolean;
  hasAllPermissions: (permissions: PermissionValue[]) => boolean;
  isAdmin: boolean;
  canCreateTournaments: boolean;
  canCreatePlayers: boolean;
  canManageUsers: boolean;
  canViewAdmin: boolean;
}

export const usePermissions = (): UsePermissionsReturn => {
  const { user, isAdmin } = useAuth();

  const permissions = useMemo(() => {
    if (!user) return [];

    const userPermissions: PermissionValue[] = [];

    if (user.roles.includes("superadmin") || user.roles.includes("admin")) {
      userPermissions.push(...Object.values(PERMISSIONS));
    } else if (user.roles.includes("user")) {
      userPermissions.push(
        PERMISSIONS.TOURNAMENT_VIEW,
        PERMISSIONS.PLAYER_VIEW,
        PERMISSIONS.PLAYER_CREATE,
        PERMISSIONS.USER_VIEW,
      );
    }

    return userPermissions;
  }, [user]);

  const hasPermission = (permission: PermissionValue): boolean => {
    return permissions.includes(permission);
  };

  const hasAnyPermission = (permissionList: PermissionValue[]): boolean => {
    return permissionList.some((permission) => hasPermission(permission));
  };

  const hasAllPermissions = (permissionList: PermissionValue[]): boolean => {
    return permissionList.every((permission) => hasPermission(permission));
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin,
    canCreateTournaments: hasPermission(PERMISSIONS.TOURNAMENT_CREATE),
    canCreatePlayers: hasPermission(PERMISSIONS.PLAYER_CREATE),
    canManageUsers: hasPermission(PERMISSIONS.USER_MANAGE_ROLES),
    canViewAdmin:
      isAdmin ||
      hasAnyPermission([
        PERMISSIONS.USER_VIEW,
        PERMISSIONS.TOURNAMENT_CREATE,
        PERMISSIONS.SYSTEM_ADMIN,
      ]),
  };
};
