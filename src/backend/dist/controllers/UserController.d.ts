import { Response } from 'express';
import { RequestWithAuth } from './base';
declare class UserController {
    protected handleError(res: Response, error: any, message: string): void;
    getUsers(req: RequestWithAuth, res: Response): Promise<void>;
    getUser(req: RequestWithAuth, res: Response): Promise<void>;
    createUser(req: RequestWithAuth, res: Response): Promise<void>;
    updateUser(req: RequestWithAuth, res: Response): Promise<void>;
    deleteUser(req: RequestWithAuth, res: Response): Promise<void>;
    resetPassword(req: RequestWithAuth, res: Response): Promise<void>;
    updateUserRoles(req: RequestWithAuth, res: Response): Promise<void>;
    getAvailableRoles(req: RequestWithAuth, res: Response): Promise<void>;
    linkPlayerToSelf(req: RequestWithAuth, res: Response): Promise<void>;
    claimUser(req: RequestWithAuth, res: Response): Promise<void>;
    register(req: RequestWithAuth, res: Response): Promise<void>;
    publicRequestPasswordReset(req: RequestWithAuth, res: Response): Promise<void>;
    private validateCreateUser;
    private validateUpdateUser;
}
export default UserController;
//# sourceMappingURL=UserController.d.ts.map