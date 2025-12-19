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
                    mailjetConfigured: !!(settings?.mailjetApiKey && settings?.mailjetApiSecret),
                    mailjetSenderEmail: settings?.mailjetSenderEmail || '',
                    // Never return actual keys
                    hasApiKey: !!settings?.mailjetApiKey,
                    hasApiSecret: !!settings?.mailjetApiSecret
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
            const { mailjetApiKey, mailjetApiSecret, mailjetSenderEmail } = req.body;

            if (!req.user?.isAdmin) { // Double check, though middleware should handle it
                res.status(403).json({ success: false, error: 'Unauthorized' });
                return;
            }

            let settings = await SystemSettings.findOne();
            if (!settings) {
                settings = new SystemSettings({ updatedBy: req.user.username });
            }

            if (mailjetApiKey) settings.mailjetApiKey = mailjetApiKey;
            if (mailjetApiSecret) settings.mailjetApiSecret = mailjetApiSecret;
            if (mailjetSenderEmail) settings.mailjetSenderEmail = mailjetSenderEmail;

            settings.updatedBy = req.user.username;

            await settings.save();

            // Trigger service reload if needed, or just let it fetch on demand
            // valid implementation: MailjetService reads from DB on every send or has a reload method.
            // For now, next request to MailjetService will read the DB.

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

            const success = await mailjetService.sendEmail({
                to: testEmail,
                subject: 'Bracket of Death - Test Email',
                text: 'This is a test email from Bracket of Death. If you received this, email configuration is working!',
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px;">
                        <h2>🎾 Email Configuration Test</h2>
                        <p>This is a test email from <strong>Bracket of Death</strong>.</p>
                        <p>If you received this, your email configuration is working correctly!</p>
                    </div>
                `
            });

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
