"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAuth = exports.AuthProvider = void 0;
const react_1 = __importStar(require("react"));
const keycloak_js_1 = __importDefault(require("keycloak-js"));
const api_1 = require("../services/api");
const AuthContext = (0, react_1.createContext)(undefined);
const AuthProvider = ({ children }) => {
    const [keycloak, setKeycloak] = (0, react_1.useState)(null);
    const [isAuthenticated, setIsAuthenticated] = (0, react_1.useState)(false);
    const [user, setUser] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const initializationAttempted = (0, react_1.useRef)(false);
    const setupUserFromToken = async (kc) => {
        try {
            const tokenParsed = kc.tokenParsed;
            if (!tokenParsed) {
                console.error('No token parsed available');
                return;
            }
            const roles = [
                ...(tokenParsed.realm_access?.roles || []),
                ...(tokenParsed.resource_access?.[import.meta.env.VITE_KEYCLOAK_CLIENT_ID]?.roles || [])
            ];
            let profile = {};
            try {
                if (kc.authenticated && kc.authServerUrl && !kc.authServerUrl.includes('undefined')) {
                    profile = await kc.loadUserProfile();
                }
                else {
                    throw new Error('Invalid auth server URL, skipping profile load');
                }
            }
            catch (profileError) {
                console.warn('Could not load user profile, using token data:', profileError);
                profile = {
                    id: tokenParsed.sub,
                    email: tokenParsed.email,
                    username: tokenParsed.preferred_username,
                    firstName: tokenParsed.given_name,
                    lastName: tokenParsed.family_name
                };
            }
            const userData = {
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
            kc.onTokenExpired = () => {
                kc.updateToken(30)
                    .then((refreshed) => {
                    if (refreshed) {
                        console.log('Token refreshed');
                    }
                    else {
                        console.log('Token not refreshed');
                    }
                })
                    .catch(() => {
                    console.log('Failed to refresh token');
                    logout();
                });
            };
        }
        catch (error) {
            console.error('Failed to setup user from token:', error);
        }
    };
    (0, react_1.useEffect)(() => {
        const handleManualAuth = async () => {
            if (keycloak && keycloak.authenticated && keycloak.tokenParsed) {
                await setupUserFromToken(keycloak);
            }
        };
        window.addEventListener('keycloak-authenticated', handleManualAuth);
        return () => window.removeEventListener('keycloak-authenticated', handleManualAuth);
    }, [keycloak]);
    const initializeAuth = (0, react_1.useCallback)(async () => {
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
            const kc = new keycloak_js_1.default({
                url: import.meta.env.VITE_KEYCLOAK_URL,
                realm: import.meta.env.VITE_KEYCLOAK_REALM,
                clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
            });
            console.log('Keycloak client created, initializing...');
            let authenticated = false;
            try {
                authenticated = await kc.init({
                    onLoad: 'check-sso',
                    checkLoginIframe: false,
                    enableLogging: true,
                    silentCheckSsoFallback: false,
                    messageReceiveTimeout: 5000,
                });
            }
            catch (initError) {
                console.warn('Keycloak init failed, but continuing with manual setup:', initError);
            }
            console.log('Keycloak initialization completed:', {
                authenticated,
                keycloakUrl: kc.authServerUrl,
                realm: kc.realm,
                clientId: kc.clientId
            });
            setKeycloak(kc);
            setIsAuthenticated(authenticated);
            (0, api_1.setTokenGetter)(() => kc.token);
            if (authenticated && kc.tokenParsed) {
                await setupUserFromToken(kc);
            }
        }
        catch (error) {
            console.error('Keycloak initialization failed:', error);
            try {
                const kc = new keycloak_js_1.default({
                    url: import.meta.env.VITE_KEYCLOAK_URL,
                    realm: import.meta.env.VITE_KEYCLOAK_REALM,
                    clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
                });
                setKeycloak(kc);
            }
            catch (setupError) {
                console.error('Failed to create Keycloak instance:', setupError);
                setKeycloak(null);
            }
            setIsAuthenticated(false);
            setUser(null);
        }
        finally {
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
        setIsAuthenticated(false);
        setUser(null);
        if (keycloak) {
            keycloak.token = undefined;
            keycloak.refreshToken = undefined;
            keycloak.idToken = undefined;
            keycloak.authenticated = false;
            keycloak.tokenParsed = undefined;
        }
        sessionStorage.removeItem('redirectAfterLogin');
        localStorage.removeItem('hasLoggedInBefore');
        window.location.href = '/login';
        console.log('Logout completed');
    };
    const hasRole = (role) => {
        return user?.roles.includes(role) || false;
    };
    const setDirectAuthTokens = async (tokens) => {
        try {
            let kc = keycloak;
            if (!kc) {
                console.log('Creating Keycloak instance for direct token setup...');
                kc = new keycloak_js_1.default({
                    url: import.meta.env.VITE_KEYCLOAK_URL,
                    realm: import.meta.env.VITE_KEYCLOAK_REALM,
                    clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
                });
                setKeycloak(kc);
            }
            kc.token = tokens.access_token;
            kc.refreshToken = tokens.refresh_token;
            kc.idToken = tokens.id_token;
            const tokenParsed = JSON.parse(atob(tokens.access_token.split('.')[1]));
            kc.tokenParsed = tokenParsed;
            kc.authenticated = true;
            console.log('Direct tokens set on Keycloak, setting up user...');
            (0, api_1.setTokenGetter)(() => kc.token);
            await setupUserFromToken(kc);
            console.log('Direct authentication setup complete');
        }
        catch (error) {
            console.error('Failed to set direct auth tokens:', error);
            throw error;
        }
    };
    const value = {
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
    return (<AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>);
};
exports.AuthProvider = AuthProvider;
const useAuth = () => {
    const context = (0, react_1.useContext)(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
exports.useAuth = useAuth;
exports.default = AuthContext;
//# sourceMappingURL=AuthContext.js.map