import { Response, NextFunction } from 'express';
import { RequestWithAuth } from '../controllers/base';
interface KeycloakToken {
    sub: string;
    email: string;
    preferred_username: string;
    given_name?: string;
    family_name?: string;
    name?: string;
    realm_access?: {
        roles: string[];
    };
    resource_access?: {
        [key: string]: {
            roles: string[];
        };
    };
}
export declare const verifyKeycloakToken: (token: string) => Promise<KeycloakToken>;
export declare const hasRole: (token: KeycloakToken, role: string) => boolean;
export declare const hasAdminRole: (token: KeycloakToken) => boolean;
export declare const hasSuperAdminRole: (token: KeycloakToken) => boolean;
export declare const isAuthorizedUser: (token: KeycloakToken) => boolean;
export declare const requireAuth: (req: RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
export declare const optionalAuth: (req: RequestWithAuth, _res: Response, next: NextFunction) => Promise<void>;
export declare const requireAdmin: (req: RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
export declare const requireSuperAdmin: (req: RequestWithAuth, res: Response, next: NextFunction) => Promise<void>;
export {};
//# sourceMappingURL=auth.d.ts.map