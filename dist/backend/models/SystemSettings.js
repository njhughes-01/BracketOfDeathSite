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
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const SystemSettingsSchema = new mongoose_1.Schema({
    mailjetApiKey: { type: String, select: false },
    mailjetApiSecret: { type: String, select: false },
    mailjetSenderEmail: { type: String },
    siteLogo: { type: String },
    siteLogoUrl: { type: String },
    favicon: { type: String },
    brandName: { type: String, default: 'Bracket of Death' },
    brandPrimaryColor: { type: String, default: '#4CAF50' },
    brandSecondaryColor: { type: String, default: '#008CBA' },
    updatedBy: { type: String, required: true },
}, { timestamps: true });
SystemSettingsSchema.statics.getInstance = async function () {
    const settings = await this.findOne();
    return settings || new this({ updatedBy: 'system' });
};
exports.default = mongoose_1.default.model('SystemSettings', SystemSettingsSchema);
//# sourceMappingURL=SystemSettings.js.map