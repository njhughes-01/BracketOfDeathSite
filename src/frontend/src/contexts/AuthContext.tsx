import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import type { ReactNode } from "react";
import Keycloak from "keycloak-js";
import { setTokenGetter, setTokenRefresher, setLogoutHandler, apiClient } from "../services/api";
import logger from "../utils/logger";

interface KeycloakTokenParsed {
  sub: string;
  email?: string;
  preferred_username?: string;
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

import type { User } from "../types/user";

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  keycloak: Keycloak | null;
  initializeAuth: () => Promise<void>;
  login: () => void;
  logout: () => void;
  hasRole: (role: string) => boolean;
  isAdmin: boolean;
  token: string | undefined;
  loading: boolean;
  setDirectAuthTokens: (tokens: {
    access_token: string;
    refresh_token?: string;
    id_token?: string;
  }) => Promise<void>;
  refreshUser: () => Promise<void>;
  forceTokenRefresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [keycloak, setKeycloak] = useState<Keycloak | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Start as TRUE to prevent flash of unauthenticated content
  const initializationAttempted = useRef(false);

  // Token persistence helpers — stored in localStorage with 24h TTL
  const TOKENS_KEY = "bod_auth_tokens";
  const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  const saveTokens = (kc: Keycloak) => {
    try {
      if (kc.token) {
        const payload = {
          access_token: kc.token,
          refresh_token: kc.refreshToken,
          id_token: kc.idToken,
          saved_at: Date.now(),
        };
        localStorage.setItem(TOKENS_KEY, JSON.stringify(payload));
      }
    } catch (e) {
      logger.warn("Failed to save tokens to localStorage:", e);
    }
  };

  const loadTokens = (): {
    access_token: string;
    refresh_token?: string;
    id_token?: string;
  } | null => {
    try {
      const raw = localStorage.getItem(TOKENS_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // Check 24h TTL
      if (Date.now() - (parsed.saved_at || 0) > TOKEN_TTL_MS) {
        localStorage.removeItem(TOKENS_KEY);
        return null;
      }
      return parsed;
    } catch {
      localStorage.removeItem(TOKENS_KEY);
      return null;
    }
  };

  const clearTokens = () => {
    try { localStorage.removeItem(TOKENS_KEY); } catch {}
  };

  // Helper function to set up user from token
  const setupUserFromToken = async (kc: Keycloak) => {
    try {
      const tokenParsed = kc.tokenParsed as KeycloakTokenParsed;

      if (!tokenParsed) {
        logger.error("No token parsed available");
        return;
      }

      const roles: string[] = [
        ...(tokenParsed.realm_access?.roles || []),
        ...(tokenParsed.resource_access?.[
          import.meta.env.VITE_KEYCLOAK_CLIENT_ID
        ]?.roles || []),
      ];

      let profile: any = {};

      // Only attempt to load user profile if we have a valid SSO session
      // Direct auth (resource owner password flow) doesn't support the account endpoint
      // and will always return 401. Check if we went through SSO by looking for session state.
      const hasSsoSession = !!kc.sessionId;

      if (
        hasSsoSession &&
        kc.authenticated &&
        kc.authServerUrl &&
        !kc.authServerUrl.includes("undefined")
      ) {
        try {
          profile = await kc.loadUserProfile();
        } catch (profileError) {
          logger.warn(
            "Could not load user profile from Keycloak, using token data:",
            profileError,
          );
          // Use token data as fallback
          profile = {
            id: tokenParsed.sub,
            email: tokenParsed.email,
            username: tokenParsed.preferred_username,
            firstName: tokenParsed.given_name,
            lastName: tokenParsed.family_name,
          };
        }
      } else {
        // Direct auth - use token data directly (no account API available)
        logger.debug("Using token data directly (direct auth mode)");
        profile = {
          id: tokenParsed.sub,
          email: tokenParsed.email,
          username: tokenParsed.preferred_username,
          firstName: tokenParsed.given_name,
          lastName: tokenParsed.family_name,
        };
      }

      const userData: User = {
        id: profile.id || tokenParsed.sub,
        email: profile.email || tokenParsed.email || "",
        username: profile.username || tokenParsed.preferred_username || "",
        firstName: profile.firstName || tokenParsed.given_name,
        lastName: profile.lastName || tokenParsed.family_name,
        fullName:
          `${profile.firstName || tokenParsed.given_name || ""} ${profile.lastName || tokenParsed.family_name || ""}`.trim() ||
          tokenParsed.name ||
          profile.username ||
          tokenParsed.preferred_username ||
          "",
        roles,
        isAdmin: roles.includes("admin") || roles.includes("superadmin"),
        isSuperAdmin: roles.includes("superadmin"),
        playerId: profile.attributes?.playerId?.[0],
        enabled: true, // Keycloak users are enabled if we are here
      };

      setUser(userData);
      setIsAuthenticated(true);

      logger.debug("User authenticated successfully:", userData);

      // Set up token refresh
      setTokenRefresher(async () => {
        try {
          // Increase min validity to 300 seconds (5 minutes) for better refresh timing
          const refreshed = await kc.updateToken(300);
          if (refreshed) {
            logger.debug("Token refreshed via API call");
            // ensure API picks up the latest token
            setTokenGetter(() => kc.token);
            saveTokens(kc);
          }
          return refreshed as boolean;
        } catch (e) {
          logger.warn("Token refresh failed:", e);
          return false;
        }
      });
      kc.onTokenExpired = () => {
        logger.debug("Token expired, attempting refresh...");
        // Increase min validity to 300 seconds (5 minutes)
        kc.updateToken(300)
          .then((refreshed) => {
            if (refreshed) {
              logger.debug("Token refreshed successfully");
              setTokenGetter(() => kc.token);
              saveTokens(kc);
            } else {
              logger.debug("Token refresh not needed or failed");
            }
          })
          .catch((error) => {
            logger.error("Failed to refresh token on expiry:", error);
            // Don't auto-logout on refresh failure - let the user manually logout
            // This prevents the logout loop
            logger.warn(
              "Token refresh failed - user will need to re-login for next request",
            );
          });
      };
    } catch (error) {
      logger.error("Failed to setup user from token:", error);
    }
  };

  // Listen for manual authentication events
  useEffect(() => {
    const handleManualAuth = async () => {
      if (keycloak && keycloak.authenticated && keycloak.tokenParsed) {
        await setupUserFromToken(keycloak);
      }
    };

    window.addEventListener("keycloak-authenticated", handleManualAuth);
    return () =>
      window.removeEventListener("keycloak-authenticated", handleManualAuth);
  }, [keycloak]);

  // Periodic token refresh check (every 30 seconds)
  useEffect(() => {
    if (!keycloak || !isAuthenticated) return;

    const interval = setInterval(async () => {
      try {
        // Check if token will expire within 90 seconds and refresh if needed
        const tokenParsed = keycloak.tokenParsed as any;
        if (tokenParsed?.exp) {
          const expiresIn = tokenParsed.exp * 1000 - Date.now();
          if (expiresIn < 90000) {
            // Less than 90 seconds until expiry
            logger.debug("Periodic check: Token expiring soon, refreshing...");
            const refreshed = await keycloak.updateToken(300);
            if (refreshed) {
              logger.debug("Periodic token refresh successful");
              setTokenGetter(() => keycloak.token);
              saveTokens(keycloak);
            }
          }
        }
      } catch (error) {
        logger.warn("Periodic token refresh check failed:", error);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [keycloak, isAuthenticated]);

  // Manual initialization function (called by Login page)
  const initializeAuth = useCallback(async () => {
    if (keycloak || initializationAttempted.current) {
      logger.debug("Keycloak already initialized or initialization attempted");
      // Ensure loading is false if we're skipping initialization
      setLoading(false);
      return;
    }

    initializationAttempted.current = true;

    setLoading(true);

    try {
      logger.debug("Starting Keycloak initialization...");
      logger.debug("Environment check:", {
        VITE_KEYCLOAK_URL: import.meta.env.VITE_KEYCLOAK_URL,
        VITE_KEYCLOAK_REALM: import.meta.env.VITE_KEYCLOAK_REALM,
        VITE_KEYCLOAK_CLIENT_ID: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
      });

      // Create Keycloak instance and set immediately so helpers reuse it
      const kc = new Keycloak({
        url: import.meta.env.VITE_KEYCLOAK_URL,
        realm: import.meta.env.VITE_KEYCLOAK_REALM,
        clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
      });
      setKeycloak(kc);

      logger.debug("Keycloak client created, initializing...");

      // Attempt to restore tokens before init for instant session
      const saved = loadTokens();
      if (saved?.access_token) {
        try {
          kc.token = saved.access_token;
          kc.refreshToken = saved.refresh_token;
          kc.idToken = saved.id_token;
          try {
            const parsed = JSON.parse(atob(saved.access_token.split(".")[1]));
            kc.tokenParsed = parsed;
          } catch {}
          // Set timeSkew so Keycloak knows expiry baseline
          try {
            // Removed manual timeSkew calculation as it was causing issues with token validation
          } catch {}
          kc.authenticated = true;
          setTokenGetter(() => kc.token);
          await setupUserFromToken(kc);
          saveTokens(kc);
          setIsAuthenticated(true);
        } catch (e) {
          logger.warn("Failed to restore tokens from storage:", e);
        }
      }

      // Initialize Keycloak silently; do not unset existing authenticated state
      let authenticated = false;
      try {
        authenticated = await kc.init({
          onLoad: "check-sso",
          checkLoginIframe: false,
          enableLogging: true,
          silentCheckSsoFallback: true,
          silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
          messageReceiveTimeout: 5000,
          pkceMethod: "S256",
        });
      } catch (initError) {
        logger.warn(
          "Keycloak init failed, but continuing with manual setup:",
          initError,
        );
      }

      logger.debug("Keycloak initialization completed:", {
        authenticated,
        keycloakUrl: kc.authServerUrl,
        realm: kc.realm,
        clientId: kc.clientId,
      });

      // Set up token wiring and refresh regardless
      setTokenGetter(() => kc.token);
      setTokenRefresher(async () => {
        try {
          const refreshed = await kc.updateToken(30);
          if (refreshed) {
            setTokenGetter(() => kc.token);
            saveTokens(kc);
          }
          return refreshed as boolean;
        } catch {
          return false;
        }
      });

      if (authenticated && kc.tokenParsed) {
        await setupUserFromToken(kc);
        saveTokens(kc);
        setIsAuthenticated(true);
      }
    } catch (error) {
      logger.error("Keycloak initialization failed:", error);

      // Still try to set up Keycloak for manual login
      try {
        const kc = new Keycloak({
          url: import.meta.env.VITE_KEYCLOAK_URL,
          realm: import.meta.env.VITE_KEYCLOAK_REALM,
          clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
        });
        setKeycloak(kc);
      } catch (setupError) {
        logger.error("Failed to create Keycloak instance:", setupError);
        setKeycloak(null);
      }

      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [keycloak]);

  const login = () => {
    logger.debug("Login button clicked");

    if (!keycloak) {
      logger.error("Keycloak not initialized");
      return;
    }

    logger.debug("Redirecting to Keycloak login...");
    keycloak.login();
  };

  const logout = () => {
    logger.debug("Logout initiated");

    // Capture keycloak state before clearing
    const shouldKeycloakLogout = keycloak != null;

    // Clear authentication state
    setIsAuthenticated(false);
    setUser(null);

    // Clear any stored session data
    sessionStorage.removeItem("redirectAfterLogin");
    localStorage.removeItem("hasLoggedInBefore");

    // Clear persisted tokens
    clearTokens();

    // End Keycloak server-side session (clears SSO cookie) and redirect
    if (shouldKeycloakLogout) {
      logger.debug("Ending Keycloak session");
      keycloak.logout({ redirectUri: window.location.origin + "/login" });
    } else {
      window.location.href = "/login";
    }

    logger.debug("Logout completed");
  };

  const hasRole = (role: string): boolean => {
    return user?.roles.includes(role) || false;
  };

  useEffect(() => {
    setLogoutHandler(logout);
  }, []);

  const setDirectAuthTokens = async (tokens: {
    access_token: string;
    refresh_token?: string;
    id_token?: string;
  }) => {
    try {
      let kc = keycloak;

      // If keycloak is not initialized, create a new instance
      if (!kc) {
        logger.debug("Creating Keycloak instance for direct token setup...");
        kc = new Keycloak({
          url: import.meta.env.VITE_KEYCLOAK_URL,
          realm: import.meta.env.VITE_KEYCLOAK_REALM,
          clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
        });
        setKeycloak(kc);
      }

      // Set tokens on Keycloak instance
      kc.token = tokens.access_token;
      kc.refreshToken = tokens.refresh_token;
      kc.idToken = tokens.id_token;

      // Parse the access token to get user info
      const tokenParsed = JSON.parse(atob(tokens.access_token.split(".")[1]));
      kc.tokenParsed = tokenParsed;
      try {
        // Removed manual timeSkew calculation as it was causing issues with token validation
        // The token is already validated by the backend
      } catch {}
      kc.authenticated = true;

      logger.debug("Direct tokens set on Keycloak, setting up user...");

      // Set up token getter for API client
      setTokenGetter(() => kc.token);

      // Set up user from token
      await setupUserFromToken(kc);
      saveTokens(kc);

      logger.debug("Direct authentication setup complete");
    } catch (error) {
      logger.error("Failed to set direct auth tokens:", error);
      throw error;
    }
  };

  const refreshUser = async () => {
    if (keycloak) {
      // First, refresh from token
      await setupUserFromToken(keycloak);
      
      // Then fetch fresh profile data from backend (has latest Keycloak data)
      try {
        const response = await apiClient.getProfile();
        if (response.success && response.data?.user) {
          const profileUser = response.data.user;
          setUser(prev => prev ? {
            ...prev,
            firstName: profileUser.firstName,
            lastName: profileUser.lastName,
            fullName: profileUser.fullName,
            playerId: profileUser.playerId,
          } : null);
        }
      } catch (error) {
        logger.warn('Could not fetch fresh profile data:', error);
      }
    }
  };

  const value: AuthContextType = {
    isAuthenticated,
    user,
    keycloak,
    initializeAuth,
    login,
    logout,
    hasRole,
    isAdmin: user?.isAdmin || false,
    token: keycloak?.token,
    loading,
    setDirectAuthTokens,
    refreshUser,
    forceTokenRefresh: async () => {
      try {
        if (keycloak) {
          // Force refresh by passing -1 (min validity)
          logger.debug("Forcing token refresh...");
          await keycloak.updateToken(-1);
          await setupUserFromToken(keycloak);
          saveTokens(keycloak);
          logger.debug("Token forced refresh successful");
        }
      } catch (e) {
        logger.error("Force token refresh failed:", e);
        throw e;
      }
    },
  };

  // Auto-initialize auth on mount to survive page refresh (silent SSO)
  useEffect(() => {
    // Fire and forget; ProtectedRoute shows a spinner via `loading` state
    initializeAuth();
  }, [initializeAuth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
