import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import type { PermissionValue } from '../../types/user';

interface RequirePermissionProps {
  children: React.ReactNode;
  permission?: PermissionValue;
  anyPermission?: PermissionValue[];
  allPermissions?: PermissionValue[];
  fallback?: React.ReactNode;
}

/**
 * A wrapper component that only renders its children if the user has the required permissions.
 * Supports checking for a single permission, any of a list, or all of a list.
 */
const RequirePermission: React.FC<RequirePermissionProps> = ({
  children,
  permission,
  anyPermission,
  allPermissions,
  fallback = null
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();

  const authorized =
    (!permission || hasPermission(permission)) &&
    (!anyPermission || hasAnyPermission(anyPermission)) &&
    (!allPermissions || hasAllPermissions(allPermissions));

  return authorized ? <>{children}</> : <>{fallback}</>;
};

export default RequirePermission;
