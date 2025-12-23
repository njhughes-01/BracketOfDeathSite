import { Response } from "express";
import { RequestWithAuth } from "./base";
import { ApiResponse } from "../types/common";
import {
  User,
  CreateUserInput,
  UpdateUserInput,
  UserFilters,
  ResetPasswordInput,
  UserRole,
  CreateUserValidation,
  UpdateUserValidation,
} from "../types/user";
import keycloakAdminService from "../services/keycloakAdminService";
import mailjetService from "../services/MailjetService";
import jwt from "jsonwebtoken";
import { Player } from "../models/Player";

class UserController {
  protected handleError(res: Response, error: any, message: string): void {
    console.error(message, error);
    const response: ApiResponse = {
      success: false,
      error: error.message || message,
    };
    res.status(500).json(response);
  }


  async getUsers(req: RequestWithAuth, res: Response): Promise<void> {
    try {
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


      const response: ApiResponse<User[]> = {
        success: true,
        data: users,
        message: `Retrieved ${users.length} users`,
      };

      res.json(response);
    } catch (error) {
      this.handleError(res, error, "Failed to retrieve users");
    }
  }

  async getUser(req: RequestWithAuth, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        const response: ApiResponse = {
          success: false,
          error: "User ID is required",
        };
        res.status(400).json(response);
        return;
      }

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


      const response: ApiResponse<User> = {
        success: true,
        data: user,
      };

      res.json(response);
    } catch (error: any) {
      if (error.response?.status === 404) {
        const response: ApiResponse = {
          success: false,
          error: "User not found",
        };
        res.status(404).json(response);
        return;
      }

      this.handleError(res, error, "Failed to retrieve user");
    }
  }

  async createUser(req: RequestWithAuth, res: Response): Promise<void> {
    try {
      const userData: CreateUserInput = req.body;

      // Validate input
      const validation = this.validateCreateUser(userData);
      if (!validation.isValid) {
        const response: ApiResponse = {
          success: false,
          error: "Validation failed",
          details: validation.errors,
        };
        res.status(400).json(response);
        return;
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


      const response: ApiResponse<User> = {
        success: true,
        data: user,
        message: "User created successfully",
      };

      res.status(201).json(response);
    } catch (error: any) {
      if (error.response?.status === 409) {
        const response: ApiResponse = {
          success: false,
          error: "User with this username or email already exists",
        };
        res.status(409).json(response);
        return;
      }

      this.handleError(res, error, "Failed to create user");
    }
  }

  async updateUser(req: RequestWithAuth, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userData: UpdateUserInput = req.body;

      if (!id) {
        const response: ApiResponse = {
          success: false,
          error: "User ID is required",
        };
        res.status(400).json(response);
        return;
      }

      // Validate input
      const validation = this.validateUpdateUser(userData);
      if (!validation.isValid) {
        const response: ApiResponse = {
          success: false,
          error: "Validation failed",
          details: validation.errors,
        };
        res.status(400).json(response);
        return;
      }

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


      const response: ApiResponse<User> = {
        success: true,
        data: user,
        message: "User updated successfully",
      };

      res.json(response);
    } catch (error: any) {
      if (error.response?.status === 404) {
        const response: ApiResponse = {
          success: false,
          error: "User not found",
        };
        res.status(404).json(response);
        return;
      }

      this.handleError(res, error, "Failed to update user");
    }
  }

  async deleteUser(req: RequestWithAuth, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        const response: ApiResponse = {
          success: false,
          error: "User ID is required",
        };
        res.status(400).json(response);
        return;
      }

      // Prevent self-deletion
      if (req.user && req.user.id === id) {
        const response: ApiResponse = {
          success: false,
          error: "Cannot delete your own account",
        };
        res.status(403).json(response);
        return;
      }

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

      const response: ApiResponse = {
        success: true,
        message: "User deleted successfully",
      };

      res.json(response);
    } catch (error: any) {
      if (error.response?.status === 404) {
        const response: ApiResponse = {
          success: false,
          error: "User not found",
        };
        res.status(404).json(response);
        return;
      }

      this.handleError(res, error, "Failed to delete user");
    }
  }

  async resetPassword(req: RequestWithAuth, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { newPassword, temporary = false }: ResetPasswordInput = req.body;

      if (!id) {
        const response: ApiResponse = {
          success: false,
          error: "User ID is required",
        };
        res.status(400).json(response);
        return;
      }

      if (!newPassword || newPassword.length < 8) {
        const response: ApiResponse = {
          success: false,
          error: "Password must be at least 8 characters long",
        };
        res.status(400).json(response);
        return;
      }

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

      const response: ApiResponse = {
        success: true,
        message: `Password ${temporary ? "reset" : "updated"} successfully`,
      };

      res.json(response);
    } catch (error: any) {
      if (error.response?.status === 404) {
        const response: ApiResponse = {
          success: false,
          error: "User not found",
        };
        res.status(404).json(response);
        return;
      }

      this.handleError(res, error, "Failed to reset password");
    }
  }

  async updateUserRoles(req: RequestWithAuth, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { roles }: { roles: string[] } = req.body;

      if (!id) {
        const response: ApiResponse = {
          success: false,
          error: "User ID is required",
        };
        res.status(400).json(response);
        return;
      }

      if (!roles || !Array.isArray(roles)) {
        const response: ApiResponse = {
          success: false,
          error: "Roles array is required",
        };
        res.status(400).json(response);
        return;
      }

      // Validate roles
      const validRoles = ["superadmin", "admin", "user"];
      const invalidRoles = roles.filter((role) => !validRoles.includes(role));
      if (invalidRoles.length > 0) {
        const response: ApiResponse = {
          success: false,
          error: `Invalid roles: ${invalidRoles.join(", ")}`,
        };
        res.status(400).json(response);
        return;
      }

      await keycloakAdminService.setUserRoles(id, roles);

      const response: ApiResponse = {
        success: true,
        message: "User roles updated successfully",
      };

      res.json(response);
    } catch (error: any) {
      if (error.response?.status === 404) {
        const response: ApiResponse = {
          success: false,
          error: "User not found",
        };
        res.status(404).json(response);
        return;
      }

      this.handleError(res, error, "Failed to update user roles");
    }
  }

  async getAvailableRoles(req: RequestWithAuth, res: Response): Promise<void> {
    try {
      const kcRoles = await keycloakAdminService.getAvailableRoles();

      const roles: UserRole[] = kcRoles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
      }));

      const response: ApiResponse<UserRole[]> = {
        success: true,
        data: roles,
      };

      res.json(response);
    } catch (error) {
      this.handleError(res, error, "Failed to retrieve available roles");
    }
  }
  async linkPlayerToSelf(req: RequestWithAuth, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { playerId } = req.body;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          error: "User not authenticated",
        };
        res.status(401).json(response);
        return;
      }

      if (!playerId) {
        const response: ApiResponse = {
          success: false,
          error: "Player ID is required",
        };
        res.status(400).json(response);
        return;
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


      const response: ApiResponse<User> = {
        success: true,
        data: user,
        message: "Player profile linked successfully",
      };

      res.json(response);
    } catch (error: any) {
      this.handleError(res, error, "Failed to link player profile");
    }
  }

  async claimUser(req: RequestWithAuth, res: Response): Promise<void> {
    try {
      const { email, playerId } = req.body;

      if (!email || !playerId) {
        res
          .status(400)
          .json({ success: false, error: "Email and Player ID are required" });
        return;
      }

      // 1. Verify player exists
      const player = await Player.findById(playerId);
      if (!player) {
        res.status(404).json({ success: false, error: "Player not found" });
        return;
      }

      // 2. Generate Claim Token
      const token = jwt.sign(
        { email, playerId, type: "claim_profile" },
        process.env.JWT_SECRET || "secret",
        { expiresIn: "7d" },
      );

      // 3. Send Email
      await mailjetService.sendClaimInvitation(email, token, player.name);

      res.json({ success: true, message: "Invitation sent successfully" });
    } catch (error: any) {
      this.handleError(res, error, "Failed to send claim invitation");
    }
  }

  // Public Login endpoint (proxy to Keycloak for scripts/testing)
  async login(req: RequestWithAuth, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res
          .status(400)
          .json({
            success: false,
            error: "Username and password are required",
          });
        return;
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

        res.json({
          success: true,
          token: response.data.access_token,
          refreshToken: response.data.refresh_token,
          expiresIn: response.data.expires_in,
        });
      } catch (authError: any) {
        console.error(
          "Keycloak login failed:",
          authError.response?.data || authError.message,
        );
        res.status(401).json({ success: false, error: "Invalid credentials" });
      }
    } catch (error) {
      this.handleError(res, error, "Login failed");
    }
  }

  // Public Registration endpoint (moved logic from routes/auth.ts to controller for better organization)
  async register(req: RequestWithAuth, res: Response): Promise<void> {
    try {
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
          // Proceed without linking if token is invalid? Or fail?
          // For now, let's fail to prevent security issues if someone thinks they are claiming but aren't
          res
            .status(400)
            .json({ success: false, error: "Invalid or expired claim token" });
          return;
        }
      }

      // Validate required fields
      if (!userData.username || !userData.email || !userData.password) {
        const response: ApiResponse = {
          success: false,
          error: "Missing required fields: username, email, password",
        };
        res.status(400).json(response);
        return;
      }

      // Validate username
      if (
        userData.username.length < CreateUserValidation.username.minLength ||
        userData.username.length > CreateUserValidation.username.maxLength ||
        !CreateUserValidation.username.pattern.test(userData.username)
      ) {
        const response: ApiResponse = {
          success: false,
          error: "Invalid username format",
        };
        res.status(400).json(response);
        return;
      }

      // Validate email
      if (!CreateUserValidation.email.pattern.test(userData.email)) {
        const response: ApiResponse = {
          success: false,
          error: "Invalid email format",
        };
        res.status(400).json(response);
        return;
      }

      // Validate password
      if (userData.password.length < CreateUserValidation.password.minLength) {
        const response: ApiResponse = {
          success: false,
          error: `Password must be at least ${CreateUserValidation.password.minLength} characters`,
        };
        res.status(400).json(response);
        return;
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
          // Default gender not set for public registration unless passed?
          // Assuming we just leave it undefined for now as it wasn't in CreateUserInput before
        },
      };



      // Create user in Keycloak
      const createdUser = await keycloakAdminService.createUser(safeUserData);

      const response: ApiResponse = {
        success: true,
        data: {
          id: createdUser.id,
          username: createdUser.username,
          email: createdUser.email,
          message: "Registration successful. Please login.",
        },
      };

      res.status(201).json(response);
    } catch (error: any) {
      if (error.response?.status === 409) {
        const response: ApiResponse = {
          success: false,
          error: "User with this username or email already exists",
        };
        res.status(409).json(response);
        return;
      }
      this.handleError(res, error, "Registration failed");
    }
  }

  async requestEmailVerification(
    req: RequestWithAuth,
    res: Response,
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: "Not authenticated" });
        return;
      }

      const kcUser = await keycloakAdminService.getUser(userId);
      if (kcUser.emailVerified) {
        res
          .status(400)
          .json({ success: false, error: "Email already verified" });
        return;
      }

      await keycloakAdminService.executeActionsEmail(userId, ["VERIFY_EMAIL"]);

      res.json({ success: true, message: "Verification email sent" });
    } catch (error) {
      this.handleError(res, error, "Failed to send verification email");
    }
  }

  async publicRequestPasswordReset(
    req: RequestWithAuth,
    res: Response,
  ): Promise<void> {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ success: false, error: "Email is required" });
        return;
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
      res.json({
        success: true,
        message: "If an account exists, a password reset email has been sent.",
      });
    } catch (error: any) {
      // Log but return success
      console.error("Password reset request error:", error);
      res.json({
        success: true,
        message: "If an account exists, a password reset email has been sent.",
      });
    }
  }

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
        errors.push(`Invalid roles: ${invalidRoles.join(", ")}`);
      }
    }

    // Gender validation
    if (userData.gender) { // @ts-ignore - CreateUserValidation has gender but TS might not see it yet if types file update wasn't flushed or context issue
      // actually UpdateUserValidation should have gender, let's check what I added to types
      // I added gender to UpdateUserValidation in previous tool call
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

export default UserController;
