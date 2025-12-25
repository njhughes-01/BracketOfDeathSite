import axios from "axios";
import { IEmailProvider, EmailParams, BrandingConfig } from "./IEmailProvider";

interface MailjetConfig extends BrandingConfig {
    apiKey: string;
    apiSecret: string;
}

export class MailjetProvider implements IEmailProvider {
    private apiKey: string;
    private apiSecret: string;

    constructor(apiKey: string, apiSecret: string) {
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
    }

    getName(): string {
        return "mailjet";
    }

    async sendEmail(
        { to, subject, text, html }: EmailParams,
        config: BrandingConfig,
    ): Promise<boolean> {
        if (!this.apiKey || !this.apiSecret) {
            console.warn("Mailjet provider missing credentials");
            return false;
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
                { auth: { username: this.apiKey, password: this.apiSecret } },
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
}
