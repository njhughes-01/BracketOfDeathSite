import { Response } from "express";
import { RequestWithAuth } from "./base";
import { ApiResponse } from "../types/common";
import keycloakAdminService from "../services/keycloakAdminService";

class SystemController {
  protected handleError(res: Response, error: any, message: string): void {
    console.error(message, error);
    const response: ApiResponse = {
      success: false,
      error: error.message || message,
    };
    res.status(500).json(response);
  }

  /**
   * Checks if the system has been initialized (i.e., has at least one superadmin).
   * Public or Authenticated access.
   */
  async getStatus(req: RequestWithAuth, res: Response): Promise<void> {
    try {
      const superAdmins =
        await keycloakAdminService.getUsersInRole("superadmin");
      const initialized = superAdmins.length > 0;

      const response: ApiResponse<{ initialized: boolean }> = {
        success: true,
        data: { initialized },
      };

      res.json(response);
    } catch (error) {
      this.handleError(res, error, "Failed to retrieve system status");
    }
  }

  /**
   * Allows an authenticated user to claim the superadmin role IF the system is uninitialized.
   */
  async claimSuperadmin(req: RequestWithAuth, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, error: "Not authenticated" });
        return;
      }

      // Double-check initialization status to prevent race conditions
      const superAdmins =
        await keycloakAdminService.getUsersInRole("superadmin");
      if (superAdmins.length > 0) {
        const response: ApiResponse = {
          success: false,
          error:
            "System is already initialized. Cannot claim superadmin access.",
        };
        res.status(403).json(response);
        return;
      }

      // Assign superadmin role to the current user
      // Also assign 'admin' and 'user' for complete access
      await keycloakAdminService.setUserRoles(userId, [
        "superadmin",
        "admin",
        "user",
      ]);

      const response: ApiResponse = {
        success: true,
        message: "Successfully claimed superadmin access.",
      };

      res.json(response);
    } catch (error) {
      this.handleError(res, error, "Failed to claim superadmin access");
    }
  }
}

export default new SystemController();
