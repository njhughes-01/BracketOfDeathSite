"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mailjetService = void 0;
const axios_1 = __importDefault(require("axios"));
class MailjetService {
    apiKey;
    apiSecret;
    senderEmail;
    constructor() {
        this.apiKey = process.env.MAILJET_API_KEY || '';
        this.apiSecret = process.env.MAILJET_API_SECRET || '';
        this.senderEmail = process.env.MAILJET_SENDER_EMAIL || 'noreply@bracketofdeath.com';
    }
    async getConfig() {
        try {
            const SystemSettings = (await Promise.resolve().then(() => __importStar(require('../models/SystemSettings')))).default;
            const settings = await SystemSettings.findOne().select('+mailjetApiKey +mailjetApiSecret');
            return {
                apiKey: settings?.mailjetApiKey || this.apiKey,
                apiSecret: settings?.mailjetApiSecret || this.apiSecret,
                senderEmail: settings?.mailjetSenderEmail || this.senderEmail,
                siteLogo: settings?.siteLogo,
                siteLogoUrl: settings?.siteLogoUrl,
                brandName: settings?.brandName || 'Bracket of Death',
                brandPrimaryColor: settings?.brandPrimaryColor || '#4CAF50',
                brandSecondaryColor: settings?.brandSecondaryColor || '#008CBA',
            };
        }
        catch (error) {
            console.warn('Failed to fetch system settings, falling back to env:', error);
            return {
                apiKey: this.apiKey,
                apiSecret: this.apiSecret,
                senderEmail: this.senderEmail,
                brandName: 'Bracket of Death',
                brandPrimaryColor: '#4CAF50',
                brandSecondaryColor: '#008CBA',
            };
        }
    }
    buildBrandedTemplate(content, config) {
        const logoHtml = config.siteLogo || config.siteLogoUrl
            ? `<img src="${config.siteLogo || config.siteLogoUrl}" alt="${config.brandName}" style="height:50px;width:auto;display:block;" />`
            : `<span style="font-size:24px;font-weight:bold;color:${config.brandPrimaryColor};">${config.brandName}</span>`;
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.brandName}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f4f4f4;">
        <tr>
            <td align="center" style="padding:20px 0;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background-color:#1a1a2e;padding:20px;text-align:center;">
                            ${logoHtml}
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding:30px;color:#333333;line-height:1.6;">
                            ${content}
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#f8f9fa;padding:20px;text-align:center;border-top:1px solid #eeeeee;">
                            <p style="margin:0;font-size:12px;color:#888888;">
                                &copy; ${new Date().getFullYear()} ${config.brandName}. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
    }
    createButton(text, href, color) {
        return `
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:15px 0;">
                <tr>
                    <td style="background-color:${color};border-radius:5px;">
                        <a href="${href}" target="_blank" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;">
                            ${text}
                        </a>
                    </td>
                </tr>
            </table>`;
    }
    async sendEmail({ to, subject, text, html }) {
        const config = await this.getConfig();
        const isConfigured = !!(config.apiKey && config.apiSecret);
        if (!isConfigured) {
            console.log('--- EMAIL NOT CONFIGURED ---');
            console.log(`To: ${to}`);
            console.log(`Subject: ${subject}`);
            console.log('Email would be sent if Mailjet was configured.');
            console.log('----------------------------');
            return false;
        }
        try {
            const response = await axios_1.default.post('https://api.mailjet.com/v3.1/send', {
                Messages: [{
                        From: { Email: config.senderEmail, Name: config.brandName },
                        To: [{ Email: to }],
                        Subject: subject,
                        TextPart: text,
                        HTMLPart: html,
                    }],
            }, { auth: { username: config.apiKey, password: config.apiSecret } });
            return response.status === 200 || response.status === 201;
        }
        catch (error) {
            console.error('Mailjet send error:', error.response?.data || error.message);
            return false;
        }
    }
    async sendClaimInvitation(email, token, playerName) {
        const config = await this.getConfig();
        const claimLink = `${process.env.FRONTEND_URL || process.env.CORS_ORIGIN?.split(',')[0] || 'http://localhost:8080'}/register?claimToken=${token}`;
        const content = `
            <h2 style="margin:0 0 20px 0;color:#1a1a2e;">Claim your Player Profile</h2>
            <p>Hello!</p>
            <p>You have been invited to claim your player profile <strong>${playerName}</strong> on ${config.brandName}.</p>
            <p>This will link your existing tournament history and stats to your new account.</p>
            ${this.createButton('Create Account & Claim Profile', claimLink, config.brandPrimaryColor)}
            <p style="margin-top:20px;font-size:12px;color:#888888;">Or copy this link: <a href="${claimLink}" style="color:${config.brandSecondaryColor};">${claimLink}</a></p>
        `;
        return this.sendEmail({
            to: email,
            subject: `Claim your ${config.brandName} Profile`,
            text: `Hello! You have been invited to claim your player profile (${playerName}) on ${config.brandName}. Click here to register: ${claimLink}`,
            html: this.buildBrandedTemplate(content, config),
        });
    }
    async sendPasswordReset(email, link) {
        const config = await this.getConfig();
        const content = `
            <h2 style="margin:0 0 20px 0;color:#1a1a2e;">Reset Password</h2>
            <p>You requested a password reset for your ${config.brandName} account.</p>
            ${this.createButton('Reset Password', link, config.brandSecondaryColor)}
            <p>If you didn't ask for this, you can ignore this email.</p>
        `;
        return this.sendEmail({
            to: email,
            subject: `Reset your ${config.brandName} Password`,
            text: `You requested a password reset. Click here to reset: ${link}`,
            html: this.buildBrandedTemplate(content, config),
        });
    }
    async sendTestEmail(email) {
        const config = await this.getConfig();
        const content = `
            <h2 style="margin:0 0 20px 0;color:#1a1a2e;">🎾 Email Configuration Test</h2>
            <p>This is a test email from <strong>${config.brandName}</strong>.</p>
            <p>If you received this, your email configuration is working correctly!</p>
            ${this.createButton('Visit Site', process.env.FRONTEND_URL || 'http://localhost:8080', config.brandPrimaryColor)}
        `;
        return this.sendEmail({
            to: email,
            subject: `${config.brandName} - Test Email`,
            text: `This is a test email from ${config.brandName}. If you received this, email configuration is working!`,
            html: this.buildBrandedTemplate(content, config),
        });
    }
}
exports.mailjetService = new MailjetService();
exports.default = exports.mailjetService;
//# sourceMappingURL=MailjetService.js.map