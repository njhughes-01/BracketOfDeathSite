"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireSuperAdmin = exports.requireAdmin = exports.optionalAuth = exports.requireAuth = exports.isAuthorizedUser = exports.hasSuperAdminRole = exports.hasAdminRole = exports.hasRole = exports.verifyKeycloakToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwks_rsa_1 = __importDefault(require("jwks-rsa"));
// JWKS client for validating Keycloak tokens
const client = (0, jwks_rsa_1.default)({
    jwksUri: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/certs`,
    requestHeaders: {},
    timeout: 30000,
});
// Get signing key for JWT verification
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
// Verify Keycloak JWT token
const verifyKeycloakToken = async (token) => {
    return new Promise((resolve, reject) => {
        // First, let's decode the token to see what audience it has
        const decoded = jsonwebtoken_1.default.decode(token, { complete: true });
        // Force log for debugging
        console.log("DEBUG: Token decoded:", JSON.stringify(decoded?.payload, null, 2));
        jsonwebtoken_1.default.verify(token, getKey, {
            // Don't validate audience since Keycloak uses 'azp' (authorized party) instead of 'aud'
            issuer: [
                process.env.KEYCLOAK_ISSUER,
                `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}`,
                `http://localhost:8080/realms/${process.env.KEYCLOAK_REALM}`,
                `http://localhost:8080/auth/realms/${process.env.KEYCLOAK_REALM}`,
                // Allow issuers from frontend proxy (vite) which happens in some local configs
                `http://127.0.0.1:5173/auth/realms/bracketofdeathsite`,
                `http://localhost:5173/auth/realms/bracketofdeathsite`,
                `http://localhost:5175/auth/realms/bracketofdeathsite`,
                `http://localhost:8080/realms/bracketofdeathsite`,
            ],
            algorithms: ["RS256"],
            clockTolerance: 120, // Tolerate 2 minutes of clock skew
        }, (err, decoded) => {
            if (err) {
                console.error("DEBUG: JWT Verify Error:", err);
                reject(err);
                return;
            }
            // Manually validate the authorized party (azp) since Keycloak uses this instead of audience
            const decodedToken = decoded;
            const expectedClient = process.env.KEYCLOAK_CLIENT_ID || "bod-app";
            if (decodedToken.azp && decodedToken.azp !== expectedClient) {
                reject(new Error(`Invalid client. Expected: ${expectedClient}, got: ${decodedToken.azp}`));
                return;
            }
            resolve(decodedToken);
        });
    });
};
exports.verifyKeycloakToken = verifyKeycloakToken;
// Helper to check for a specific role
const hasRole = (token, role) => {
    // Check realm roles
    const realmRoles = token.realm_access?.roles || [];
    if (realmRoles.includes(role)) {
        return true;
    }
    // Check client roles
    const clientId = process.env.KEYCLOAK_CLIENT_ID || "bod-app";
    const clientRoles = token.resource_access?.[clientId]?.roles || [];
    return clientRoles.includes(role);
};
exports.hasRole = hasRole;
// Check if user has admin role
const hasAdminRole = (token) => {
    return (0, exports.hasRole)(token, "admin");
};
exports.hasAdminRole = hasAdminRole;
// Check if user has superadmin role
const hasSuperAdminRole = (token) => {
    return (0, exports.hasRole)(token, "superadmin");
};
exports.hasSuperAdminRole = hasSuperAdminRole;
// Check if user is authorized (has user or admin role)
// Check if user is authorized (has any valid token)
const isAuthorizedUser = (token) => {
    // We allow any authenticated user to access the API
    // Specific routes (like admin) are protected by requireAdmin
    return true;
};
exports.isAuthorizedUser = isAuthorizedUser;
// Authentication middleware
const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            const response = {
                success: false,
                error: "Authorization token required",
            };
            res.status(401).json(response);
            return;
        }
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        if (!token) {
            const response = {
                success: false,
                error: "Authorization token required",
            };
            res.status(401).json(response);
            return;
        }
        // Verify the Keycloak token (quiet in production)
        if (process.env.NODE_ENV !== "production") {
            // console.log('Attempting to verify token:', token.substring(0, 20) + '...');
        }
        const tokenData = await (0, exports.verifyKeycloakToken)(token);
        // Check if user is authorized
        const authorized = (0, exports.isAuthorizedUser)(tokenData);
        if (!authorized) {
            const response = {
                success: false,
                error: "Access denied. User not authorized.",
            };
            res.status(403).json(response);
            return;
        }
        // Add user info to request
        req.user = {
            id: tokenData.sub,
            email: tokenData.email,
            username: tokenData.preferred_username,
            name: tokenData.name ||
                `${tokenData.given_name || ""} ${tokenData.family_name || ""}`.trim(),
            isAuthorized: true,
            isAdmin: (0, exports.hasAdminRole)(tokenData),
            roles: [
                ...(tokenData.realm_access?.roles || []),
                ...(tokenData.resource_access?.[process.env.KEYCLOAK_CLIENT_ID || "bod-app"]?.roles || []),
            ],
        };
        next();
    }
    catch (error) {
        console.error("Auth middleware error:", error);
        if (error.message)
            console.error("Error message:", error.message);
        const response = {
            success: false,
            error: "Invalid or expired token",
            // Include more details in non-production for debugging
            ...(process.env.NODE_ENV !== "production"
                ? { debug: error.message }
                : {}),
        };
        res.status(401).json(response);
    }
};
exports.requireAuth = requireAuth;
// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.substring(7);
            if (token) {
                try {
                    const tokenData = await (0, exports.verifyKeycloakToken)(token);
                    const authorized = (0, exports.isAuthorizedUser)(tokenData);
                    req.user = {
                        id: tokenData.sub,
                        email: tokenData.email,
                        username: tokenData.preferred_username,
                        name: tokenData.name ||
                            `${tokenData.given_name || ""} ${tokenData.family_name || ""}`.trim(),
                        isAuthorized: authorized,
                        isAdmin: (0, exports.hasAdminRole)(tokenData),
                        roles: [
                            ...(tokenData.realm_access?.roles || []),
                            ...(tokenData.resource_access?.[process.env.KEYCLOAK_CLIENT_ID || "bod-app"]?.roles || []),
                        ],
                    };
                }
                catch (error) {
                    // Invalid token, but don't fail the request
                    req.user = undefined;
                }
            }
        }
        next();
    }
    catch (error) {
        // Don't fail the request for optional auth
        next();
    }
};
exports.optionalAuth = optionalAuth;
// Admin-only middleware
const requireAdmin = async (req, res, next) => {
    // First check authentication
    await (0, exports.requireAuth)(req, res, () => {
        // Check if user has admin role or superadmin role (superadmin is implicitly admin)
        if (req.user &&
            (req.user.isAdmin || req.user.roles.includes("superadmin"))) {
            next();
        }
        else {
            const response = {
                success: false,
                error: "Admin access required",
            };
            res.status(403).json(response);
        }
    });
};
exports.requireAdmin = requireAdmin;
// Super Admin middleware (for system settings)
const requireSuperAdmin = async (req, res, next) => {
    // First check authentication
    await (0, exports.requireAuth)(req, res, () => {
        // Check if user has superadmin role
        if (req.user && req.user.roles.includes("superadmin")) {
            next();
        }
        else {
            const response = {
                success: false,
                error: "Super Admin access required",
            };
            res.status(403).json(response);
        }
    });
};
exports.requireSuperAdmin = requireSuperAdmin;
//# sourceMappingURL=auth.js.map