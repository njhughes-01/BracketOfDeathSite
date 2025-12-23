import { Response } from 'express';
import systemController from '../../controllers/SystemController';
import keycloakAdminService from '../../services/keycloakAdminService';
import { RequestWithAuth } from '../../controllers/base';

// Mock dependencies
jest.mock('../../services/keycloakAdminService');

describe('SystemController', () => {
    let mockReq: Partial<RequestWithAuth>;
    let mockRes: Partial<Response>;
    let jsonSpy: any;
    let statusSpy: any;

    beforeEach(() => {
        mockReq = {
            user: {
                id: 'user-123',
                email: 'test@example.com',
                username: 'testuser',
                roles: [],
                isAuthorized: true,
                isAdmin: false,
                name: 'Test User'
            }
        };

        jsonSpy = jest.fn();
        statusSpy = jest.fn().mockReturnValue({ json: jsonSpy });
        mockRes = {
            json: jsonSpy,
            status: statusSpy
        };

        jest.clearAllMocks();
    });

    describe('getStatus', () => {
        it('should return initialized: false when no superadmins exist', async () => {
            // Mock empty superadmin list
            (keycloakAdminService.getUsersInRole as jest.Mock).mockResolvedValue([]);

            await systemController.getStatus(mockReq as RequestWithAuth, mockRes as Response);

            expect(keycloakAdminService.getUsersInRole).toHaveBeenCalledWith('superadmin');
            expect(jsonSpy).toHaveBeenCalledWith({
                success: true,
                data: { initialized: false }
            });
        });

        it('should return initialized: true when superadmins exist', async () => {
            // Mock existing superadmin
            (keycloakAdminService.getUsersInRole as jest.Mock).mockResolvedValue([{ id: 'admin-1', username: 'admin' } as any]);

            await systemController.getStatus(mockReq as RequestWithAuth, mockRes as Response);

            expect(jsonSpy).toHaveBeenCalledWith({
                success: true,
                data: { initialized: true }
            });
        });
    });

    describe('claimSuperadmin', () => {
        it('should allow claiming if system is uninitialized', async () => {
            // Mock empty superadmin list
            (keycloakAdminService.getUsersInRole as jest.Mock).mockResolvedValue([]);
            (keycloakAdminService.setUserRoles as jest.Mock).mockResolvedValue(undefined);

            await systemController.claimSuperadmin(mockReq as RequestWithAuth, mockRes as Response);

            expect(keycloakAdminService.getUsersInRole).toHaveBeenCalledWith('superadmin');
            expect(keycloakAdminService.setUserRoles).toHaveBeenCalledWith('user-123', ["superadmin", "admin", "user"]);
            expect(jsonSpy).toHaveBeenCalledWith({
                success: true,
                message: "Successfully claimed superadmin access."
            });
        });

        it('should DENY claiming if system is already initialized', async () => {
            // Mock existing superadmin
            (keycloakAdminService.getUsersInRole as jest.Mock).mockResolvedValue([{ id: 'other-admin', username: 'admin' } as any]);

            await systemController.claimSuperadmin(mockReq as RequestWithAuth, mockRes as Response);

            expect(statusSpy).toHaveBeenCalledWith(403);
            expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: expect.stringContaining('System is already initialized')
            }));
            expect(keycloakAdminService.setUserRoles).not.toHaveBeenCalled();
        });

        it('should handle errors gracefully', async () => {
            // Mock error
            (keycloakAdminService.getUsersInRole as jest.Mock).mockRejectedValue(new Error('Keycloak failure'));

            await systemController.getStatus(mockReq as RequestWithAuth, mockRes as Response);

            expect(statusSpy).toHaveBeenCalledWith(500);
            expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({
                success: false
            }));
        });
    });
});
