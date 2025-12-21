import { Response, NextFunction } from 'express';
import { RequestWithAuth } from '../../../../src/backend/controllers/base';

// Move mocks to top level again
jest.mock('jsonwebtoken', () => ({
  decode: jest.fn(),
  verify: jest.fn(),
}));

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
    process.env.NODE_ENV = 'test';
  });

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
    jest.clearAllMocks();
    
    // Reset spy logs
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('requireAuth', () => {
    it('should return 401 if no authorization header', async () => {
      await requireAuth(mockRequest as RequestWithAuth, mockResponse as Response, nextFunction);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Authorization token required' }));
    });

    it('should populate req.user if token is valid', async () => {
      mockRequest.headers = { authorization: 'Bearer valid.token.signature' };
      
      const decodedToken = {
        sub: 'user-123',
        email: 'test@example.com',
        preferred_username: 'testuser',
        realm_access: { roles: ['user'] },
        azp: 'bod-app',
      };

      (jwt.decode as jest.Mock).mockReturnValue({ payload: decodedToken });
      (jwt.verify as jest.Mock).mockImplementation((token: any, key: any, options: any, cb: any) => {
        cb(null, decodedToken);
      });

      await requireAuth(mockRequest as RequestWithAuth, mockResponse as Response, nextFunction);
      
      if ((console.error as jest.Mock).mock.calls.length > 0) {
         process.stdout.write('DEBUG ERROR: ' + JSON.stringify((console.error as jest.Mock).mock.calls, null, 2) + '\n');
      }

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.id).toBe('user-123');
    });
  });

  describe('requireSuperAdmin', () => {
    it('should allow access if user has superadmin role', async () => {
      mockRequest.headers = { authorization: 'Bearer valid.token.signature' };
      
      const decodedToken = {
        sub: 'superadmin-123',
        email: 'super@example.com',
        preferred_username: 'superadmin_user',
        realm_access: { roles: ['superadmin', 'admin'] },
        azp: 'bod-app',
      };

      (jwt.decode as jest.Mock).mockReturnValue({ payload: decodedToken });
      (jwt.verify as jest.Mock).mockImplementation((token: any, key: any, options: any, cb: any) => {
        cb(null, decodedToken);
      });

      await requireSuperAdmin(mockRequest as RequestWithAuth, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled(); 
      expect(mockResponse.status).not.toHaveBeenCalledWith(403);
    });

    it('should deny access if user is admin but not superadmin', async () => {
       mockRequest.headers = { authorization: 'Bearer valid.token.signature' };
      
      const decodedToken = {
        sub: 'admin-123',
        email: 'admin@example.com',
        preferred_username: 'just_admin',
        realm_access: { roles: ['admin'] },
        azp: 'bod-app',
      };

      (jwt.decode as jest.Mock).mockReturnValue({ payload: decodedToken });
      (jwt.verify as jest.Mock).mockImplementation((token: any, key: any, options: any, cb: any) => {
        cb(null, decodedToken);
      });

      await requireSuperAdmin(mockRequest as RequestWithAuth, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Super Admin access required' }));
    });
  });
});
