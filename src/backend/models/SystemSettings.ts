import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemSettings extends Document {
    mailjetApiKey?: string;
    mailjetApiSecret?: string;
    mailjetSenderEmail?: string;
    updatedAt: Date;
    updatedBy: string;
}

const SystemSettingsSchema: Schema = new Schema({
    mailjetApiKey: { type: String, select: false }, // Hide by default
    mailjetApiSecret: { type: String, select: false }, // Hide by default
    mailjetSenderEmail: { type: String },
    updatedBy: { type: String, required: true },
}, { timestamps: true });

// Ensure only one settings document exists
SystemSettingsSchema.statics.getInstance = async function () {
    const settings = await this.findOne();
    return settings || new this({ updatedBy: 'system' });
};

export default mongoose.model<ISystemSettings>('SystemSettings', SystemSettingsSchema);
