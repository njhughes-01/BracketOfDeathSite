import FormData from "form-data";
import Mailgun from "mailgun.js";
import { IEmailProvider, EmailParams, BrandingConfig } from "./IEmailProvider";

export class MailgunProvider implements IEmailProvider {
    private client: Interfaces.IMailgunClient;
    private domain: string;

    constructor(apiKey: string, domain: string, username: string = "api") {
        const mailgun = new Mailgun(FormData);
        this.client = mailgun.client({ username, key: apiKey });
        this.domain = domain;
    }

    getName(): string {
        return "mailgun";
    }

    async sendEmail(
        { to, subject, text, html }: EmailParams,
        config: BrandingConfig,
    ): Promise<boolean> {
        if (!this.client || !this.domain) {
            console.warn("Mailgun provider missing configuration");
            return false;
        }

        try {
            const messageData = {
                from: `${config.brandName} <${config.senderEmail}>`,
                to: to,
                subject: subject,
                text: text,
                html: html,
            };

            await this.client.messages.create(this.domain, messageData);
            return true;
        } catch (error: any) {
            console.error("Mailgun send error:", error);
            return false;
        }
    }
}
