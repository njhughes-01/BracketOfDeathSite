import { Request, Response } from 'express';
import { SettingsController } from '../../controllers/SettingsController';
import SystemSettings from '../../models/SystemSettings';
import emailService from '../../services/EmailService';

// Mock dependencies
jest.mock('../../models/SystemSettings');
jest.mock('../../services/EmailService');

describe('SettingsController', () => {
  let controller: SettingsController;
  let mockReq: any;
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let nextMock: jest.Mock;

  beforeEach(() => {
    controller = new SettingsController();
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    nextMock = jest.fn();

    mockReq = {
      user: {
        id: 'test-user-id',
        username: 'testuser',
        email: 'test@example.com',
        isAdmin: true,
        isSuperAdmin: true,
      },
      body: {},
    };

    mockRes = {
      json: jsonMock,
      status: statusMock,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSettings', () => {
    it('should return masked settings', async () => {
      const mockSettings = {
        activeProvider: 'mailjet',
        mailjetApiKey: 'secret-key',
        mailjetApiSecret: 'secret-secret',
        mailgunApiKey: 'mg-secret',
        mailgunDomain: 'mg.example.com',
        senderEmail: 'test@example.com',
        brandName: 'Test Brand',
        brandPrimaryColor: '#4CAF50',
        brandSecondaryColor: '#008CBA',
      };

      (SystemSettings.findOne as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockSettings),
      });

      await controller.getSettings(mockReq as Request, mockRes as Response, nextMock);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            activeProvider: 'mailjet',
            hasApiKey: true,
            hasApiSecret: true,
            hasMailgunApiKey: true,
            mailgunDomain: 'mg.example.com',
          }),
        })
      );
    });

    it('should handle errors gracefully', async () => {
      (SystemSettings.findOne as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      await controller.getSettings(mockReq as Request, mockRes as Response, nextMock);
      expect(nextMock).toHaveBeenCalledWith(expect.any(Error));
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('testEmail', () => {
    it('should send test email successfully', async () => {
      mockReq.body = { testEmail: 'test@example.com' };
      (emailService.sendTestEmail as jest.Mock) = jest.fn().mockResolvedValue(true);

      await controller.testEmail(mockReq as Request, mockRes as Response, nextMock);

      // Now expects config object as second parameter
      expect(emailService.sendTestEmail).toHaveBeenCalledWith('test@example.com', expect.any(Object));
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Test email sent successfully',
        })
      );
    });

    it('should reject invalid email addresses', async () => {
      mockReq.body = { testEmail: 'invalid-email' };

      await controller.testEmail(mockReq as Request, mockRes as Response, nextMock);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation failed',
          errors: expect.arrayContaining(['Invalid email address format']),
        })
      );
    });

    it('should require test email parameter', async () => {
      mockReq.body = {};

      await controller.testEmail(mockReq as Request, mockRes as Response, nextMock);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation failed',
          errors: expect.arrayContaining(['Test email address is required']),
        })
      );
    });

    it('should handle email send failures', async () => {
      mockReq.body = { testEmail: 'test@example.com' };
      (emailService.sendTestEmail as jest.Mock) = jest.fn().mockResolvedValue(false);

      await controller.testEmail(mockReq as Request, mockRes as Response, nextMock);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Failed to send test email'),
        })
      );
    });
  });

  describe('verifyCredentials', () => {
    it('should verify Mailjet credentials successfully', async () => {
      mockReq.body = {
        provider: 'mailjet',
        mailjetApiKey: 'test-key',
        mailjetApiSecret: 'test-secret',
      };
      (emailService.verifyProvider as jest.Mock) = jest.fn().mockResolvedValue(true);

      await controller.verifyCredentials(mockReq as Request, mockRes as Response, nextMock);

      // Controller destructures provider out before calling verifyProvider
      expect(emailService.verifyProvider).toHaveBeenCalledWith('mailjet', {
        mailjetApiKey: 'test-key',
        mailjetApiSecret: 'test-secret',
      });
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Credentials verified successfully',
        })
      );
    });

    it('should verify Mailgun credentials successfully', async () => {
      mockReq.body = {
        provider: 'mailgun',
        mailgunApiKey: 'test-key',
        mailgunDomain: 'mg.example.com',
      };
      (emailService.verifyProvider as jest.Mock) = jest.fn().mockResolvedValue(true);

      await controller.verifyCredentials(mockReq as Request, mockRes as Response, nextMock);

      // Controller destructures provider out before calling verifyProvider
      expect(emailService.verifyProvider).toHaveBeenCalledWith('mailgun', {
        mailgunApiKey: 'test-key',
        mailgunDomain: 'mg.example.com',
      });
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Credentials verified successfully',
        })
      );
    });

    it('should reject invalid provider', async () => {
      mockReq.body = {
        provider: 'invalid-provider',
      };

      await controller.verifyCredentials(mockReq as Request, mockRes as Response, nextMock);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation failed',
          errors: expect.arrayContaining(['Invalid provider']),
        })
      );
    });

    it('should handle verification failures', async () => {
      mockReq.body = {
        provider: 'mailjet',
        mailjetApiKey: 'invalid-key',
        mailjetApiSecret: 'invalid-secret',
      };
      (emailService.verifyProvider as jest.Mock) = jest.fn().mockResolvedValue(false);

      await controller.verifyCredentials(mockReq as Request, mockRes as Response, nextMock);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Verification failed'),
        })
      );
    });
  });

  describe('updateSettings', () => {
    it('should update settings successfully without email credentials', async () => {
      mockReq.body = {
        brandName: 'New Brand',
        brandPrimaryColor: '#FF0000',
      };

      const mockSettings = {
        save: jest.fn().mockResolvedValue(true),
        brandName: 'New Brand',
        brandPrimaryColor: '#FF0000',
        updatedBy: 'testuser',
      };

      (SystemSettings.findOne as jest.Mock) = jest.fn().mockResolvedValue(mockSettings);

      await controller.updateSettings(mockReq as Request, mockRes as Response, nextMock);

      expect(mockSettings.save).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Settings updated successfully',
        })
      );
    });

    it('should update email settings successfully', async () => {
      mockReq.body = {
        activeProvider: 'mailgun',
        mailgunApiKey: 'new-key',
        mailgunDomain: 'mg.newdomain.com',
        senderEmail: 'noreply@newdomain.com',
      };

      const mockSettings = {
        save: jest.fn().mockResolvedValue(true),
        activeProvider: 'mailgun',
        mailgunApiKey: 'new-key',
        mailgunDomain: 'mg.newdomain.com',
        senderEmail: 'noreply@newdomain.com',
        updatedBy: 'testuser',
      };

      (SystemSettings.findOne as jest.Mock) = jest.fn().mockResolvedValue(mockSettings);

      await controller.updateSettings(mockReq as Request, mockRes as Response, nextMock);

      expect(mockSettings.save).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Settings updated successfully',
        })
      );
    });

    it('should reject non-admin users', async () => {
      mockReq.user.isAdmin = false;

      await controller.updateSettings(mockReq as Request, mockRes as Response, nextMock);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Administrative privileges required',
        })
      );
    });

    it('should validate color formats', async () => {
      mockReq.body = {
        brandPrimaryColor: 'invalid-color',
      };

      const mockSettings = {
        save: jest.fn(),
      };

      (SystemSettings.findOne as jest.Mock) = jest.fn().mockResolvedValue(mockSettings);

      await controller.updateSettings(mockReq as Request, mockRes as Response, nextMock);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation failed',
          errors: expect.arrayContaining([
            expect.stringContaining('Invalid primary color format'),
          ]),
        })
      );
    });
  });

  describe('isEmailConfigured', () => {
    it('should return true when Mailjet is configured', async () => {
      const mockSettings = {
        activeProvider: 'mailjet',
        mailjetApiKey: 'key',
        mailjetApiSecret: 'secret',
      };

      (SystemSettings.findOne as jest.Mock) = jest.fn().mockResolvedValue(mockSettings);

      await controller.isEmailConfigured(mockReq as Request, mockRes as Response, nextMock);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { configured: true },
        })
      );
    });

    it('should return true when Mailgun is configured', async () => {
      const mockSettings = {
        activeProvider: 'mailgun',
        mailgunApiKey: 'key',
        mailgunDomain: 'mg.example.com',
      };

      (SystemSettings.findOne as jest.Mock) = jest.fn().mockResolvedValue(mockSettings);

      await controller.isEmailConfigured(mockReq as Request, mockRes as Response, nextMock);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { configured: true },
        })
      );
    });

    it('should return false when no provider is configured', async () => {
      const mockSettings = {
        activeProvider: 'mailjet',
        // No keys set
      };

      (SystemSettings.findOne as jest.Mock) = jest.fn().mockResolvedValue(mockSettings);

      await controller.isEmailConfigured(mockReq as Request, mockRes as Response, nextMock);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { configured: false },
        })
      );
    });

    it('should handle errors gracefully', async () => {
      (SystemSettings.findOne as jest.Mock) = jest.fn().mockRejectedValue(new Error('DB error'));

      await controller.isEmailConfigured(mockReq as Request, mockRes as Response, nextMock);
      expect(nextMock).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
