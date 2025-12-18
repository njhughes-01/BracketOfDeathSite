import axios from 'axios';

interface EmailParams {
    to: string;
    subject: string;
    text: string;
    html: string;
}

class MailjetService {
    private apiKey: string;
    private apiSecret: string;
    private senderEmail: string;

    constructor() {
        // Defaults from env
        this.apiKey = process.env.MAILJET_API_KEY || '';
        this.apiSecret = process.env.MAILJET_API_SECRET || '';
        this.senderEmail = process.env.MAILJET_SENDER_EMAIL || 'noreply@bracketofdeath.com';
    }

    private async getConfig() {
        try {
            // Lazy load SystemSettings to avoid circular dependencies or connection issues at startup
            const SystemSettings = (await import('../models/SystemSettings')).default;
            const settings = await SystemSettings.findOne().select('+mailjetApiKey +mailjetApiSecret');

            if (settings && settings.mailjetApiKey && settings.mailjetApiSecret) {
                return {
                    apiKey: settings.mailjetApiKey,
                    apiSecret: settings.mailjetApiSecret,
                    senderEmail: settings.mailjetSenderEmail || this.senderEmail
                };
            }
        } catch (error) {
            console.warn('Failed to fetch system settings, falling back to env:', error);
        }

        return {
            apiKey: this.apiKey,
            apiSecret: this.apiSecret,
            senderEmail: this.senderEmail
        };
    }

    async sendEmail({ to, subject, text, html }: EmailParams): Promise<boolean> {
        const config = await this.getConfig();
        const isConfigured = !!(config.apiKey && config.apiSecret);

        if (!isConfigured) {
            console.log('--- MOCK EMAIL SEND ---');
            console.log(`To: ${to}`);
            console.log(`Subject: ${subject}`);
            console.log(`Text: ${text}`);
            console.log('-----------------------');
            return true;
        }

        try {
            const response = await axios.post(
                'https://api.mailjet.com/v3.1/send',
                {
                    Messages: [
                        {
                            From: {
                                Email: config.senderEmail,
                                Name: 'Bracket of Death',
                            },
                            To: [
                                {
                                    Email: to,
                                },
                            ],
                            Subject: subject,
                            TextPart: text,
                            HTMLPart: html,
                        },
                    ],
                },
                {
                    auth: {
                        username: config.apiKey,
                        password: config.apiSecret,
                    },
                }
            );

            return response.status === 200 || response.status === 201;
        } catch (error: any) {
            console.error('Mailjet send error:', error.response?.data || error.message);
            // Don't throw for user-facing actions if email fails, just log it. 
            // Or throw if critical. For now, let's catch and return false to be safe.
            return false;
        }
    }

    async sendClaimInvitation(email: string, token: string, playerName: string): Promise<boolean> {
        const claimLink = `${process.env.FRONTEND_URL || process.env.CORS_ORIGIN?.split(',')[0] || 'http://localhost:8080'}/register?claimToken=${token}`;

        return this.sendEmail({
            to: email,
            subject: 'Claim your Bracket of Death Profile',
            text: `Hello! You have been invited to claim your player profile (${playerName}) on Bracket of Death. Click here to register: ${claimLink}`,
            html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Claim your Player Profile</h2>
          <p>Hello!</p>
          <p>You have been invited to claim your player profile <strong>${playerName}</strong> on Bracket of Death.</p>
          <p>This will link your existing tournament limits and stats to your new account.</p>
          <p>
            <a href="${claimLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">
              Create Account & Claim Profile
            </a>
          </p>
          <p style="margin-top: 20px; font-size: 12px; color: #666;">
            Or copy this link: ${claimLink}
          </p>
        </div>
      `
        });
    }

    async sendPasswordReset(email: string, link: string): Promise<boolean> {
        return this.sendEmail({
            to: email,
            subject: 'Reset your Bracket of Death Password',
            text: `You requested a password reset. Click here to reset: ${link}`,
            html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Reset Password</h2>
          <p>You requested a password reset for your Bracket of Death account.</p>
          <p>
            <a href="${link}" style="background-color: #008CBA; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">
              Reset Password
            </a>
          </p>
          <p>If you didn't ask for this, you can ignore this email.</p>
        </div>
      `
        });
    }
}

export const mailjetService = new MailjetService();
export default mailjetService;
