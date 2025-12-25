import axios from "axios";

interface EmailParams {
  to: string;
  subject: string;
  text: string;
  html: string;
}

interface BrandingConfig {
  siteLogo?: string;
  siteLogoUrl?: string;
  brandName: string;
  brandPrimaryColor: string;
  brandSecondaryColor: string;
  senderEmail: string;
}

interface EmailConfig extends BrandingConfig {
  apiKey: string;
  apiSecret: string;
}

class MailjetService {
  private apiKey: string;
  private apiSecret: string;
  private senderEmail: string;

  constructor() {
    this.apiKey = process.env.MAILJET_API_KEY || "";
    this.apiSecret = process.env.MAILJET_API_SECRET || "";
    this.senderEmail =
      process.env.MAILJET_SENDER_EMAIL || "noreply@bracketofdeath.com";
  }

  private async getConfig(): Promise<EmailConfig> {
    try {
      const SystemSettings = (await import("../models/SystemSettings")).default;
      const settings = await SystemSettings.findOne().select(
        "+mailjetApiKey +mailjetApiSecret",
      );

      return {
        apiKey: settings?.mailjetApiKey || this.apiKey,
        apiSecret: settings?.mailjetApiSecret || this.apiSecret,
        senderEmail: settings?.mailjetSenderEmail || this.senderEmail,
        siteLogo: settings?.siteLogo,
        siteLogoUrl: settings?.siteLogoUrl,
        brandName: settings?.brandName || "Bracket of Death",
        brandPrimaryColor: settings?.brandPrimaryColor || "#4CAF50",
        brandSecondaryColor: settings?.brandSecondaryColor || "#008CBA",
      };
    } catch (error) {
      console.warn(
        "Failed to fetch system settings, falling back to env:",
        error,
      );
      return {
        apiKey: this.apiKey,
        apiSecret: this.apiSecret,
        senderEmail: this.senderEmail,
        brandName: "Bracket of Death",
        brandPrimaryColor: "#4CAF50",
        brandSecondaryColor: "#008CBA",
      };
    }
  }

  // Build email-client compatible branded template using tables
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

  // Generate button HTML compatible with most email clients
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

  async sendEmail({ to, subject, text, html }: EmailParams): Promise<boolean> {
    const config = await this.getConfig();
    const isConfigured = !!(config.apiKey && config.apiSecret);

    if (!isConfigured) {
      console.log("--- EMAIL NOT CONFIGURED ---");
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log("Email would be sent if Mailjet was configured.");
      console.log("----------------------------");
      return false; // Return false since email wasn't actually sent
    }

    try {
      const response = await axios.post(
        "https://api.mailjet.com/v3.1/send",
        {
          Messages: [
            {
              From: { Email: config.senderEmail, Name: config.brandName },
              To: [{ Email: to }],
              Subject: subject,
              TextPart: text,
              HTMLPart: html,
            },
          ],
        },
        { auth: { username: config.apiKey, password: config.apiSecret } },
      );
      return response.status === 200 || response.status === 201;
    } catch (error: any) {
      console.error(
        "Mailjet send error:",
        error.response?.data || error.message,
      );
      return false;
    }
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

    const content = `
            <h2 style="margin:0 0 20px 0;color:#1a1a2e;">🎾 Email Configuration Test</h2>
            <p>This is a test email from <strong>${config.brandName}</strong>.</p>
            <p>If you received this, your email configuration is working correctly!</p>
            ${this.createButton("Visit Site", process.env.FRONTEND_URL || "http://localhost:8080", config.brandPrimaryColor)}
        `;

    return this.sendEmail({
      to: email,
      subject: `${config.brandName} - Test Email`,
      text: `This is a test email from ${config.brandName}. If you received this, email configuration is working!`,
      html: this.buildBrandedTemplate(content, config),
    });
  }
}

export const mailjetService = new MailjetService();
export default mailjetService;
