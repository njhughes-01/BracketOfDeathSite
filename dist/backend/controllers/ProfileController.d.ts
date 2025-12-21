import { Response } from 'express';
import { RequestWithAuth } from './base';
declare class ProfileController {
    private handleError;
    getProfile(req: RequestWithAuth, res: Response): Promise<void>;
    updateProfile(req: RequestWithAuth, res: Response): Promise<void>;
    changePassword(req: RequestWithAuth, res: Response): Promise<void>;
}
declare const _default: ProfileController;
export default _default;
//# sourceMappingURL=ProfileController.d.ts.map