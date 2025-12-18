import { type PermissionValue } from '../types/user';
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
export declare const usePermissions: () => UsePermissionsReturn;
//# sourceMappingURL=usePermissions.d.ts.map