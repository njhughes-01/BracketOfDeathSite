export interface EmailParams {
    to: string;
    subject: string;
    text: string;
    html: string;
}

export const SUPPORTED_EMAIL_PROVIDERS = ["mailjet", "mailgun"] as const;
export type EmailProviderType = typeof SUPPORTED_EMAIL_PROVIDERS[number];

export interface BrandingConfig {
    siteLogo?: string;
    siteLogoUrl?: string;
    brandName: string;
    brandPrimaryColor: string;
    brandSecondaryColor: string;
    senderEmail: string;
}

export interface IEmailProvider {
    /**
     * Send a raw email
     */
    sendEmail(params: EmailParams, config: BrandingConfig): Promise<boolean>;

    /**
     * Get provider name for logging/debugging
     */
    getName(): string;

    /**
     * Verify credentials are valid (e.g. by making a lightweight API call)
     */
    verifyCredentials(): Promise<boolean>;
}
