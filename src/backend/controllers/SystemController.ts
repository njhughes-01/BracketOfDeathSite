import { Request, Response } from "express";
import { BaseController } from "./base";
import keycloakAdminService from "../services/keycloakAdminService";

class SystemController extends BaseController {
  constructor() {
    super();
  }
  /**
   * Checks if the system has been initialized (i.e., has at least one superadmin).
   * Public or Authenticated access.
   */
  getStatus = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const superAdmins =
        await keycloakAdminService.getUsersInRole("superadmin");
      const initialized = superAdmins.length > 0;

      this.sendSuccess(res, { initialized });
    },
  );

  /**
   * Allows an authenticated user to claim the superadmin role IF the system is uninitialized.
   */
  claimSuperadmin = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = (req as any).user?.id;

      if (!userId) {
        return this.sendUnauthorized(res, "Not authenticated");
      }

      // Double-check initialization status to prevent race conditions
      const superAdmins =
        await keycloakAdminService.getUsersInRole("superadmin");
      if (superAdmins.length > 0) {
        return this.sendForbidden(
          res,
          "System is already initialized. Cannot claim superadmin access.",
        );
      }

      // Assign superadmin role to the current user
      // Also assign 'admin' and 'user' for complete access
      await keycloakAdminService.setUserRoles(userId, [
        "superadmin",
        "admin",
        "user",
      ]);

      this.sendSuccess(res, undefined, "Successfully claimed superadmin access.");
    },
  );
}

export default new SystemController();
