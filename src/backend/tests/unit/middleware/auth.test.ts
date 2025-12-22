import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { verifyKeycloakToken, requireAuth, requireAdmin, requireSuperAdmin } from '../../../middleware/auth';
import { RequestWithAuth } from '../../../controllers/base';

// Mock jsonwebtoken
jest.mock('jsonwebtoken');

// Mock jwks-rsa
jest.mock('jwks-rsa', () => {
  return jest.fn().mockImplementation(() => ({
    getSigningKey: jest.fn((kid, callback) => {
      callback(null, {
        getPublicKey: () => 'mock-public-key'
      });
    })
  }));
});

describe('Auth Middleware', () => {
  let mockReq: Partial<RequestWithAuth>;
  let mockRes: Partial<Response>;
  let nextFunction: NextFunction;

  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      KEYCLOAK_URL: 'http://keycloak',
      KEYCLOAK_REALM: 'test-realm',
      KEYCLOAK_CLIENT_ID: 'test-client',
      NODE_ENV: 'test'
    };

    mockReq = {
      headers: {},
      user: undefined
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('verifyKeycloakToken', () => {
    it('should verify a valid token', async () => {
      const mockToken = 'valid-token';
      const mockDecodedToken = {
        sub: 'user-123',
        email: 'test@example.com',
        preferred_username: 'testuser',
        azp: 'test-client',
        realm_access: { roles: ['user'] }
      };

      (jwt.decode as jest.Mock).mockReturnValue({ payload: mockDecodedToken });
      (jwt.verify as jest.Mock).mockImplementation((token, getKey, options, callback) => {
        callback(null, mockDecodedToken);
      });

      const result = await verifyKeycloakToken(mockToken);
      expect(result).toEqual(mockDecodedToken);
      expect(jwt.verify).toHaveBeenCalled();
    });

    it('should reject if azp does not match client ID', async () => {
      const mockToken = 'invalid-client-token';
      const mockDecodedToken = {
        sub: 'user-123',
        azp: 'wrong-client'
      };

      (jwt.decode as jest.Mock).mockReturnValue({ payload: mockDecodedToken });
      (jwt.verify as jest.Mock).mockImplementation((token, getKey, options, callback) => {
        callback(null, mockDecodedToken);
      });

      await expect(verifyKeycloakToken(mockToken)).rejects.toThrow('Invalid client');
    });

    it('should reject if jwt.verify fails', async () => {
      const mockToken = 'expired-token';
      (jwt.verify as jest.Mock).mockImplementation((token, getKey, options, callback) => {
        callback(new Error('jwt expired'), null);
      });

      await expect(verifyKeycloakToken(mockToken)).rejects.toThrow('jwt expired');
    });
  });

  describe('requireAuth', () => {
    it('should return 401 if no authorization header is present', async () => {
      await requireAuth(mockReq as RequestWithAuth, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'Authorization token required'
      }));
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 if token is invalid', async () => {
      mockReq.headers!.authorization = 'Bearer invalid-token';
      (jwt.verify as jest.Mock).mockImplementation((token, getKey, options, callback) => {
        callback(new Error('invalid token'), null);
      });

      await requireAuth(mockReq as RequestWithAuth, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 403 if user has no authorized roles', async () => {
      mockReq.headers!.authorization = 'Bearer valid-token';
      const mockDecodedToken = {
        sub: 'user-123',
        email: 'test@example.com',
        preferred_username: 'testuser',
        azp: 'test-client',
        realm_access: { roles: ['guest'] } // No 'user' or 'admin' role
      };

      (jwt.decode as jest.Mock).mockReturnValue({ payload: mockDecodedToken });
      (jwt.verify as jest.Mock).mockImplementation((token, getKey, options, callback) => {
        callback(null, mockDecodedToken);
      });

      await requireAuth(mockReq as RequestWithAuth, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Access denied. User not authorized.'
      }));
    });

    it('should populate req.user and call next if token is valid', async () => {
      mockReq.headers!.authorization = 'Bearer valid-token';
      const mockDecodedToken = {
        sub: 'user-123',
        email: 'test@example.com',
        preferred_username: 'testuser',
        name: 'Test User',
        azp: 'test-client',
        realm_access: { roles: ['user'] }
      };

      (jwt.decode as jest.Mock).mockReturnValue({ payload: mockDecodedToken });
      (jwt.verify as jest.Mock).mockImplementation((token, getKey, options, callback) => {
        callback(null, mockDecodedToken);
      });

      await requireAuth(mockReq as RequestWithAuth, mockRes as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user!.id).toBe('user-123');
      expect(mockReq.user!.roles).toContain('user');
    });
  });

  describe('requireAdmin', () => {
    it('should return 403 if user is not an admin', async () => {
      mockReq.headers!.authorization = 'Bearer user-token';
      const mockDecodedToken = {
        sub: 'user-123',
        azp: 'test-client',
        realm_access: { roles: ['user'] }
      };

      (jwt.decode as jest.Mock).mockReturnValue({ payload: mockDecodedToken });
      (jwt.verify as jest.Mock).mockImplementation((token, getKey, options, callback) => {
        callback(null, mockDecodedToken);
      });

      // requireAdmin calls requireAuth internally
      await requireAdmin(mockReq as RequestWithAuth, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Admin access required'
      }));
    });

    it('should call next if user is an admin', async () => {
      mockReq.headers!.authorization = 'Bearer admin-token';
      const mockDecodedToken = {
        sub: 'admin-123',
        azp: 'test-client',
        realm_access: { roles: ['admin'] }
      };

      (jwt.decode as jest.Mock).mockReturnValue({ payload: mockDecodedToken });
      (jwt.verify as jest.Mock).mockImplementation((token, getKey, options, callback) => {
        callback(null, mockDecodedToken);
      });

      await requireAdmin(mockReq as RequestWithAuth, mockRes as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should call next if user is a superadmin', async () => {
        mockReq.headers!.authorization = 'Bearer superadmin-token';
        const mockDecodedToken = {
          sub: 'super-123',
          azp: 'test-client',
          realm_access: { roles: ['superadmin'] }
        };
  
        (jwt.decode as jest.Mock).mockReturnValue({ payload: mockDecodedToken });
        (jwt.verify as jest.Mock).mockImplementation((token, getKey, options, callback) => {
          callback(null, mockDecodedToken);
        });
  
        await requireAdmin(mockReq as RequestWithAuth, mockRes as Response, nextFunction);
  
        expect(nextFunction).toHaveBeenCalled();
      });
  });

  describe('requireSuperAdmin', () => {
    it('should return 403 if user is only an admin', async () => {
      mockReq.headers!.authorization = 'Bearer admin-token';
      const mockDecodedToken = {
        sub: 'admin-123',
        azp: 'test-client',
        realm_access: { roles: ['admin'] }
      };

      (jwt.decode as jest.Mock).mockReturnValue({ payload: mockDecodedToken });
      (jwt.verify as jest.Mock).mockImplementation((token, getKey, options, callback) => {
        callback(null, mockDecodedToken);
      });

      await requireSuperAdmin(mockReq as RequestWithAuth, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Super Admin access required'
      }));
    });

    it('should call next if user is a superadmin', async () => {
      mockReq.headers!.authorization = 'Bearer super-token';
      const mockDecodedToken = {
        sub: 'super-123',
        azp: 'test-client',
        realm_access: { roles: ['superadmin'] }
      };

      (jwt.decode as jest.Mock).mockReturnValue({ payload: mockDecodedToken });
      (jwt.verify as jest.Mock).mockImplementation((token, getKey, options, callback) => {
        callback(null, mockDecodedToken);
      });

      await requireSuperAdmin(mockReq as RequestWithAuth, mockRes as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });
  });
});
