"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usePermissions = void 0;
const react_1 = require("react");
const AuthContext_1 = require("../contexts/AuthContext");
const user_1 = require("../types/user");
const usePermissions = () => {
    const { user, isAdmin } = (0, AuthContext_1.useAuth)();
    const permissions = (0, react_1.useMemo)(() => {
        if (!user)
            return [];
        const userPermissions = [];
        if (user.roles.includes('admin')) {
            userPermissions.push(...Object.values(user_1.PERMISSIONS));
        }
        else if (user.roles.includes('user')) {
            userPermissions.push(user_1.PERMISSIONS.TOURNAMENT_VIEW, user_1.PERMISSIONS.PLAYER_VIEW, user_1.PERMISSIONS.PLAYER_CREATE, user_1.PERMISSIONS.USER_VIEW);
        }
        return userPermissions;
    }, [user]);
    const hasPermission = (permission) => {
        return permissions.includes(permission);
    };
    const hasAnyPermission = (permissionList) => {
        return permissionList.some(permission => hasPermission(permission));
    };
    const hasAllPermissions = (permissionList) => {
        return permissionList.every(permission => hasPermission(permission));
    };
    return {
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        isAdmin,
        canCreateTournaments: hasPermission(user_1.PERMISSIONS.TOURNAMENT_CREATE),
        canCreatePlayers: hasPermission(user_1.PERMISSIONS.PLAYER_CREATE),
        canManageUsers: hasPermission(user_1.PERMISSIONS.USER_MANAGE_ROLES),
        canViewAdmin: isAdmin || hasAnyPermission([
            user_1.PERMISSIONS.USER_VIEW,
            user_1.PERMISSIONS.TOURNAMENT_CREATE,
            user_1.PERMISSIONS.SYSTEM_ADMIN
        ]),
    };
};
exports.usePermissions = usePermissions;
//# sourceMappingURL=usePermissions.js.map