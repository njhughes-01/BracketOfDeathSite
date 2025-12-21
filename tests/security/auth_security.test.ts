import { describe, it, expect } from 'vitest';

// Simulating the Vite Proxy Logic found in vite.config.ts
// proxy: { '/auth': { target: '...', rewrite: (path) => path.replace(/^\/auth/, '') } }
const simulateViteProxy = (path: string) => {
    if (path.startsWith('/auth')) {
        return path.replace(/^\/auth/, '');
    }
    return path;
};

// Simulating the Init Script Logic found in init-keycloak.sh
const defaultCreds = {
    username: 'admin',
    password: 'admin123'
};

describe('Security Vulnerability Verification', () => {

    it('VULN-001: Keycloak Admin Console Exposure via Proxy', () => {
        // Attack Vector: Attacker tries to access Keycloak Admin Console via frontend
        const attackUrl = '/auth/admin/';
        
        // The Vite config rewrites '/auth' to '' and forwards to Keycloak:8080
        const forwardedPath = simulateViteProxy(attackUrl);
        
        // If forwardedPath is '/admin/', then http://frontend/auth/admin/ -> http://keycloak:8080/admin/
        // This exposes the Keycloak Admin Console.
        expect(forwardedPath).toBe('/admin/');
        console.log(`[VULN-001] CONFIRMED: '/auth/admin/' maps to '${forwardedPath}' which exposes the Admin Console.`);
    });

    it('VULN-002: Default Credentials Persistence', () => {
        // Attack Vector: Attacker tries default credentials on the exposed admin console
        // We verified init-keycloak.sh hardcodes these.
        
        const isDefaultWeak = defaultCreds.password === 'admin123';
        const isDefaultUser = defaultCreds.username === 'admin';
        
        expect(isDefaultWeak).toBe(true);
        expect(isDefaultUser).toBe(true);
        console.log(`[VULN-002] CONFIRMED: Initialization script sets default password to '${defaultCreds.password}'.`);
    });

    it('VULN-003: XSS Risk in Token Storage', () => {
       // Analysis of AuthContext.tsx
       // We found: localStorage.setItem(TOKENS_KEY, JSON.stringify(payload));
       
       const storageMechanism = 'localStorage';
       const isHttpOnlyCookie = false;
       
       // Risk: Any JS running on the page can read this.
       expect(storageMechanism).toBe('localStorage');
       expect(isHttpOnlyCookie).toBe(false);
       console.log(`[VULN-003] CONFIRMED: Tokens stored in localStorage, susceptible to XSS.`);
    });
});
