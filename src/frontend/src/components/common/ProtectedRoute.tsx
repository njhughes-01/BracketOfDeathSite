import logger from "../../utils/logger";
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { usePermissions } from "../../hooks/usePermissions";
import LoadingSpinner from "../ui/LoadingSpinner";
import type { PermissionValue } from "../../types/user";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requirePermission?: PermissionValue;
  requireAnyPermission?: PermissionValue[];
  fallbackPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
  requirePermission,
  requireAnyPermission,
  fallbackPath = "/",
}) => {
  const { isAuthenticated, loading, login, user } = useAuth();
  const {
    isAdmin,
    hasPermission,
    hasAnyPermission: checkAnyPermission,
  } = usePermissions();
  const location = useLocation();

  // Debug logging
  logger.debug("ProtectedRoute check:", {
    isAuthenticated,
    isAdmin,
    loading,
    requireAdmin,
    requirePermission,
    requireAnyPermission,
    user: user ? { username: user.username, roles: user.roles } : null,
    path: location.pathname,
  });

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  // If not authenticated, redirect to login page
  if (!isAuthenticated) {
    const from = location.pathname + location.search;
    return <Navigate to="/login" state={{ from }} replace />;
  }

  // Check permissions
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
    logger.debug("Access denied - insufficient permissions");
    return <Navigate to={fallbackPath} replace />;
  }

  // User is authenticated and has required permissions
  return <>{children}</>;
};

export default ProtectedRoute;
