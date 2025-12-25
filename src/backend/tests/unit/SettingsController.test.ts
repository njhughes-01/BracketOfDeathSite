import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Request, Response } from 'express';
import { SettingsController } from '../../controllers/SettingsController';
import SystemSettings from '../../models/SystemSettings';
import emailService from '../../services/EmailService';

// Mock dependencies
vi.mock('../../models/SystemSettings');
vi.mock('../../services/EmailService');

describe('SettingsController', () => {
  let controller: SettingsController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    controller = new SettingsController();
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });

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
    vi.clearAllMocks();
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

      (SystemSettings.findOne as any) = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue(mockSettings),
      });

      await controller.getSettings(mockReq as any, mockRes as any);

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
      (SystemSettings.findOne as any) = vi.fn().mockReturnValue({
        select: vi.fn().mockRejectedValue(new Error('Database error')),
      });

      await controller.getSettings(mockReq as any, mockRes as any);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Failed to fetch settings',
        })
      );
    });
  });

  describe('testEmail', () => {
    it('should send test email successfully', async () => {
      mockReq.body = { testEmail: 'test@example.com' };
      (emailService.sendTestEmail as any) = vi.fn().mockResolvedValue(true);

      await controller.testEmail(mockReq as any, mockRes as any);

      expect(emailService.sendTestEmail).toHaveBeenCalledWith('test@example.com');
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Test email sent successfully',
        })
      );
    });

    it('should reject invalid email addresses', async () => {
      mockReq.body = { testEmail: 'invalid-email' };

      await controller.testEmail(mockReq as any, mockRes as any);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid email address format',
        })
      );
    });

    it('should require test email parameter', async () => {
      mockReq.body = {};

      await controller.testEmail(mockReq as any, mockRes as any);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Test email address is required',
        })
      );
    });

    it('should handle email send failures', async () => {
      mockReq.body = { testEmail: 'test@example.com' };
      (emailService.sendTestEmail as any) = vi.fn().mockResolvedValue(false);

      await controller.testEmail(mockReq as any, mockRes as any);

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
      (emailService.verifyProvider as any) = vi.fn().mockResolvedValue(true);

      await controller.verifyCredentials(mockReq as any, mockRes as any);

      expect(emailService.verifyProvider).toHaveBeenCalledWith('mailjet', mockReq.body);
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
      (emailService.verifyProvider as any) = vi.fn().mockResolvedValue(true);

      await controller.verifyCredentials(mockReq as any, mockRes as any);

      expect(emailService.verifyProvider).toHaveBeenCalledWith('mailgun', mockReq.body);
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

      await controller.verifyCredentials(mockReq as any, mockRes as any);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid provider',
        })
      );
    });

    it('should handle verification failures', async () => {
      mockReq.body = {
        provider: 'mailjet',
        mailjetApiKey: 'invalid-key',
        mailjetApiSecret: 'invalid-secret',
      };
      (emailService.verifyProvider as any) = vi.fn().mockResolvedValue(false);

      await controller.verifyCredentials(mockReq as any, mockRes as any);

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
        save: vi.fn().mockResolvedValue(true),
        brandName: 'New Brand',
        brandPrimaryColor: '#FF0000',
        updatedBy: 'testuser',
      };

      (SystemSettings.findOne as any) = vi.fn().mockResolvedValue(mockSettings);

      await controller.updateSettings(mockReq as any, mockRes as any);

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
        save: vi.fn().mockResolvedValue(true),
        activeProvider: 'mailgun',
        mailgunApiKey: 'new-key',
        mailgunDomain: 'mg.newdomain.com',
        senderEmail: 'noreply@newdomain.com',
        updatedBy: 'testuser',
      };

      (SystemSettings.findOne as any) = vi.fn().mockResolvedValue(mockSettings);

      await controller.updateSettings(mockReq as any, mockRes as any);

      expect(mockSettings.save).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Settings updated successfully',
        })
      );
    });

    it('should reject non-admin users', async () => {
      mockReq.user!.isAdmin = false;

      await controller.updateSettings(mockReq as any, mockRes as any);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Unauthorized',
        })
      );
    });

    it('should validate color formats', async () => {
      mockReq.body = {
        brandPrimaryColor: 'invalid-color',
      };

      const mockSettings = {
        save: vi.fn(),
      };

      (SystemSettings.findOne as any) = vi.fn().mockResolvedValue(mockSettings);

      await controller.updateSettings(mockReq as any, mockRes as any);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Invalid primary color format'),
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

      (SystemSettings.findOne as any) = vi.fn().mockResolvedValue(mockSettings);

      await controller.isEmailConfigured(mockReq as any, mockRes as any);

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

      (SystemSettings.findOne as any) = vi.fn().mockResolvedValue(mockSettings);

      await controller.isEmailConfigured(mockReq as any, mockRes as any);

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

      (SystemSettings.findOne as any) = vi.fn().mockResolvedValue(mockSettings);

      await controller.isEmailConfigured(mockReq as any, mockRes as any);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { configured: false },
        })
      );
    });

    it('should handle errors gracefully', async () => {
      (SystemSettings.findOne as any) = vi.fn().mockRejectedValue(new Error('DB error'));

      await controller.isEmailConfigured(mockReq as any, mockRes as any);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { configured: false },
        })
      );
    });
  });
});
