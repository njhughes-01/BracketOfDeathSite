"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_router_dom_1 = require("react-router-dom");
const AuthContext_1 = require("../../contexts/AuthContext");
const usePermissions_1 = require("../../hooks/usePermissions");
const LoadingSpinner_1 = __importDefault(require("../ui/LoadingSpinner"));
const ProtectedRoute = ({ children, requireAdmin = false, requirePermission, requireAnyPermission, fallbackPath = '/' }) => {
    const { isAuthenticated, loading, login, user } = (0, AuthContext_1.useAuth)();
    const { isAdmin, hasPermission, hasAnyPermission: checkAnyPermission } = (0, usePermissions_1.usePermissions)();
    const location = (0, react_router_dom_1.useLocation)();
    console.log('ProtectedRoute check:', {
        isAuthenticated,
        isAdmin,
        loading,
        requireAdmin,
        requirePermission,
        requireAnyPermission,
        user: user ? { username: user.username, roles: user.roles } : null,
        path: location.pathname
    });
    if (loading) {
        return (<div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner_1.default />
      </div>);
    }
    if (!isAuthenticated) {
        const from = location.pathname + location.search;
        return <react_router_dom_1.Navigate to="/login" state={{ from }} replace/>;
    }
    let hasRequiredPermissions = true;
    if (requireAdmin && !isAdmin) {
        hasRequiredPermissions = false;
    }
    if (requirePermission && !hasPermission(requirePermission)) {
        hasRequiredPermissions = false;
    }
    if (requireAnyPermission && !checkAnyPermission(requireAnyPermission)) {
        hasRequiredPermissions = false;
    }
    if (!hasRequiredPermissions) {
        console.log('Access denied - insufficient permissions');
        return <react_router_dom_1.Navigate to={fallbackPath} replace/>;
    }
    return <>{children}</>;
};
exports.default = ProtectedRoute;
//# sourceMappingURL=ProtectedRoute.js.map