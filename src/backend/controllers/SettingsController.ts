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

            let settings = await SystemSettings.findOne();
            if (!settings) {
                settings = new SystemSettings({ updatedBy: req.user.username });
            }

            // Mailjet settings
            if (mailjetApiKey) settings.mailjetApiKey = mailjetApiKey;
            if (mailjetApiSecret) settings.mailjetApiSecret = mailjetApiSecret;
            if (mailjetSenderEmail !== undefined) settings.mailjetSenderEmail = mailjetSenderEmail;

            // Branding settings
            if (siteLogo !== undefined) settings.siteLogo = siteLogo;
            if (siteLogoUrl !== undefined) settings.siteLogoUrl = siteLogoUrl;
            if (favicon !== undefined) settings.favicon = favicon;
            if (brandName !== undefined) settings.brandName = brandName;
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
