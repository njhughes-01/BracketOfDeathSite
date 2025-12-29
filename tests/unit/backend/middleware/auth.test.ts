import { Response, NextFunction } from 'express';
import { RequestWithAuth } from '../../../../src/backend/controllers/base';

jest.mock('jsonwebtoken', () => {
  const mockDecode = jest.fn();
  const mockVerify = jest.fn();
  return {
    __esModule: true,
    default: {
      decode: mockDecode,
      verify: mockVerify,
    },
    decode: mockDecode,
    verify: mockVerify,
  };
});

jest.mock('jwks-rsa', () => {
  return jest.fn().mockImplementation(() => ({
    getSigningKey: jest.fn((kid: any, cb: any) => cb(null, { getPublicKey: () => 'public-key' })),
  }));
});

import { requireAuth, requireSuperAdmin } from '../../../../src/backend/middleware/auth';
import jwt from 'jsonwebtoken'; // This should pick up the mock

describe('Auth Middleware', () => {
  let mockRequest: Partial<RequestWithAuth>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeAll(() => {
    process.env.KEYCLOAK_CLIENT_ID = 'bod-app';
    process.env.KEYCLOAK_REALM = 'bracketofdeathsite';
    process.env.KEYCLOAK_URL = 'http://localhost:8080';
    process.env.KEYCLOAK_ISSUER = 'http://localhost:8080/realms/bracketofdeathsite';
    process.env.NODE_ENV = 'test';
  });

  beforeEach(() => {


    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
    jest.clearAllMocks();

    // Reset spy logs
    // jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('requireAuth', () => {
    it('should return 401 if no authorization header', async () => {
      await requireAuth(mockRequest as RequestWithAuth, mockResponse as unknown as Response, nextFunction);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Authorization token required' }));
    });

    it('should populate req.user if token is valid', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid.token.signature',
        'x-test-mode': 'true',
        'x-test-user-id': 'user-123',
        'x-test-user-email': 'test@example.com',
        'x-test-username': 'testuser',
        'x-test-roles': 'user'
      };

      const decodedToken = {
        sub: 'user-123',
        email: 'test@example.com',
        preferred_username: 'testuser',
        realm_access: { roles: ['user'] },
        azp: 'bod-app',
        iss: 'http://localhost:8080/realms/bracketofdeathsite',
      };

      (jwt.decode as jest.Mock).mockReturnValue({ payload: decodedToken });
      (jwt.verify as jest.Mock).mockImplementation((token: any, key: any, options: any, cb: any) => {
        console.log('DEBUG MOCK: jwt.verify called');
        cb(null, decodedToken);
      });

      console.log('DEBUG MOCK: calling requireAuth');
      await requireAuth(mockRequest as RequestWithAuth, mockResponse as unknown as Response, nextFunction);
      console.log('DEBUG MOCK: requireAuth finished');



      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.id).toBe('user-123');
    });
  });

  describe('requireSuperAdmin', () => {
    it('should allow access if user has superadmin role', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid.token.signature',
        'x-test-mode': 'true',
        'x-test-user-id': 'superadmin-123',
        'x-test-user-email': 'super@example.com',
        'x-test-username': 'superadmin_user',
        'x-test-roles': 'superadmin,admin',
        'x-test-is-admin': 'true'
      };

      const decodedToken = {
        sub: 'superadmin-123',
        email: 'super@example.com',
        preferred_username: 'superadmin_user',
        realm_access: { roles: ['superadmin', 'admin'] },
        azp: 'bod-app',
        iss: 'http://localhost:8080/realms/bracketofdeathsite',
      };

      (jwt.decode as jest.Mock).mockReturnValue({ payload: decodedToken });
      (jwt.verify as jest.Mock).mockImplementation((token: any, key: any, options: any, cb: any) => {
        cb(null, decodedToken);
      });

      await requireSuperAdmin(mockRequest as RequestWithAuth, mockResponse as unknown as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalledWith(403);
    });

    it('should deny access if user is admin but not superadmin', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid.token.signature',
        'x-test-mode': 'true',
        'x-test-user-id': 'admin-123',
        'x-test-user-email': 'admin@example.com',
        'x-test-username': 'just_admin',
        'x-test-roles': 'admin',
        'x-test-is-admin': 'true'
      };

      const decodedToken = {
        sub: 'admin-123',
        email: 'admin@example.com',
        preferred_username: 'just_admin',
        realm_access: { roles: ['admin'] },
        azp: 'bod-app',
        iss: 'http://localhost:8080/realms/bracketofdeathsite',
      };

      (jwt.decode as jest.Mock).mockReturnValue({ payload: decodedToken });
      (jwt.verify as jest.Mock).mockImplementation((token: any, key: any, options: any, cb: any) => {
        cb(null, decodedToken);
      });

      await requireSuperAdmin(mockRequest as RequestWithAuth, mockResponse as unknown as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Super Admin access required' }));
    });
  });
});
