import { IEmailProvider, EmailParams, BrandingConfig } from "./email/IEmailProvider";
import { MailjetProvider } from "./email/MailjetProvider";
import { MailgunProvider } from "./email/MailgunProvider";
import SystemSettings from "../models/SystemSettings";

export interface EmailConfig extends BrandingConfig {
    activeProvider: "mailjet" | "mailgun";
}

export class EmailService {
    private fallbackProvider: IEmailProvider;

    // Defaults (from env)
    private defaultMailjetKey = process.env.MAILJET_API_KEY || "";
    private defaultMailjetSecret = process.env.MAILJET_API_SECRET || "";
    private defaultSenderEmail = process.env.MAILJET_SENDER_EMAIL || "noreply@bracketofdeath.com";

    private defaultMailgunKey = process.env.MAILGUN_API_KEY || "";
    private defaultMailgunDomain = process.env.MAILGUN_DOMAIN || "";

    constructor() {
        // Default fallback is Mailjet (legacy behavior)
        this.fallbackProvider = new MailjetProvider(
            this.defaultMailjetKey,
            this.defaultMailjetSecret
        );
    }

    private async getConfig(): Promise<EmailConfig & { provider: IEmailProvider }> {
        try {
            // Need to include new fields in selection
            const settings = await SystemSettings.findOne().select(
                "+mailjetApiKey +mailjetApiSecret +mailgunApiKey"
            );

            const activeProvider = settings?.activeProvider || "mailjet";

            let provider: IEmailProvider;

            if (activeProvider === "mailgun") {
                const apiKey = settings?.mailgunApiKey || this.defaultMailgunKey;
                const domain = settings?.mailgunDomain || this.defaultMailgunDomain;
                provider = new MailgunProvider(apiKey, domain);
            } else {
                // Default to Mailjet
                const apiKey = settings?.mailjetApiKey || this.defaultMailjetKey;
                const apiSecret = settings?.mailjetApiSecret || this.defaultMailjetSecret;
                provider = new MailjetProvider(apiKey, apiSecret);
            }

            return {
                activeProvider,
                provider,
                senderEmail: settings?.mailjetSenderEmail || this.defaultSenderEmail, // We might want a generic sender email field later
                siteLogo: settings?.siteLogo,
                siteLogoUrl: settings?.siteLogoUrl,
                brandName: settings?.brandName || "Bracket of Death",
                brandPrimaryColor: settings?.brandPrimaryColor || "#4CAF50",
                brandSecondaryColor: settings?.brandSecondaryColor || "#008CBA",
            };
        } catch (error) {
            console.warn("Failed to fetch system settings, falling back to env:", error);
            return {
                activeProvider: "mailjet",
                provider: this.fallbackProvider,
                senderEmail: this.defaultSenderEmail,
                brandName: "Bracket of Death",
                brandPrimaryColor: "#4CAF50",
                brandSecondaryColor: "#008CBA",
            };
        }
    }

    // Reuse the template builder logic
    private buildBrandedTemplate(
        content: string,
        config: BrandingConfig,
    ): string {
        const logoHtml =
            config.siteLogo || config.siteLogoUrl
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

    private createButton(text: string, href: string, color: string): string {
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

    async sendEmail(params: EmailParams): Promise<boolean> {
        const config = await this.getConfig();
        return config.provider.sendEmail(params, config);
    }

    async sendClaimInvitation(
        email: string,
        token: string,
        playerName: string,
    ): Promise<boolean> {
        const config = await this.getConfig();
        const claimLink = `${process.env.FRONTEND_URL || process.env.CORS_ORIGIN?.split(",")[0] || "http://localhost:8080"}/register?claimToken=${token}`;

        const content = `
            <h2 style="margin:0 0 20px 0;color:#1a1a2e;">Claim your Player Profile</h2>
            <p>Hello!</p>
            <p>You have been invited to claim your player profile <strong>${playerName}</strong> on ${config.brandName}.</p>
            <p>This will link your existing tournament history and stats to your new account.</p>
            ${this.createButton("Create Account & Claim Profile", claimLink, config.brandPrimaryColor)}
            <p style="margin-top:20px;font-size:12px;color:#888888;">Or copy this link: <a href="${claimLink}" style="color:${config.brandSecondaryColor};">${claimLink}</a></p>
        `;

        return this.sendEmail({
            to: email,
            subject: `Claim your ${config.brandName} Profile`,
            text: `Hello! You have been invited to claim your player profile (${playerName}) on ${config.brandName}. Click here to register: ${claimLink}`,
            html: this.buildBrandedTemplate(content, config),
        });
    }

    async sendPasswordReset(email: string, link: string): Promise<boolean> {
        const config = await this.getConfig();

        const content = `
            <h2 style="margin:0 0 20px 0;color:#1a1a2e;">Reset Password</h2>
            <p>You requested a password reset for your ${config.brandName} account.</p>
            ${this.createButton("Reset Password", link, config.brandSecondaryColor)}
            <p>If you didn't ask for this, you can ignore this email.</p>
        `;

        return this.sendEmail({
            to: email,
            subject: `Reset your ${config.brandName} Password`,
            text: `You requested a password reset. Click here to reset: ${link}`,
            html: this.buildBrandedTemplate(content, config),
        });
    }

    async sendTestEmail(email: string): Promise<boolean> {
        const config = await this.getConfig();
        const providerName = config.provider.getName();

        const content = `
            <h2 style="margin:0 0 20px 0;color:#1a1a2e;">🎾 Email Configuration Test</h2>
            <p>This is a test email from <strong>${config.brandName}</strong>.</p>
            <p>Sent using provider: <strong>${providerName}</strong></p>
            <p>If you received this, your email configuration is working correctly!</p>
            ${this.createButton("Visit Site", process.env.FRONTEND_URL || "http://localhost:8080", config.brandPrimaryColor)}
        `;

        return this.sendEmail({
            to: email,
            subject: `${config.brandName} - Test Email (${providerName})`,
            text: `This is a test email from ${config.brandName} via ${providerName}. If you received this, email configuration is working!`,
            html: this.buildBrandedTemplate(content, config),
        });
    }
}

export const emailService = new EmailService();
export default emailService;
