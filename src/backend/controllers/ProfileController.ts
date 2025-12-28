import { Response } from "express";
import { RequestWithAuth, BaseController } from "./base";
import { Player } from "../models/Player";
import { IPlayer } from "../types/player";
import keycloakAdminService from "../services/keycloakAdminService";

class ProfileController extends BaseController {
  // Get current user's profile which includes user data and linked player data
  getProfile = this.asyncHandler(
    async (req: RequestWithAuth, res: Response): Promise<void> => {
      const userId = req.user?.id;

      if (!userId) {
        return this.sendUnauthorized(res);
      }

      // Fetch user from Keycloak to get latest attributes (playerId)
      const kcUser = await keycloakAdminService.getUser(userId);
      const playerId = kcUser.attributes?.playerId?.[0];

      let playerData: IPlayer | null = null;
      if (playerId) {
        playerData = await Player.findById(playerId);
      }

      // Determine if user should skip onboarding (isComplete)
      const userRoles = kcUser.realmRoles || [];
      const isSuperAdmin = userRoles.includes("superadmin");
      const isAdmin = userRoles.includes("admin") || req.user?.isAdmin || false;
      const isPlayerComplete = !!(playerData && playerData.gender);

      // Construct the response profile object
      const profileData = {
        user: {
          id: kcUser.id,
          username: kcUser.username,
          email: kcUser.email,
          emailVerified: kcUser.emailVerified,
          firstName: kcUser.firstName,
          lastName: kcUser.lastName,
          fullName:
            [kcUser.firstName, kcUser.lastName].filter(Boolean).join(" ") ||
            kcUser.username,
          roles: kcUser.realmRoles || [],
          playerId: playerId,
        },
        player: playerData,
        isComplete: isSuperAdmin || isAdmin || isPlayerComplete,
      };

      this.sendSuccess(res, profileData);
    },
  );

  // Update current user's profile (specifically the player data)
  updateProfile = this.asyncHandler(
    async (req: RequestWithAuth, res: Response): Promise<void> => {
      const userId = req.user?.id;
      const { gender, bracketPreference } = req.body;

      if (!userId) {
        return this.sendUnauthorized(res);
      }

      if (!gender) {
        return this.sendError(res, "Gender is required");
      }

      // 1. Get User
      const kcUser = await keycloakAdminService.getUser(userId);
      let playerId = kcUser.attributes?.playerId?.[0];
      let player: IPlayer | null = null;

      if (playerId) {
        // 2a. Update existing player
        player = await Player.findByIdAndUpdate(
          playerId,
          { gender, bracketPreference },
          { new: true, runValidators: true },
        );
      } else {
        // 2b. Create new player
        const name =
          [kcUser.firstName, kcUser.lastName].filter(Boolean).join(" ") ||
          kcUser.username ||
          "Unknown Player";

        try {
          player = await Player.create({
            name,
            gender,
            bracketPreference,
            isActive: true,
          });
          playerId = player.id;

          // Link to User
          await keycloakAdminService.updateUser(userId, {
            attributes: { playerId: [player.id] },
          });
        } catch (creationError: any) {
          if (creationError.code === 11000) {
            // Name duplicate fallback
            const uniqueName = `${name} (${userId.substring(0, 4)})`;
            player = await Player.create({
              name: uniqueName,
              gender,
              bracketPreference,
              isActive: true,
            });
            playerId = player.id;
            await keycloakAdminService.updateUser(userId, {
              attributes: { playerId: [player.id] },
            });
          } else {
            throw creationError;
          }
        }
      }

      this.sendSuccess(res, player, "Profile updated successfully");
    },
  );

  // Change password for the current user
  changePassword = this.asyncHandler(
    async (req: RequestWithAuth, res: Response): Promise<void> => {
      const userId = req.user?.id;
      const { currentPassword, newPassword } = req.body;

      if (!userId) {
        return this.sendUnauthorized(res);
      }

      if (!currentPassword || !newPassword) {
        return this.sendError(res, "Current and new password are required");
      }

      if (newPassword.length < 8) {
        return this.sendError(res, "New password must be at least 8 characters");
      }

      // 1. Verify current password
      const kcUser = await keycloakAdminService.getUser(userId);
      if (!kcUser.username) {
        return this.sendNotFound(res, "User");
      }

      const tokenUrl = `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`;
      const params = new URLSearchParams();
      params.append("username", kcUser.username);
      params.append("password", currentPassword);
      params.append("grant_type", "password");
      params.append("client_id", process.env.KEYCLOAK_CLIENT_ID || "bod-app");
      if (process.env.KEYCLOAK_CLIENT_SECRET) {
        params.append("client_secret", process.env.KEYCLOAK_CLIENT_SECRET);
      }

      try {
        await import("axios").then((a) =>
          a.default.post(tokenUrl, params, {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
          }),
        );
      } catch (authError) {
        return this.sendUnauthorized(res, "Invalid current password");
      }

      // 2. Update password
      await keycloakAdminService.resetUserPassword(userId, newPassword, false);

      this.sendSuccess(res, null, "Password updated successfully");
    },
  );
}

export default new ProfileController();
