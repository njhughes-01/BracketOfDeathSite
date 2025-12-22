import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Global Keycloak mock
vi.mock('keycloak-js', () => {
    return {
        default: vi.fn().mockImplementation(() => ({
            init: vi.fn().mockResolvedValue(true),
            login: vi.fn(),
            logout: vi.fn(),
            createLoginUrl: vi.fn(),
            createLogoutUrl: vi.fn(),
            register: vi.fn(),
            accountManagement: vi.fn(),
            createAccountUrl: vi.fn(),
            loadUserProfile: vi.fn().mockResolvedValue({}),
            subject: 'mock-user',
            token: 'mock-token',
            tokenParsed: {
                sub: 'mock-user',
                realm_access: { roles: ['user'] },
            },
            realmAccess: { roles: ['user'] },
            resourceAccess: {},
            updateToken: vi.fn().mockResolvedValue(true),
        })),
    };
});

