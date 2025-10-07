import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import Keycloak from 'keycloak-js';
import { setTokenGetter, setTokenRefresher } from '../services/api';

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

interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  roles: string[];
  isAdmin: boolean;
}

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
  setDirectAuthTokens: (tokens: { access_token: string; refresh_token?: string; id_token?: string }) => Promise<void>;
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

  // Helper function to set up user from token
  const setupUserFromToken = async (kc: Keycloak) => {
    try {
      const tokenParsed = kc.tokenParsed as KeycloakTokenParsed;
      
      if (!tokenParsed) {
        console.error('No token parsed available');
        return;
      }

      const roles: string[] = [
        ...(tokenParsed.realm_access?.roles || []),
        ...(tokenParsed.resource_access?.[import.meta.env.VITE_KEYCLOAK_CLIENT_ID]?.roles || [])
      ];

      let profile: any = {};
      
      // Try to load user profile, but don't fail if it doesn't work (direct auth may not support this)
      try {
        if (kc.authenticated && kc.authServerUrl && !kc.authServerUrl.includes('undefined')) {
          profile = await kc.loadUserProfile();
        } else {
          // Skip profile loading if URL is invalid, use token data directly
          throw new Error('Invalid auth server URL, skipping profile load');
        }
      } catch (profileError) {
        console.warn('Could not load user profile, using token data:', profileError);
        // Use token data as fallback
        profile = {
          id: tokenParsed.sub,
          email: tokenParsed.email,
          username: tokenParsed.preferred_username,
          firstName: tokenParsed.given_name,
          lastName: tokenParsed.family_name
        };
      }

      const userData: User = {
        id: profile.id || tokenParsed.sub,
        email: profile.email || tokenParsed.email || '',
        username: profile.username || tokenParsed.preferred_username || '',
        name: `${profile.firstName || tokenParsed.given_name || ''} ${profile.lastName || tokenParsed.family_name || ''}`.trim() || tokenParsed.name || profile.username || tokenParsed.preferred_username || '',
        roles,
        isAdmin: roles.includes('admin'),
      };

      setUser(userData);
      setIsAuthenticated(true);
      
      console.log('User authenticated successfully:', userData);

      // Set up token refresh
      setTokenRefresher(async () => {
        try {
          const refreshed = await kc.updateToken(30);
          if (refreshed) {
            // ensure API picks up the latest token
            setTokenGetter(() => kc.token);
          }
          return refreshed as boolean;
        } catch (e) {
          return false;
        }
      });
      kc.onTokenExpired = () => {
        kc.updateToken(30)
          .then((refreshed) => {
            if (refreshed) {
              console.log('Token refreshed');
            } else {
              console.log('Token not refreshed');
            }
          })
          .catch(() => {
            console.log('Failed to refresh token');
            logout();
          });
      };
    } catch (error) {
      console.error('Failed to setup user from token:', error);
    }
  };

  // Listen for manual authentication events
  useEffect(() => {
    const handleManualAuth = async () => {
      if (keycloak && keycloak.authenticated && keycloak.tokenParsed) {
        await setupUserFromToken(keycloak);
      }
    };

    window.addEventListener('keycloak-authenticated', handleManualAuth);
    return () => window.removeEventListener('keycloak-authenticated', handleManualAuth);
  }, [keycloak]);

  // Manual initialization function (called by Login page)
  const initializeAuth = useCallback(async () => {
    if (keycloak || initializationAttempted.current) {
      console.log('Keycloak already initialized or initialization attempted');
      return;
    }
    
    initializationAttempted.current = true;

    setLoading(true);
    
    try {
      console.log('Starting Keycloak initialization...');
      console.log('Environment check:', {
        VITE_KEYCLOAK_URL: import.meta.env.VITE_KEYCLOAK_URL,
        VITE_KEYCLOAK_REALM: import.meta.env.VITE_KEYCLOAK_REALM,
        VITE_KEYCLOAK_CLIENT_ID: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
      });
      
      const kc = new Keycloak({
        url: import.meta.env.VITE_KEYCLOAK_URL,
        realm: import.meta.env.VITE_KEYCLOAK_REALM,
        clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
      });

      console.log('Keycloak client created, initializing...');

      // Try to initialize Keycloak, but don't fail if it doesn't work
      let authenticated = false;
      try {
        authenticated = await kc.init({
          onLoad: 'check-sso',
          checkLoginIframe: false,
          enableLogging: true,
          silentCheckSsoFallback: false,
          messageReceiveTimeout: 5000,
        });
      } catch (initError) {
        console.warn('Keycloak init failed, but continuing with manual setup:', initError);
      }

      console.log('Keycloak initialization completed:', {
        authenticated,
        keycloakUrl: kc.authServerUrl,
        realm: kc.realm,
        clientId: kc.clientId
      });

      // Always set the Keycloak instance
      setKeycloak(kc);
      setIsAuthenticated(authenticated);

      // Set up token getter for API client
      setTokenGetter(() => kc.token);
      setTokenRefresher(async () => {
        try {
          const refreshed = await kc.updateToken(30);
          if (refreshed) setTokenGetter(() => kc.token);
          return refreshed as boolean;
        } catch {
          return false;
        }
      });

      if (authenticated && kc.tokenParsed) {
        await setupUserFromToken(kc);
      }
    } catch (error) {
      console.error('Keycloak initialization failed:', error);
      
      // Still try to set up Keycloak for manual login
      try {
        const kc = new Keycloak({
          url: import.meta.env.VITE_KEYCLOAK_URL,
          realm: import.meta.env.VITE_KEYCLOAK_REALM,
          clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
        });
        setKeycloak(kc);
      } catch (setupError) {
        console.error('Failed to create Keycloak instance:', setupError);
        setKeycloak(null);
      }
      
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [keycloak]);


  const login = () => {
    console.log('Login button clicked');
    
    if (!keycloak) {
      console.error('Keycloak not initialized');
      return;
    }
    
    console.log('Redirecting to Keycloak login...');
    keycloak.login();
  };

  const logout = () => {
    console.log('Logout initiated');
    
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
    sessionStorage.removeItem('redirectAfterLogin');
    localStorage.removeItem('hasLoggedInBefore');
    
    // Redirect to login page
    window.location.href = '/login';
    
    console.log('Logout completed');
  };

  const hasRole = (role: string): boolean => {
    return user?.roles.includes(role) || false;
  };

  const setDirectAuthTokens = async (tokens: { access_token: string; refresh_token?: string; id_token?: string }) => {
    try {
      let kc = keycloak;
      
      // If keycloak is not initialized, create a new instance
      if (!kc) {
        console.log('Creating Keycloak instance for direct token setup...');
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
      const tokenParsed = JSON.parse(atob(tokens.access_token.split('.')[1]));
      kc.tokenParsed = tokenParsed;
      kc.authenticated = true;
      
      console.log('Direct tokens set on Keycloak, setting up user...');
      
      // Set up token getter for API client
      setTokenGetter(() => kc.token);
      
      // Set up user from token
      await setupUserFromToken(kc);
      
      console.log('Direct authentication setup complete');
    } catch (error) {
      console.error('Failed to set direct auth tokens:', error);
      throw error;
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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
