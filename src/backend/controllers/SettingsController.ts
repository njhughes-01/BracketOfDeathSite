import { Response } from 'express';
import { RequestWithAuth } from './base';
import SystemSettings from '../models/SystemSettings';
import { ApiResponse } from '../types/common';
import mailjetService from '../services/MailjetService'; // We'll update this service to reload config

export class SettingsController {
    // Get current settings (masked)
    public getSettings = async (req: RequestWithAuth, res: Response) => {
        try {
            const settings = await SystemSettings.findOne();

            const response: ApiResponse = {
                success: true,
                data: {
                    // Mailjet config
                    mailjetConfigured: !!(settings?.mailjetApiKey && settings?.mailjetApiSecret),
                    mailjetSenderEmail: settings?.mailjetSenderEmail || '',
                    hasApiKey: !!settings?.mailjetApiKey,
                    hasApiSecret: !!settings?.mailjetApiSecret,
                    // Branding config
                    siteLogo: settings?.siteLogo || '',
                    siteLogoUrl: settings?.siteLogoUrl || '',
                    favicon: settings?.favicon || '',
                    brandName: settings?.brandName || 'Bracket of Death',
                    brandPrimaryColor: settings?.brandPrimaryColor || '#4CAF50',
                    brandSecondaryColor: settings?.brandSecondaryColor || '#008CBA',
                }
            };

            res.json(response);
        } catch (error) {
            console.error('Error fetching settings:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch settings' });
        }
    };

    // Update settings
    public updateSettings = async (req: RequestWithAuth, res: Response) => {
        try {
            const {
                mailjetApiKey, mailjetApiSecret, mailjetSenderEmail,
                siteLogo, siteLogoUrl, favicon, brandName, brandPrimaryColor, brandSecondaryColor
            } = req.body;

            if (!req.user?.isAdmin) {
                res.status(403).json({ success: false, error: 'Unauthorized' });
                return;
            }

            // Input validation
            const errors: string[] = [];

            // Validate hex colors (must be valid CSS hex color)
            const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
            if (brandPrimaryColor !== undefined && !hexColorRegex.test(brandPrimaryColor)) {
                errors.push('Invalid primary color format. Use hex format like #4CAF50');
            }
            if (brandSecondaryColor !== undefined && !hexColorRegex.test(brandSecondaryColor)) {
                errors.push('Invalid secondary color format. Use hex format like #008CBA');
            }

            // Validate base64 image sizes (max 500KB each)
            const maxBase64Size = 500 * 1024; // 500KB in bytes (base64 is ~33% larger than binary)
            if (siteLogo && siteLogo.length > maxBase64Size) {
                errors.push('Site logo exceeds 500KB limit');
            }
            if (favicon && favicon.length > maxBase64Size) {
                errors.push('Favicon exceeds 500KB limit');
            }

            // Validate base64 format for images
            const base64ImageRegex = /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,/;
            if (siteLogo && siteLogo.length > 0 && !base64ImageRegex.test(siteLogo)) {
                errors.push('Invalid logo format. Only PNG, JPEG, GIF, WebP, or SVG allowed');
            }
            if (favicon && favicon.length > 0 && !base64ImageRegex.test(favicon)) {
                errors.push('Invalid favicon format. Only PNG, JPEG, GIF, WebP, or SVG allowed');
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (mailjetSenderEmail !== undefined && mailjetSenderEmail.length > 0 && !emailRegex.test(mailjetSenderEmail)) {
                errors.push('Invalid sender email format');
            }

            // Validate brand name length and sanitize
            if (brandName !== undefined) {
                if (brandName.length > 100) {
                    errors.push('Brand name cannot exceed 100 characters');
                }
                if (typeof brandName !== 'string') {
                    errors.push('Brand name must be a string');
                }
            }

            // Validate URL format for logoUrl
            if (siteLogoUrl !== undefined && siteLogoUrl.length > 0) {
                try {
                    new URL(siteLogoUrl);
                } catch {
                    errors.push('Invalid logo URL format');
                }
            }

            if (errors.length > 0) {
                res.status(400).json({ success: false, error: errors.join('. ') });
                return;
            }

            let settings = await SystemSettings.findOne();
            if (!settings) {
                settings = new SystemSettings({ updatedBy: req.user.username });
            }

            // Sanitize text inputs by removing HTML tags (XSS prevention)
            const sanitizeText = (input: string): string => {
                if (!input) return input;
                return input.replace(/<[^>]*>/g, '').trim();
            };

            // Mailjet settings
            if (mailjetApiKey) settings.mailjetApiKey = mailjetApiKey;
            if (mailjetApiSecret) settings.mailjetApiSecret = mailjetApiSecret;
            if (mailjetSenderEmail !== undefined) settings.mailjetSenderEmail = mailjetSenderEmail;

            // Branding settings (sanitized)
            if (siteLogo !== undefined) settings.siteLogo = siteLogo;
            if (siteLogoUrl !== undefined) settings.siteLogoUrl = siteLogoUrl;
            if (favicon !== undefined) settings.favicon = favicon;
            if (brandName !== undefined) settings.brandName = sanitizeText(brandName);
            if (brandPrimaryColor !== undefined) settings.brandPrimaryColor = brandPrimaryColor;
            if (brandSecondaryColor !== undefined) settings.brandSecondaryColor = brandSecondaryColor;

            settings.updatedBy = req.user.username;
            await settings.save();

            res.json({ success: true, message: 'Settings updated successfully' });
        } catch (error) {
            console.error('Error updating settings:', error);
            res.status(500).json({ success: false, error: 'Failed to update settings' });
        }
    };

    // Test email configuration
    public testEmail = async (req: RequestWithAuth, res: Response) => {
        try {
            const { testEmail } = req.body;

            if (!testEmail) {
                res.status(400).json({ success: false, error: 'Test email address is required' });
                return;
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(testEmail)) {
                res.status(400).json({ success: false, error: 'Invalid email address format' });
                return;
            }

            const success = await mailjetService.sendTestEmail(testEmail);

            if (success) {
                res.json({ success: true, message: 'Test email sent successfully' });
            } else {
                res.status(500).json({ success: false, error: 'Failed to send test email. Check your Mailjet configuration.' });
            }
        } catch (error) {
            console.error('Error sending test email:', error);
            res.status(500).json({ success: false, error: 'Failed to send test email' });
        }
    };

    // Check if email is configured (public endpoint for banner)
    public isEmailConfigured = async (_req: RequestWithAuth, res: Response) => {
        try {
            const settings = await SystemSettings.findOne();
            const configured = !!(settings?.mailjetApiKey && settings?.mailjetApiSecret);
            res.json({ success: true, data: { configured } });
        } catch (error) {
            res.json({ success: true, data: { configured: false } });
        }
    };
}

export default new SettingsController();
