import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import axios from "axios";
import { RequestWithAuth } from "../controllers/base";
import { ApiResponse } from "../types/common";

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

// JWKS client for validating Keycloak tokens
const client = jwksClient({
  jwksUri: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/certs`,
  requestHeaders: {},
  timeout: 30000,
});

// Get signing key for JWT verification
const getKey = (header: any, callback: any) => {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
};

// Build allowed issuers dynamically from environment variables
const buildAllowedIssuers = (): [string, ...string[]] => {
  const realm = process.env.KEYCLOAK_REALM || "bracketofdeathsite";
  const keycloakUrl = process.env.KEYCLOAK_URL || "http://keycloak:8080";
  const vitePort = process.env.VITE_PORT || "5173";

  const issuers = new Set<string>();

  // Primary issuer from env (external-facing via proxy)
  if (process.env.KEYCLOAK_ISSUER) {
    issuers.add(process.env.KEYCLOAK_ISSUER);
  }

  // APP_URL-based issuer (production domain like https://bod.lightmedia.club)
  if (process.env.APP_URL) {
    const appUrl = process.env.APP_URL.replace(/\/$/, ""); // Remove trailing slash
    issuers.add(`${appUrl}/auth/realms/${realm}`);
  }

  // CORS_ORIGIN-based issuers (handles multiple allowed origins)
  if (process.env.CORS_ORIGIN) {
    const origins = process.env.CORS_ORIGIN.split(",");
    for (const origin of origins) {
      const trimmedOrigin = origin.trim().replace(/\/$/, "");
      if (trimmedOrigin) {
        issuers.add(`${trimmedOrigin}/auth/realms/${realm}`);
      }
    }
  }

  // Internal container URL (for direct Keycloak access)
  issuers.add(`${keycloakUrl}/realms/${realm}`);

  // External Keycloak URL via exposed port 8081 (for dev/direct access)
  issuers.add(`http://localhost:8081/realms/${realm}`);

  // Frontend proxy paths (tokens obtained via frontend proxy)
  issuers.add(`http://localhost:${vitePort}/auth/realms/${realm}`);
  issuers.add(`http://127.0.0.1:${vitePort}/auth/realms/${realm}`);

  const result = Array.from(issuers).filter(Boolean) as string[];
  // Ensure at least one issuer exists to satisfy jwt.verify's type requirement
  if (result.length === 0) {
    return [`${keycloakUrl}/realms/${realm}`] as [string, ...string[]];
  }
  return result as [string, ...string[]];
};

// Verify Keycloak JWT token
export const verifyKeycloakToken = async (
  token: string,
): Promise<KeycloakToken> => {
  return new Promise((resolve, reject) => {
    // Decode the token to see its claims for debugging
    const decoded = jwt.decode(token, { complete: true });
    if (process.env.NODE_ENV !== "production") {
      console.log(
        "DEBUG: Token decoded:",
        JSON.stringify((decoded as any)?.payload, null, 2),
      );
    }

    const allowedIssuers = buildAllowedIssuers();
    if (process.env.NODE_ENV !== "production") {
      console.log("DEBUG: Allowed issuers:", allowedIssuers);
    }

    jwt.verify(
      token,
      getKey,
      {
        // Don't validate audience since Keycloak uses 'azp' (authorized party) instead of 'aud'
        issuer: allowedIssuers,
        algorithms: ["RS256"],
        clockTolerance: 120, // Tolerate 2 minutes of clock skew
      },
      (err, decoded) => {
        if (err) {
          console.error("DEBUG: JWT Verify Error:", err);
          reject(err);
          return;
        }

        // Manually validate the authorized party (azp) since Keycloak uses this instead of audience
        const decodedToken = decoded as KeycloakToken & { azp?: string };
        const expectedClient = process.env.KEYCLOAK_CLIENT_ID || "bod-app";

        if (decodedToken.azp && decodedToken.azp !== expectedClient) {
          reject(
            new Error(
              `Invalid client. Expected: ${expectedClient}, got: ${decodedToken.azp}`,
            ),
          );
          return;
        }

        resolve(decodedToken);
      },
    );
  });
};

// Helper to check for a specific role
export const hasRole = (token: KeycloakToken, role: string): boolean => {
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

// Check if user has admin role
export const hasAdminRole = (token: KeycloakToken): boolean => {
  return hasRole(token, "admin");
};

// Check if user has superadmin role
export const hasSuperAdminRole = (token: KeycloakToken): boolean => {
  return hasRole(token, "superadmin");
};

// Check if user is authorized (has user or admin role)
// Check if user is authorized (has any valid token)
export const isAuthorizedUser = (token: KeycloakToken): boolean => {
  // We allow any authenticated user to access the API
  // Specific routes (like admin) are protected by requireAdmin
  return true;
};

// Authentication middleware
export const requireAuth = async (
  req: RequestWithAuth,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  // Test mode bypass - allows integration tests to run without Keycloak
  if (
    process.env.NODE_ENV === "test" &&
    req.headers["x-test-mode"] === "true"
  ) {
    req.user = {
      id: req.headers["x-test-user-id"]?.toString() || "test-user-id",
      email: req.headers["x-test-user-email"]?.toString() || "test@example.com",
      username: req.headers["x-test-username"]?.toString() || "testuser",
      name: "Test User",
      isAuthorized: true,
      isAdmin: req.headers["x-test-is-admin"] === "true",
      roles: (req.headers["x-test-roles"]?.toString() || "user").split(","),
    };
    return next();
  }

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      const response: ApiResponse = {
        success: false,
        error: "Authorization token required",
      };
      res.status(401).json(response);
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      const response: ApiResponse = {
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
    const tokenData = await verifyKeycloakToken(token);

    // Check if user is authorized
    const authorized = isAuthorizedUser(tokenData);

    if (!authorized) {
      const response: ApiResponse = {
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
      name:
        tokenData.name ||
        `${tokenData.given_name || ""} ${tokenData.family_name || ""}`.trim(),
      isAuthorized: true,
      isAdmin: hasAdminRole(tokenData),
      roles: [
        ...(tokenData.realm_access?.roles || []),
        ...(tokenData.resource_access?.[
          process.env.KEYCLOAK_CLIENT_ID || "bod-app"
        ]?.roles || []),
      ],
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    if ((error as any).message)
      console.error("Error message:", (error as any).message);
    const response: ApiResponse = {
      success: false,
      error: "Invalid or expired token",
      // Include more details in non-production for debugging
      ...(process.env.NODE_ENV !== "production"
        ? { debug: (error as any).message }
        : {}),
    };
    res.status(401).json(response);
  }
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = async (
  req: RequestWithAuth,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);

      if (token) {
        try {
          const tokenData = await verifyKeycloakToken(token);
          const authorized = isAuthorizedUser(tokenData);

          req.user = {
            id: tokenData.sub,
            email: tokenData.email,
            username: tokenData.preferred_username,
            name:
              tokenData.name ||
              `${tokenData.given_name || ""} ${tokenData.family_name || ""}`.trim(),
            isAuthorized: authorized,
            isAdmin: hasAdminRole(tokenData),
            roles: [
              ...(tokenData.realm_access?.roles || []),
              ...(tokenData.resource_access?.[
                process.env.KEYCLOAK_CLIENT_ID || "bod-app"
              ]?.roles || []),
            ],
          };
        } catch (error) {
          // Invalid token, but don't fail the request
          req.user = undefined;
        }
      }
    }

    next();
  } catch (error) {
    // Don't fail the request for optional auth
    next();
  }
};

// Admin-only middleware
export const requireAdmin = async (
  req: RequestWithAuth,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  // First check authentication
  await requireAuth(req, res, () => {
    // Check if user has admin role or superadmin role (superadmin is implicitly admin)
    if (
      req.user &&
      (req.user.isAdmin || req.user.roles.includes("superadmin"))
    ) {
      next();
    } else {
      const response: ApiResponse = {
        success: false,
        error: "Admin access required",
      };
      res.status(403).json(response);
    }
  });
};

// Super Admin middleware (for system settings)
export const requireSuperAdmin = async (
  req: RequestWithAuth,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  // First check authentication
  await requireAuth(req, res, () => {
    // Check if user has superadmin role
    if (req.user && req.user.roles.includes("superadmin")) {
      next();
    } else {
      const response: ApiResponse = {
        success: false,
        error: "Super Admin access required",
      };
      res.status(403).json(response);
    }
  });
};
