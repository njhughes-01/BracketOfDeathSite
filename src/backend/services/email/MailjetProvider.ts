import axios from "axios";
import logger from "../../utils/logger";
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

    async verifyCredentials(): Promise<boolean> {
        if (!this.apiKey || !this.apiSecret) return false;
        try {
            const response = await axios.get(
                "https://api.mailjet.com/v3.1/sender",
                {
                    auth: { username: this.apiKey, password: this.apiSecret },
                    params: { Limit: 1 }
                }
            );
            return response.status === 200;
        } catch (error) {
            logger.error("Mailjet verification failed:", error);
            return false;
        }
    }

    async sendEmail(
        { to, subject, text, html }: EmailParams,
        config: BrandingConfig,
    ): Promise<boolean> {
        if (!this.apiKey || !this.apiSecret) {
            logger.warn("Mailjet provider missing credentials");
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
            logger.error(
                "Mailjet send error:",
                error.response?.data || error.message,
            );
            return false;
        }
    }
}
