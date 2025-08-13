import React from 'react';
import type { PermissionValue } from '../../types/user';
interface ProtectedRouteProps {
    children: React.ReactNode;
    requireAdmin?: boolean;
    requirePermission?: PermissionValue;
    requireAnyPermission?: PermissionValue[];
    fallbackPath?: string;
}
declare const ProtectedRoute: React.FC<ProtectedRouteProps>;
export default ProtectedRoute;
//# sourceMappingURL=ProtectedRoute.d.ts.map