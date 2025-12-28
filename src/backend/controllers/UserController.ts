import { Response } from "express";
import { RequestWithAuth, BaseController } from "./base";
import { ApiResponse } from "../types/common";
import {
  User,
  CreateUserInput,
  UpdateUserInput,
  ResetPasswordInput,
  UserRole,
  CreateUserValidation,
  UpdateUserValidation,
} from "../types/user";
import keycloakAdminService from "../services/keycloakAdminService";
import mailjetService from "../services/MailjetService";
import jwt from "jsonwebtoken";
import { Player } from "../models/Player";

class UserController extends BaseController {
  getUsers = this.asyncHandler(
    async (req: RequestWithAuth, res: Response): Promise<void> => {
      const { search, max = "100" } = req.query as {
        search?: string;
        max?: string;
      };

      const keycloakUsers = await keycloakAdminService.getUsers(
        search,
        parseInt(max),
      );

      const users: User[] = keycloakUsers.map((kcUser) => ({
        id: kcUser.id!,
        username: kcUser.username,
        email: kcUser.email,
        firstName: kcUser.firstName,
        lastName: kcUser.lastName,
        fullName:
          [kcUser.firstName, kcUser.lastName].filter(Boolean).join(" ") ||
          kcUser.username,
        enabled: kcUser.enabled,
        emailVerified: kcUser.emailVerified,
        roles: kcUser.realmRoles || [],
        isAdmin:
          (kcUser.realmRoles || []).includes("admin") ||
          (kcUser.realmRoles || []).includes("superadmin"),
        isSuperAdmin: (kcUser.realmRoles || []).includes("superadmin"),
        playerId: kcUser.attributes?.playerId?.[0],
        gender: kcUser.attributes?.gender?.[0],
      }));

      this.sendSuccess(res, users, `Retrieved ${users.length} users`);
    },
  );

  getUser = this.asyncHandler(
    async (req: RequestWithAuth, res: Response): Promise<void> => {
      const { id } = req.params;

      if (!id) {
        return this.sendError(res, "User ID is required", 400);
      }

      try {
        const kcUser = await keycloakAdminService.getUser(id);

        const user: User = {
          id: kcUser.id!,
          username: kcUser.username,
          email: kcUser.email,
          firstName: kcUser.firstName,
          lastName: kcUser.lastName,
          fullName:
            [kcUser.firstName, kcUser.lastName].filter(Boolean).join(" ") ||
            kcUser.username,
          enabled: kcUser.enabled,
          emailVerified: kcUser.emailVerified,
          roles: kcUser.realmRoles || [],
          isAdmin:
            (kcUser.realmRoles || []).includes("admin") ||
            (kcUser.realmRoles || []).includes("superadmin"),
          isSuperAdmin: (kcUser.realmRoles || []).includes("superadmin"),
          playerId: kcUser.attributes?.playerId?.[0],
          gender: kcUser.attributes?.gender?.[0],
        };

        this.sendSuccess(res, user);
      } catch (error: any) {
        if (error.response?.status === 404) {
          return this.sendNotFound(res, "User");
        }
        throw error;
      }
    },
  );

  createUser = this.asyncHandler(
    async (req: RequestWithAuth, res: Response): Promise<void> => {
      const userData: CreateUserInput = req.body;

      // Validate input
      const validation = this.validateCreateUser(userData);
      if (!validation.isValid) {
        return this.sendValidationError(res, validation.errors || []);
      }

      // Ensure default role if none provided
      if (!userData.roles || userData.roles.length === 0) {
        userData.roles = ["user"];
      }

      const { playerId, gender, ...keycloakData } = userData;

      const serviceRequest = {
        ...keycloakData,
        attributes: {
          ...(playerId ? { playerId: [playerId] } : {}),
          ...(gender ? { gender: [gender] } : {}),
        },
      };

      try {
        const kcUser = await keycloakAdminService.createUser(serviceRequest);

        const user: User = {
          id: kcUser.id!,
          username: kcUser.username,
          email: kcUser.email,
          firstName: kcUser.firstName,
          lastName: kcUser.lastName,
          fullName:
            [kcUser.firstName, kcUser.lastName].filter(Boolean).join(" ") ||
            kcUser.username,
          enabled: kcUser.enabled,
          emailVerified: kcUser.emailVerified,
          roles: userData.roles,
          isAdmin:
            userData.roles.includes("admin") ||
            userData.roles.includes("superadmin"),
          isSuperAdmin: userData.roles.includes("superadmin"),
          playerId: userData.playerId,
          gender: userData.gender,
        };

        this.sendSuccess(res, user, "User created successfully", undefined, 201);
      } catch (error: any) {
        if (error.response?.status === 409) {
          return this.sendError(
            res,
            "User with this username or email already exists",
            409,
          );
        }
        throw error;
      }
    },
  );

  updateUser = this.asyncHandler(
    async (req: RequestWithAuth, res: Response): Promise<void> => {
      const { id } = req.params;
      const userData: UpdateUserInput = req.body;

      if (!id) {
        return this.sendError(res, "User ID is required", 400);
      }

      // Validate input
      const validation = this.validateUpdateUser(userData);
      if (!validation.isValid) {
        return this.sendValidationError(res, validation.errors || []);
      }

      try {
        // Fetch existing user to get current attributes
        const existingUser = await keycloakAdminService.getUser(id);

        const { playerId, gender, ...keycloakUpdateData } = userData;

        const serviceRequest = {
          ...keycloakUpdateData,
          attributes: {
            ...existingUser.attributes, // Preserve existing attributes
            ...(playerId ? { playerId: [playerId] } : {}),
            ...(gender ? { gender: [gender] } : {}),
          },
        };

        const kcUser = await keycloakAdminService.updateUser(id, serviceRequest);

        const user: User = {
          id: kcUser.id!,
          username: kcUser.username,
          email: kcUser.email,
          firstName: kcUser.firstName,
          lastName: kcUser.lastName,
          fullName:
            [kcUser.firstName, kcUser.lastName].filter(Boolean).join(" ") ||
            kcUser.username,
          enabled: kcUser.enabled,
          emailVerified: kcUser.emailVerified,
          roles: kcUser.realmRoles || [],
          isAdmin:
            (kcUser.realmRoles || []).includes("admin") ||
            (kcUser.realmRoles || []).includes("superadmin"),
          isSuperAdmin: (kcUser.realmRoles || []).includes("superadmin"),
          playerId: kcUser.attributes?.playerId?.[0],
          gender: kcUser.attributes?.gender?.[0],
        };

        this.sendSuccess(res, user, "User updated successfully");
      } catch (error: any) {
        if (error.response?.status === 404) {
          return this.sendNotFound(res, "User");
        }
        throw error;
      }
    },
  );

  deleteUser = this.asyncHandler(
    async (req: RequestWithAuth, res: Response): Promise<void> => {
      const { id } = req.params;

      if (!id) {
        return this.sendError(res, "User ID is required", 400);
      }

      // Prevent self-deletion
      if (req.user && req.user.id === id) {
        return this.sendForbidden(res, "Cannot delete your own account");
      }

      try {
        // 1. Get user to find linked player
        const kcUser = await keycloakAdminService.getUser(id);
        const playerId = kcUser.attributes?.playerId?.[0];

        // 2. Delete Keycloak User
        await keycloakAdminService.deleteUser(id);

        // 3. Delete Linked Player if exists
        if (playerId) {
          try {
            await Player.findByIdAndDelete(playerId);
            console.log(`Deleted linked player ${playerId} for user ${id}`);
          } catch (err) {
            console.error(`Failed to delete linked player ${playerId}:`, err);
          }
        }

        this.sendSuccess(res, null, "User deleted successfully");
      } catch (error: any) {
        if (error.response?.status === 404) {
          return this.sendNotFound(res, "User");
        }
        throw error;
      }
    },
  );

  resetPassword = this.asyncHandler(
    async (req: RequestWithAuth, res: Response): Promise<void> => {
      const { id } = req.params;
      const { newPassword, temporary = false }: ResetPasswordInput = req.body;

      if (!id) {
        return this.sendError(res, "User ID is required", 400);
      }

      if (!newPassword || newPassword.length < 8) {
        return this.sendError(
          res,
          "Password must be at least 8 characters long",
          400,
        );
      }

      try {
        await keycloakAdminService.resetUserPassword(id, newPassword, temporary);

        // Clear required actions to ensure user can login immediately
        if (!temporary) {
          try {
            await keycloakAdminService.clearUserRequiredActions(id);
          } catch (error) {
            console.warn(
              "Could not clear required actions after password reset:",
              error,
            );
          }
        }

        this.sendSuccess(
          res,
          null,
          `Password ${temporary ? "reset" : "updated"} successfully`,
        );
      } catch (error: any) {
        if (error.response?.status === 404) {
          return this.sendNotFound(res, "User");
        }
        throw error;
      }
    },
  );

  updateUserRoles = this.asyncHandler(
    async (req: RequestWithAuth, res: Response): Promise<void> => {
      const { id } = req.params;
      const { roles }: { roles: string[] } = req.body;

      if (!id) {
        return this.sendError(res, "User ID is required", 400);
      }

      if (!roles || !Array.isArray(roles)) {
        return this.sendError(res, "Roles array is required", 400);
      }

      // Validate roles
      const validRoles = ["superadmin", "admin", "user"];
      const invalidRoles = roles.filter((role) => !validRoles.includes(role));
      if (invalidRoles.length > 0) {
        return this.sendError(res, `Invalid roles: ${invalidRoles.join(", ")}`, 400);
      }

      try {
        await keycloakAdminService.setUserRoles(id, roles);
        this.sendSuccess(res, null, "User roles updated successfully");
      } catch (error: any) {
        if (error.response?.status === 404) {
          return this.sendNotFound(res, "User");
        }
        throw error;
      }
    },
  );

  getAvailableRoles = this.asyncHandler(
    async (req: RequestWithAuth, res: Response): Promise<void> => {
      const kcRoles = await keycloakAdminService.getAvailableRoles();

      const roles: UserRole[] = kcRoles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
      }));

      this.sendSuccess(res, roles);
    },
  );

  linkPlayerToSelf = this.asyncHandler(
    async (req: RequestWithAuth, res: Response): Promise<void> => {
      const userId = req.user?.id;
      const { playerId } = req.body;

      if (!userId) {
        return this.sendUnauthorized(res);
      }

      if (!playerId) {
        return this.sendError(res, "Player ID is required", 400);
      }

      // Update the user's attributes
      const serviceRequest = {
        attributes: { playerId: [playerId] },
      };

      await keycloakAdminService.updateUser(userId, serviceRequest);

      // Fetch the updated user to return
      const kcUser = await keycloakAdminService.getUser(userId);

      const user: User = {
        id: kcUser.id!,
        username: kcUser.username,
        email: kcUser.email,
        firstName: kcUser.firstName,
        lastName: kcUser.lastName,
        fullName:
          [kcUser.firstName, kcUser.lastName].filter(Boolean).join(" ") ||
          kcUser.username,
        enabled: kcUser.enabled,
        emailVerified: kcUser.emailVerified,
        roles: kcUser.realmRoles || [],
        isAdmin:
          (kcUser.realmRoles || []).includes("admin") ||
          (kcUser.realmRoles || []).includes("superadmin"),
        isSuperAdmin: (kcUser.realmRoles || []).includes("superadmin"),
        playerId: kcUser.attributes?.playerId?.[0],
        gender: kcUser.attributes?.gender?.[0],
      };

      this.sendSuccess(res, user, "Player profile linked successfully");
    },
  );

  claimUser = this.asyncHandler(
    async (req: RequestWithAuth, res: Response): Promise<void> => {
      const { email, playerId } = req.body;

      if (!email || !playerId) {
        return this.sendError(res, "Email and Player ID are required", 400);
      }

      // 1. Verify player exists
      const player = await Player.findById(playerId);
      if (!player) {
        return this.sendNotFound(res, "Player");
      }

      // 2. Generate Claim Token
      const token = jwt.sign(
        { email, playerId, type: "claim_profile" },
        process.env.JWT_SECRET || "secret",
        { expiresIn: "7d" },
      );

      // 3. Send Email
      await mailjetService.sendClaimInvitation(email, token, player.name);

      this.sendSuccess(res, null, "Invitation sent successfully");
    },
  );

  // Public Login endpoint (proxy to Keycloak for scripts/testing)
  login = this.asyncHandler(
    async (req: RequestWithAuth, res: Response): Promise<void> => {
      const { username, password } = req.body;

      if (!username || !password) {
        return this.sendError(res, "Username and password are required", 400);
      }

      const tokenUrl = `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`;

      const params = new URLSearchParams();
      params.append("username", username);
      params.append("password", password);
      params.append("grant_type", "password");
      params.append("client_id", process.env.KEYCLOAK_CLIENT_ID || "bod-app");
      if (process.env.KEYCLOAK_CLIENT_SECRET) {
        params.append("client_secret", process.env.KEYCLOAK_CLIENT_SECRET);
      }

      try {
        const response = await import("axios").then((a) =>
          a.default.post(tokenUrl, params, {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
          }),
        );

        this.sendSuccess(res, {
          token: response.data.access_token,
          refreshToken: response.data.refresh_token,
          expiresIn: response.data.expires_in,
        });
      } catch (authError: any) {
        console.error(
          "Keycloak login failed:",
          authError.response?.data || authError.message,
        );
        return this.sendUnauthorized(res, "Invalid credentials");
      }
    },
  );

  // Public Registration endpoint (moved logic from routes/auth.ts to controller for better organization)
  register = this.asyncHandler(
    async (req: RequestWithAuth, res: Response): Promise<void> => {
      let { userData, claimToken } = req.body;

      // Handle flat request body (frontend sends flat data)
      if (!userData) {
        userData = { ...req.body };
        if (userData.claimToken) {
          claimToken = userData.claimToken;
          delete userData.claimToken;
        }
      }

      // If claim token exists, decode and override/verify specific fields
      let linkedPlayerId: string | undefined;

      if (claimToken) {
        try {
          const decoded = jwt.verify(
            claimToken,
            process.env.JWT_SECRET || "secret",
          ) as any;
          if (decoded.type === "claim_profile") {
            // Enforce the email/player connection from the token
            userData.email = decoded.email;
            linkedPlayerId = decoded.playerId;
          }
        } catch (e) {
          console.error("Invalid claim token", e);
          return this.sendError(res, "Invalid or expired claim token", 400);
        }
      }

      // Validate required fields
      if (!userData.username || !userData.email || !userData.password) {
        return this.sendError(
          res,
          "Missing required fields: username, email, password",
          400,
        );
      }

      // Validate username
      if (
        userData.username.length < CreateUserValidation.username.minLength ||
        userData.username.length > CreateUserValidation.username.maxLength ||
        !CreateUserValidation.username.pattern.test(userData.username)
      ) {
        return this.sendError(res, "Invalid username format", 400);
      }

      // Validate email
      if (!CreateUserValidation.email.pattern.test(userData.email)) {
        return this.sendError(res, "Invalid email format", 400);
      }

      // Validate password
      if (userData.password.length < CreateUserValidation.password.minLength) {
        return this.sendError(
          res,
          `Password must be at least ${CreateUserValidation.password.minLength} characters`,
          400,
        );
      }

      // Force safe roles for public registration
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { playerId: _pid, gender: _g, ...safeAuthData } = userData;

      // Default role for public registration is always 'user'
      // Admin claim is now handled via explicit onboarding flow
      const userRoles = ["user"];

      const safeUserData = {
        ...safeAuthData,
        roles: userRoles,
        enabled: true,
        emailVerified: false,
        attributes: {
          ...(linkedPlayerId ? { playerId: [linkedPlayerId] } : {}),
        },
      };

      try {
        // Create user in Keycloak
        const createdUser = await keycloakAdminService.createUser(safeUserData);

        this.sendSuccess(
          res,
          {
            id: createdUser.id,
            username: createdUser.username,
            email: createdUser.email,
          },
          "Registration successful. Please login.",
          undefined,
          201,
        );
      } catch (error: any) {
        if (error.response?.status === 409) {
          return this.sendError(
            res,
            "User with this username or email already exists",
            409,
          );
        }
        throw error;
      }
    },
  );

  requestEmailVerification = this.asyncHandler(
    async (req: RequestWithAuth, res: Response): Promise<void> => {
      const userId = req.user?.id;
      if (!userId) {
        return this.sendUnauthorized(res);
      }

      const kcUser = await keycloakAdminService.getUser(userId);
      if (kcUser.emailVerified) {
        return this.sendError(res, "Email already verified", 400);
      }

      await keycloakAdminService.executeActionsEmail(userId, ["VERIFY_EMAIL"]);

      this.sendSuccess(res, null, "Verification email sent");
    },
  );

  publicRequestPasswordReset = this.asyncHandler(
    async (req: RequestWithAuth, res: Response): Promise<void> => {
      try {
        const { email } = req.body;
        if (!email) {
          return this.sendError(res, "Email is required", 400);
        }

        // Find user by email
        const users = await keycloakAdminService.getUsers(email);
        // Keycloak search is fuzzy, so filter exact match
        const user = users.find(
          (u) => u.email.toLowerCase() === email.toLowerCase(),
        );

        if (user && user.id) {
          // Trigger Keycloak reset email
          await keycloakAdminService.executeActionsEmail(user.id, [
            "UPDATE_PASSWORD",
          ]);
        }

        // Always return success to prevent user enumeration
        this.sendSuccess(
          res,
          null,
          "If an account exists, a password reset email has been sent.",
        );
      } catch (error: any) {
        // Log but return success
        console.error("Password reset request error:", error);
        this.sendSuccess(
          res,
          null,
          "If an account exists, a password reset email has been sent.",
        );
      }
    },
  );

  private validateCreateUser(userData: CreateUserInput): {
    isValid: boolean;
    errors?: string[];
  } {
    const errors: string[] = [];

    // Username validation
    if (!userData.username) {
      errors.push("Username is required");
    } else if (
      userData.username.length < CreateUserValidation.username.minLength
    ) {
      errors.push(
        `Username must be at least ${CreateUserValidation.username.minLength} characters`,
      );
    } else if (
      userData.username.length > CreateUserValidation.username.maxLength
    ) {
      errors.push(
        `Username must not exceed ${CreateUserValidation.username.maxLength} characters`,
      );
    } else if (!CreateUserValidation.username.pattern.test(userData.username)) {
      errors.push(
        "Username can only contain letters, numbers, underscores, and hyphens",
      );
    }

    // Email validation
    if (!userData.email) {
      errors.push("Email is required");
    } else if (!CreateUserValidation.email.pattern.test(userData.email)) {
      errors.push("Invalid email format");
    }

    // Password validation
    if (
      userData.password &&
      userData.password.length < CreateUserValidation.password.minLength
    ) {
      errors.push(
        `Password must be at least ${CreateUserValidation.password.minLength} characters`,
      );
    }

    // Role validation
    if (userData.roles) {
      const invalidRoles = userData.roles.filter(
        (role) => !CreateUserValidation.roles.validRoles.includes(role),
      );
      if (invalidRoles.length > 0) {
        errors.push(`Invalid roles: ${invalidRoles.join(", ")}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private validateUpdateUser(userData: UpdateUserInput): {
    isValid: boolean;
    errors?: string[];
  } {
    const errors: string[] = [];

    // Email validation
    if (
      userData.email &&
      !UpdateUserValidation.email.pattern.test(userData.email)
    ) {
      errors.push("Invalid email format");
    }

    // Role validation
    if (userData.roles) {
      const invalidRoles = userData.roles.filter(
        (role) => !UpdateUserValidation.roles.validRoles.includes(role),
      );
      if (invalidRoles.length > 0) {
        errors.push(`Invalid roles: ${invalidRoles.join(", ")}`);
      }
    }

    // Gender validation
    if (userData.gender) {
      // @ts-ignore
      if (
        UpdateUserValidation.gender &&
        !UpdateUserValidation.gender.validOptions.includes(userData.gender)
      ) {
        errors.push("Invalid gender option");
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}

export default new UserController();
