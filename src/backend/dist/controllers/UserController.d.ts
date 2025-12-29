import { Response } from "express";
import { RequestWithAuth, BaseController } from "./base";
declare class UserController extends BaseController {
    getUsers: (req: import("express").Request | RequestWithAuth, res: Response, next: import("express").NextFunction) => Promise<void>;
    getUser: (req: import("express").Request | RequestWithAuth, res: Response, next: import("express").NextFunction) => Promise<void>;
    createUser: (req: import("express").Request | RequestWithAuth, res: Response, next: import("express").NextFunction) => Promise<void>;
    updateUser: (req: import("express").Request | RequestWithAuth, res: Response, next: import("express").NextFunction) => Promise<void>;
    deleteUser: (req: import("express").Request | RequestWithAuth, res: Response, next: import("express").NextFunction) => Promise<void>;
    resetPassword: (req: import("express").Request | RequestWithAuth, res: Response, next: import("express").NextFunction) => Promise<void>;
    updateUserRoles: (req: import("express").Request | RequestWithAuth, res: Response, next: import("express").NextFunction) => Promise<void>;
    getAvailableRoles: (req: import("express").Request | RequestWithAuth, res: Response, next: import("express").NextFunction) => Promise<void>;
    linkPlayerToSelf: (req: import("express").Request | RequestWithAuth, res: Response, next: import("express").NextFunction) => Promise<void>;
    claimUser: (req: import("express").Request | RequestWithAuth, res: Response, next: import("express").NextFunction) => Promise<void>;
    login: (req: import("express").Request | RequestWithAuth, res: Response, next: import("express").NextFunction) => Promise<void>;
    register: (req: import("express").Request | RequestWithAuth, res: Response, next: import("express").NextFunction) => Promise<void>;
    requestEmailVerification: (req: import("express").Request | RequestWithAuth, res: Response, next: import("express").NextFunction) => Promise<void>;
    publicRequestPasswordReset: (req: import("express").Request | RequestWithAuth, res: Response, next: import("express").NextFunction) => Promise<void>;
    private validateCreateUser;
    private validateUpdateUser;
}
declare const _default: UserController;
export default _default;
//# sourceMappingURL=UserController.d.ts.map