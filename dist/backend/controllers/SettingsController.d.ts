import { Response } from 'express';
import { RequestWithAuth } from './base';
export declare class SettingsController {
    getSettings: (req: RequestWithAuth, res: Response) => Promise<void>;
    updateSettings: (req: RequestWithAuth, res: Response) => Promise<void>;
    testEmail: (req: RequestWithAuth, res: Response) => Promise<void>;
    isEmailConfigured: (_req: RequestWithAuth, res: Response) => Promise<void>;
}
declare const _default: SettingsController;
export default _default;
//# sourceMappingURL=SettingsController.d.ts.map