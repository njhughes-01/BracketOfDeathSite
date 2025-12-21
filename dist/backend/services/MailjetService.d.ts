interface EmailParams {
    to: string;
    subject: string;
    text: string;
    html: string;
}
declare class MailjetService {
    private apiKey;
    private apiSecret;
    private senderEmail;
    constructor();
    private getConfig;
    private buildBrandedTemplate;
    private createButton;
    sendEmail({ to, subject, text, html }: EmailParams): Promise<boolean>;
    sendClaimInvitation(email: string, token: string, playerName: string): Promise<boolean>;
    sendPasswordReset(email: string, link: string): Promise<boolean>;
    sendTestEmail(email: string): Promise<boolean>;
}
export declare const mailjetService: MailjetService;
export default mailjetService;
//# sourceMappingURL=MailjetService.d.ts.map