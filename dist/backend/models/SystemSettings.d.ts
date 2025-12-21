import mongoose, { Document } from 'mongoose';
export interface ISystemSettings extends Document {
    mailjetApiKey?: string;
    mailjetApiSecret?: string;
    mailjetSenderEmail?: string;
    siteLogo?: string;
    siteLogoUrl?: string;
    favicon?: string;
    brandName?: string;
    brandPrimaryColor?: string;
    brandSecondaryColor?: string;
    updatedAt: Date;
    updatedBy: string;
}
declare const _default: mongoose.Model<ISystemSettings, {}, {}, {}, mongoose.Document<unknown, {}, ISystemSettings, {}> & ISystemSettings & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=SystemSettings.d.ts.map