"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireSuperAdmin = exports.requireAdmin = exports.optionalAuth = exports.requireAuth = exports.isAuthorizedUser = exports.hasSuperAdminRole = exports.hasAdminRole = exports.hasRole = exports.verifyKeycloakToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwks_rsa_1 = __importDefault(require("jwks-rsa"));
const client = (0, jwks_rsa_1.default)({
    jwksUri: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/certs`,
    requestHeaders: {},
    timeout: 30000,
});
const getKey = (header, callback) => {
    client.getSigningKey(header.kid, (err, key) => {
        if (err) {
            callback(err);
            return;
        }
        const signingKey = key?.getPublicKey();
        callback(null, signingKey);
    });
};
const verifyKeycloakToken = async (token) => {
    return new Promise((resolve, reject) => {
        const decoded = jsonwebtoken_1.default.decode(token, { complete: true });
        console.log('DEBUG: Token decoded:', JSON.stringify(decoded?.payload, null, 2));
        jsonwebtoken_1.default.verify(token, getKey, {
            issuer: [
                `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}`,
                `http://localhost:8080/realms/${process.env.KEYCLOAK_REALM}`,
                `http://localhost:8080/auth/realms/${process.env.KEYCLOAK_REALM}`,
            ],
            algorithms: ['RS256'],
            clockTolerance: 120,
        }, (err, decoded) => {
            if (err) {
                console.error('DEBUG: JWT Verify Error:', err);
                reject(err);
                return;
            }
            const decodedToken = decoded;
            const expectedClient = process.env.KEYCLOAK_CLIENT_ID || 'bod-app';
            if (decodedToken.azp && decodedToken.azp !== expectedClient) {
                reject(new Error(`Invalid client. Expected: ${expectedClient}, got: ${decodedToken.azp}`));
                return;
            }
            resolve(decodedToken);
        });
    });
};
exports.verifyKeycloakToken = verifyKeycloakToken;
const hasRole = (token, role) => {
    const realmRoles = token.realm_access?.roles || [];
    if (realmRoles.includes(role)) {
        return true;
    }
    const clientId = process.env.KEYCLOAK_CLIENT_ID || 'bod-app';
    const clientRoles = token.resource_access?.[clientId]?.roles || [];
    return clientRoles.includes(role);
};
exports.hasRole = hasRole;
const hasAdminRole = (token) => {
    return (0, exports.hasRole)(token, 'admin');
};
exports.hasAdminRole = hasAdminRole;
const hasSuperAdminRole = (token) => {
    return (0, exports.hasRole)(token, 'superadmin');
};
exports.hasSuperAdminRole = hasSuperAdminRole;
const isAuthorizedUser = (token) => {
    return (0, exports.hasRole)(token, 'user') || (0, exports.hasRole)(token, 'admin') || (0, exports.hasRole)(token, 'superadmin');
};
exports.isAuthorizedUser = isAuthorizedUser;
const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            const response = {
                success: false,
                error: 'Authorization token required',
            };
            res.status(401).json(response);
            return;
        }
        const token = authHeader.substring(7);
        if (!token) {
            const response = {
                success: false,
                error: 'Authorization token required',
            };
            res.status(401).json(response);
            return;
        }
        if (process.env.NODE_ENV !== 'production') {
        }
        const tokenData = await (0, exports.verifyKeycloakToken)(token);
        const authorized = (0, exports.isAuthorizedUser)(tokenData);
        if (!authorized) {
            const response = {
                success: false,
                error: 'Access denied. User not authorized.',
            };
            res.status(403).json(response);
            return;
        }
        req.user = {
            id: tokenData.sub,
            email: tokenData.email,
            username: tokenData.preferred_username,
            name: tokenData.name || `${tokenData.given_name || ''} ${tokenData.family_name || ''}`.trim(),
            isAuthorized: true,
            isAdmin: (0, exports.hasAdminRole)(tokenData),
            roles: [
                ...(tokenData.realm_access?.roles || []),
                ...(tokenData.resource_access?.[process.env.KEYCLOAK_CLIENT_ID || 'bod-app']?.roles || [])
            ],
        };
        next();
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        if (error.message)
            console.error('Error message:', error.message);
        const response = {
            success: false,
            error: 'Invalid or expired token',
            ...(process.env.NODE_ENV !== 'production' ? { debug: error.message } : {})
        };
        res.status(401).json(response);
    }
};
exports.requireAuth = requireAuth;
const optionalAuth = async (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            if (token) {
                try {
                    const tokenData = await (0, exports.verifyKeycloakToken)(token);
                    const authorized = (0, exports.isAuthorizedUser)(tokenData);
                    req.user = {
                        id: tokenData.sub,
                        email: tokenData.email,
                        username: tokenData.preferred_username,
                        name: tokenData.name || `${tokenData.given_name || ''} ${tokenData.family_name || ''}`.trim(),
                        isAuthorized: authorized,
                        isAdmin: (0, exports.hasAdminRole)(tokenData),
                        roles: [
                            ...(tokenData.realm_access?.roles || []),
                            ...(tokenData.resource_access?.[process.env.KEYCLOAK_CLIENT_ID || 'bod-app']?.roles || [])
                        ],
                    };
                }
                catch (error) {
                    req.user = undefined;
                }
            }
        }
        next();
    }
    catch (error) {
        next();
    }
};
exports.optionalAuth = optionalAuth;
const requireAdmin = async (req, res, next) => {
    await (0, exports.requireAuth)(req, res, () => {
        if (req.user && (req.user.isAdmin || req.user.roles.includes('superadmin'))) {
            next();
        }
        else {
            const response = {
                success: false,
                error: 'Admin access required',
            };
            res.status(403).json(response);
        }
    });
};
exports.requireAdmin = requireAdmin;
const requireSuperAdmin = async (req, res, next) => {
    await (0, exports.requireAuth)(req, res, () => {
        if (req.user && req.user.roles.includes('superadmin')) {
            next();
        }
        else {
            const response = {
                success: false,
                error: 'Super Admin access required',
            };
            res.status(403).json(response);
        }
    });
};
exports.requireSuperAdmin = requireSuperAdmin;
//# sourceMappingURL=auth.js.map