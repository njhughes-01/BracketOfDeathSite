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
import { setTokenGetter, setTokenRefresher } from "../services/api";

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [keycloak, setKeycloak] = useState<Keycloak | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const initializationAttempted = useRef(false);

  // Token persistence helpers (Memory-only for security)
  // We no longer save sensitive tokens to localStorage to prevent XSS attacks.
  const saveTokens = (kc: Keycloak) => {
    // Intentionally empty - tokens are kept in memory only
    // Logic for refreshing is handled by Keycloak JS automatically via iframe/silent-sso
  };
  const loadTokens = (): {
    access_token: string;
    refresh_token?: string;
    id_token?: string;
  } | null => {
    // Intentionally returning null to force fresh login or silent SSO check
    return null;
  };

  // Helper function to set up user from token
  const setupUserFromToken = async (kc: Keycloak) => {
    try {
      const tokenParsed = kc.tokenParsed as KeycloakTokenParsed;

      if (!tokenParsed) {
        console.error("No token parsed available");
        return;
      }

      const roles: string[] = [
        ...(tokenParsed.realm_access?.roles || []),
        ...(tokenParsed.resource_access?.[
          import.meta.env.VITE_KEYCLOAK_CLIENT_ID
        ]?.roles || []),
      ];

      let profile: any = {};

      // Try to load user profile, but don't fail if it doesn't work (direct auth may not support this)
      try {
        if (
          kc.authenticated &&
          kc.authServerUrl &&
          !kc.authServerUrl.includes("undefined")
        ) {
          profile = await kc.loadUserProfile();
        } else {
          // Skip profile loading if URL is invalid, use token data directly
          throw new Error("Invalid auth server URL, skipping profile load");
        }
      } catch (profileError) {
        console.warn(
          "Could not load user profile, using token data:",
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
        isAdmin: roles.includes("admin"),
        isSuperAdmin: roles.includes("superadmin"),
        playerId: profile.attributes?.playerId?.[0],
        enabled: true, // Keycloak users are enabled if we are here
      };

      setUser(userData);
      setIsAuthenticated(true);

      console.log("User authenticated successfully:", userData);

      // Set up token refresh
      setTokenRefresher(async () => {
        try {
          // Increase min validity to 300 seconds (5 minutes) for better refresh timing
          const refreshed = await kc.updateToken(300);
          if (refreshed) {
            console.log("Token refreshed via API call");
            // ensure API picks up the latest token
            setTokenGetter(() => kc.token);
            saveTokens(kc);
          }
          return refreshed as boolean;
        } catch (e) {
          console.warn("Token refresh failed:", e);
          return false;
        }
      });
      kc.onTokenExpired = () => {
        console.log("Token expired, attempting refresh...");
        // Increase min validity to 300 seconds (5 minutes)
        kc.updateToken(300)
          .then((refreshed) => {
            if (refreshed) {
              console.log("Token refreshed successfully");
              setTokenGetter(() => kc.token);
              saveTokens(kc);
            } else {
              console.log("Token refresh not needed or failed");
            }
          })
          .catch((error) => {
            console.error("Failed to refresh token on expiry:", error);
            // Don't auto-logout on refresh failure - let the user manually logout
            // This prevents the logout loop
            console.warn(
              "Token refresh failed - user will need to re-login for next request",
            );
          });
      };
    } catch (error) {
      console.error("Failed to setup user from token:", error);
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
            console.log("Periodic check: Token expiring soon, refreshing...");
            const refreshed = await keycloak.updateToken(300);
            if (refreshed) {
              console.log("Periodic token refresh successful");
              setTokenGetter(() => keycloak.token);
              saveTokens(keycloak);
            }
          }
        }
      } catch (error) {
        console.warn("Periodic token refresh check failed:", error);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [keycloak, isAuthenticated]);

  // Manual initialization function (called by Login page)
  const initializeAuth = useCallback(async () => {
    if (keycloak || initializationAttempted.current) {
      console.log("Keycloak already initialized or initialization attempted");
      return;
    }

    initializationAttempted.current = true;

    setLoading(true);

    try {
      console.log("Starting Keycloak initialization...");
      console.log("Environment check:", {
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

      console.log("Keycloak client created, initializing...");

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
          console.warn("Failed to restore tokens from storage:", e);
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
        console.warn(
          "Keycloak init failed, but continuing with manual setup:",
          initError,
        );
      }

      console.log("Keycloak initialization completed:", {
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
      console.error("Keycloak initialization failed:", error);

      // Still try to set up Keycloak for manual login
      try {
        const kc = new Keycloak({
          url: import.meta.env.VITE_KEYCLOAK_URL,
          realm: import.meta.env.VITE_KEYCLOAK_REALM,
          clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
        });
        setKeycloak(kc);
      } catch (setupError) {
        console.error("Failed to create Keycloak instance:", setupError);
        setKeycloak(null);
      }

      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [keycloak]);

  const login = () => {
    console.log("Login button clicked");

    if (!keycloak) {
      console.error("Keycloak not initialized");
      return;
    }

    console.log("Redirecting to Keycloak login...");
    keycloak.login();
  };

  const logout = () => {
    console.log("Logout initiated");

    // Clear authentication state
    setIsAuthenticated(false);
    setUser(null);

    // Clear keycloak tokens
    if (keycloak) {
      keycloak.token = undefined;
      keycloak.refreshToken = undefined;
      keycloak.idToken = undefined;
      keycloak.authenticated = false;
      keycloak.tokenParsed = undefined;
    }

    // Clear any stored session data
    sessionStorage.removeItem("redirectAfterLogin");
    localStorage.removeItem("hasLoggedInBefore");

    // IMPORTANT: Clear stored tokens to prevent auto-login loop
    // localStorage.removeItem(TOKENS_KEY); // Removed as TOKENS_KEY is no longer used/defined

    // Redirect to login page
    window.location.href = "/login";

    console.log("Logout completed");
  };

  const hasRole = (role: string): boolean => {
    return user?.roles.includes(role) || false;
  };

  const setDirectAuthTokens = async (tokens: {
    access_token: string;
    refresh_token?: string;
    id_token?: string;
  }) => {
    try {
      let kc = keycloak;

      // If keycloak is not initialized, create a new instance
      if (!kc) {
        console.log("Creating Keycloak instance for direct token setup...");
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

      console.log("Direct tokens set on Keycloak, setting up user...");

      // Set up token getter for API client
      setTokenGetter(() => kc.token);

      // Set up user from token
      await setupUserFromToken(kc);
      saveTokens(kc);

      console.log("Direct authentication setup complete");
    } catch (error) {
      console.error("Failed to set direct auth tokens:", error);
      throw error;
    }
  };

  const refreshUser = async () => {
    if (keycloak) {
      await setupUserFromToken(keycloak);
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
