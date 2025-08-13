import React from 'react';
import type { ReactNode } from 'react';
import Keycloak from 'keycloak-js';
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
    setDirectAuthTokens: (tokens: {
        access_token: string;
        refresh_token?: string;
        id_token?: string;
    }) => Promise<void>;
}
declare const AuthContext: React.Context<AuthContextType | undefined>;
interface AuthProviderProps {
    children: ReactNode;
}
export declare const AuthProvider: React.FC<AuthProviderProps>;
export declare const useAuth: () => AuthContextType;
export default AuthContext;
//# sourceMappingURL=AuthContext.d.ts.map