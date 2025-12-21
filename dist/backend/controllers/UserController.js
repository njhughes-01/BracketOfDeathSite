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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const user_1 = require("../types/user");
const keycloakAdminService_1 = __importDefault(require("../services/keycloakAdminService"));
const MailjetService_1 = __importDefault(require("../services/MailjetService"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Player_1 = require("../models/Player");
class UserController {
    handleError(res, error, message) {
        console.error(message, error);
        const response = {
            success: false,
            error: error.message || message,
        };
        res.status(500).json(response);
    }
    async getUsers(req, res) {
        try {
            const { search, max = "100" } = req.query;
            const keycloakUsers = await keycloakAdminService_1.default.getUsers(search, parseInt(max));
            const users = keycloakUsers.map((kcUser) => ({
                id: kcUser.id,
                username: kcUser.username,
                email: kcUser.email,
                firstName: kcUser.firstName,
                lastName: kcUser.lastName,
                fullName: [kcUser.firstName, kcUser.lastName].filter(Boolean).join(" ") ||
                    kcUser.username,
                enabled: kcUser.enabled,
                emailVerified: kcUser.emailVerified,
                roles: kcUser.realmRoles || [],
                isAdmin: (kcUser.realmRoles || []).includes("admin") ||
                    (kcUser.realmRoles || []).includes("superadmin"),
                isSuperAdmin: (kcUser.realmRoles || []).includes("superadmin"),
                playerId: kcUser.attributes?.playerId?.[0],
            }));
            const response = {
                success: true,
                data: users,
                message: `Retrieved ${users.length} users`,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(res, error, "Failed to retrieve users");
        }
    }
    async getUser(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                const response = {
                    success: false,
                    error: "User ID is required",
                };
                res.status(400).json(response);
                return;
            }
            const kcUser = await keycloakAdminService_1.default.getUser(id);
            const user = {
                id: kcUser.id,
                username: kcUser.username,
                email: kcUser.email,
                firstName: kcUser.firstName,
                lastName: kcUser.lastName,
                fullName: [kcUser.firstName, kcUser.lastName].filter(Boolean).join(" ") ||
                    kcUser.username,
                enabled: kcUser.enabled,
                emailVerified: kcUser.emailVerified,
                roles: kcUser.realmRoles || [],
                isAdmin: (kcUser.realmRoles || []).includes("admin") ||
                    (kcUser.realmRoles || []).includes("superadmin"),
                isSuperAdmin: (kcUser.realmRoles || []).includes("superadmin"),
                playerId: kcUser.attributes?.playerId?.[0],
            };
            const response = {
                success: true,
                data: user,
            };
            res.json(response);
        }
        catch (error) {
            if (error.response?.status === 404) {
                const response = {
                    success: false,
                    error: "User not found",
                };
                res.status(404).json(response);
                return;
            }
            this.handleError(res, error, "Failed to retrieve user");
        }
    }
    async createUser(req, res) {
        try {
            const userData = req.body;
            const validation = this.validateCreateUser(userData);
            if (!validation.isValid) {
                const response = {
                    success: false,
                    error: "Validation failed",
                    details: validation.errors,
                };
                res.status(400).json(response);
                return;
            }
            if (!userData.roles || userData.roles.length === 0) {
                userData.roles = ["user"];
            }
            const serviceRequest = {
                ...userData,
                attributes: userData.playerId
                    ? { playerId: [userData.playerId] }
                    : undefined,
            };
            const kcUser = await keycloakAdminService_1.default.createUser(serviceRequest);
            const user = {
                id: kcUser.id,
                username: kcUser.username,
                email: kcUser.email,
                firstName: kcUser.firstName,
                lastName: kcUser.lastName,
                fullName: [kcUser.firstName, kcUser.lastName].filter(Boolean).join(" ") ||
                    kcUser.username,
                enabled: kcUser.enabled,
                emailVerified: kcUser.emailVerified,
                roles: userData.roles,
                isAdmin: userData.roles.includes("admin") ||
                    userData.roles.includes("superadmin"),
                isSuperAdmin: userData.roles.includes("superadmin"),
                playerId: userData.playerId,
            };
            const response = {
                success: true,
                data: user,
                message: "User created successfully",
            };
            res.status(201).json(response);
        }
        catch (error) {
            if (error.response?.status === 409) {
                const response = {
                    success: false,
                    error: "User with this username or email already exists",
                };
                res.status(409).json(response);
                return;
            }
            this.handleError(res, error, "Failed to create user");
        }
    }
    async updateUser(req, res) {
        try {
            const { id } = req.params;
            const userData = req.body;
            if (!id) {
                const response = {
                    success: false,
                    error: "User ID is required",
                };
                res.status(400).json(response);
                return;
            }
            const validation = this.validateUpdateUser(userData);
            if (!validation.isValid) {
                const response = {
                    success: false,
                    error: "Validation failed",
                    details: validation.errors,
                };
                res.status(400).json(response);
                return;
            }
            const serviceRequest = {
                ...userData,
                attributes: userData.playerId
                    ? { playerId: [userData.playerId] }
                    : undefined,
            };
            const kcUser = await keycloakAdminService_1.default.updateUser(id, serviceRequest);
            const user = {
                id: kcUser.id,
                username: kcUser.username,
                email: kcUser.email,
                firstName: kcUser.firstName,
                lastName: kcUser.lastName,
                fullName: [kcUser.firstName, kcUser.lastName].filter(Boolean).join(" ") ||
                    kcUser.username,
                enabled: kcUser.enabled,
                emailVerified: kcUser.emailVerified,
                roles: kcUser.realmRoles || [],
                isAdmin: (kcUser.realmRoles || []).includes("admin") ||
                    (kcUser.realmRoles || []).includes("superadmin"),
                isSuperAdmin: (kcUser.realmRoles || []).includes("superadmin"),
                playerId: kcUser.attributes?.playerId?.[0],
            };
            const response = {
                success: true,
                data: user,
                message: "User updated successfully",
            };
            res.json(response);
        }
        catch (error) {
            if (error.response?.status === 404) {
                const response = {
                    success: false,
                    error: "User not found",
                };
                res.status(404).json(response);
                return;
            }
            this.handleError(res, error, "Failed to update user");
        }
    }
    async deleteUser(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                const response = {
                    success: false,
                    error: "User ID is required",
                };
                res.status(400).json(response);
                return;
            }
            if (req.user && req.user.id === id) {
                const response = {
                    success: false,
                    error: "Cannot delete your own account",
                };
                res.status(403).json(response);
                return;
            }
            await keycloakAdminService_1.default.deleteUser(id);
            const response = {
                success: true,
                message: "User deleted successfully",
            };
            res.json(response);
        }
        catch (error) {
            if (error.response?.status === 404) {
                const response = {
                    success: false,
                    error: "User not found",
                };
                res.status(404).json(response);
                return;
            }
            this.handleError(res, error, "Failed to delete user");
        }
    }
    async resetPassword(req, res) {
        try {
            const { id } = req.params;
            const { newPassword, temporary = false } = req.body;
            if (!id) {
                const response = {
                    success: false,
                    error: "User ID is required",
                };
                res.status(400).json(response);
                return;
            }
            if (!newPassword || newPassword.length < 8) {
                const response = {
                    success: false,
                    error: "Password must be at least 8 characters long",
                };
                res.status(400).json(response);
                return;
            }
            await keycloakAdminService_1.default.resetUserPassword(id, newPassword, temporary);
            if (!temporary) {
                try {
                    await keycloakAdminService_1.default.clearUserRequiredActions(id);
                }
                catch (error) {
                    console.warn("Could not clear required actions after password reset:", error);
                }
            }
            const response = {
                success: true,
                message: `Password ${temporary ? "reset" : "updated"} successfully`,
            };
            res.json(response);
        }
        catch (error) {
            if (error.response?.status === 404) {
                const response = {
                    success: false,
                    error: "User not found",
                };
                res.status(404).json(response);
                return;
            }
            this.handleError(res, error, "Failed to reset password");
        }
    }
    async updateUserRoles(req, res) {
        try {
            const { id } = req.params;
            const { roles } = req.body;
            if (!id) {
                const response = {
                    success: false,
                    error: "User ID is required",
                };
                res.status(400).json(response);
                return;
            }
            if (!roles || !Array.isArray(roles)) {
                const response = {
                    success: false,
                    error: "Roles array is required",
                };
                res.status(400).json(response);
                return;
            }
            const validRoles = ["superadmin", "admin", "user"];
            const invalidRoles = roles.filter((role) => !validRoles.includes(role));
            if (invalidRoles.length > 0) {
                const response = {
                    success: false,
                    error: `Invalid roles: ${invalidRoles.join(", ")}`,
                };
                res.status(400).json(response);
                return;
            }
            await keycloakAdminService_1.default.setUserRoles(id, roles);
            const response = {
                success: true,
                message: "User roles updated successfully",
            };
            res.json(response);
        }
        catch (error) {
            if (error.response?.status === 404) {
                const response = {
                    success: false,
                    error: "User not found",
                };
                res.status(404).json(response);
                return;
            }
            this.handleError(res, error, "Failed to update user roles");
        }
    }
    async getAvailableRoles(req, res) {
        try {
            const kcRoles = await keycloakAdminService_1.default.getAvailableRoles();
            const roles = kcRoles.map((role) => ({
                id: role.id,
                name: role.name,
                description: role.description,
            }));
            const response = {
                success: true,
                data: roles,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(res, error, "Failed to retrieve available roles");
        }
    }
    async linkPlayerToSelf(req, res) {
        try {
            const userId = req.user?.id;
            const { playerId } = req.body;
            if (!userId) {
                const response = {
                    success: false,
                    error: "User not authenticated",
                };
                res.status(401).json(response);
                return;
            }
            if (!playerId) {
                const response = {
                    success: false,
                    error: "Player ID is required",
                };
                res.status(400).json(response);
                return;
            }
            const serviceRequest = {
                attributes: { playerId: [playerId] },
            };
            await keycloakAdminService_1.default.updateUser(userId, serviceRequest);
            const kcUser = await keycloakAdminService_1.default.getUser(userId);
            const user = {
                id: kcUser.id,
                username: kcUser.username,
                email: kcUser.email,
                firstName: kcUser.firstName,
                lastName: kcUser.lastName,
                fullName: [kcUser.firstName, kcUser.lastName].filter(Boolean).join(" ") ||
                    kcUser.username,
                enabled: kcUser.enabled,
                emailVerified: kcUser.emailVerified,
                roles: kcUser.realmRoles || [],
                isAdmin: (kcUser.realmRoles || []).includes("admin") ||
                    (kcUser.realmRoles || []).includes("superadmin"),
                isSuperAdmin: (kcUser.realmRoles || []).includes("superadmin"),
                playerId: kcUser.attributes?.playerId?.[0],
            };
            const response = {
                success: true,
                data: user,
                message: "Player profile linked successfully",
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(res, error, "Failed to link player profile");
        }
    }
    async claimUser(req, res) {
        try {
            const { email, playerId } = req.body;
            if (!email || !playerId) {
                res
                    .status(400)
                    .json({ success: false, error: "Email and Player ID are required" });
                return;
            }
            const player = await Player_1.Player.findById(playerId);
            if (!player) {
                res.status(404).json({ success: false, error: "Player not found" });
                return;
            }
            const token = jsonwebtoken_1.default.sign({ email, playerId, type: "claim_profile" }, process.env.JWT_SECRET || "secret", { expiresIn: "7d" });
            await MailjetService_1.default.sendClaimInvitation(email, token, player.name);
            res.json({ success: true, message: "Invitation sent successfully" });
        }
        catch (error) {
            this.handleError(res, error, "Failed to send claim invitation");
        }
    }
    async login(req, res) {
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
                const response = await Promise.resolve().then(() => __importStar(require("axios"))).then((a) => a.default.post(tokenUrl, params, {
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                }));
                res.json({
                    success: true,
                    token: response.data.access_token,
                    refreshToken: response.data.refresh_token,
                    expiresIn: response.data.expires_in,
                });
            }
            catch (authError) {
                console.error("Keycloak login failed:", authError.response?.data || authError.message);
                res.status(401).json({ success: false, error: "Invalid credentials" });
            }
        }
        catch (error) {
            this.handleError(res, error, "Login failed");
        }
    }
    async register(req, res) {
        try {
            const { userData, claimToken } = req.body;
            let linkedPlayerId;
            if (claimToken) {
                try {
                    const decoded = jsonwebtoken_1.default.verify(claimToken, process.env.JWT_SECRET || "secret");
                    if (decoded.type === "claim_profile") {
                        userData.email = decoded.email;
                        linkedPlayerId = decoded.playerId;
                    }
                }
                catch (e) {
                    console.error("Invalid claim token", e);
                    res
                        .status(400)
                        .json({ success: false, error: "Invalid or expired claim token" });
                    return;
                }
            }
            if (!userData.username || !userData.email || !userData.password) {
                const response = {
                    success: false,
                    error: "Missing required fields: username, email, password",
                };
                res.status(400).json(response);
                return;
            }
            if (userData.username.length < user_1.CreateUserValidation.username.minLength ||
                userData.username.length > user_1.CreateUserValidation.username.maxLength ||
                !user_1.CreateUserValidation.username.pattern.test(userData.username)) {
                const response = {
                    success: false,
                    error: "Invalid username format",
                };
                res.status(400).json(response);
                return;
            }
            if (!user_1.CreateUserValidation.email.pattern.test(userData.email)) {
                const response = {
                    success: false,
                    error: "Invalid email format",
                };
                res.status(400).json(response);
                return;
            }
            if (userData.password.length < user_1.CreateUserValidation.password.minLength) {
                const response = {
                    success: false,
                    error: `Password must be at least ${user_1.CreateUserValidation.password.minLength} characters`,
                };
                res.status(400).json(response);
                return;
            }
            const safeUserData = {
                ...userData,
                roles: ["user"],
                enabled: true,
                emailVerified: false,
                attributes: linkedPlayerId ? { playerId: [linkedPlayerId] } : undefined,
            };
            const createdUser = await keycloakAdminService_1.default.createUser(safeUserData);
            const response = {
                success: true,
                data: {
                    id: createdUser.id,
                    username: createdUser.username,
                    email: createdUser.email,
                    message: "Registration successful. Please login.",
                },
            };
            res.status(201).json(response);
        }
        catch (error) {
            if (error.response?.status === 409) {
                const response = {
                    success: false,
                    error: "User with this username or email already exists",
                };
                res.status(409).json(response);
                return;
            }
            this.handleError(res, error, "Registration failed");
        }
    }
    async requestEmailVerification(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ success: false, error: "Not authenticated" });
                return;
            }
            const kcUser = await keycloakAdminService_1.default.getUser(userId);
            if (kcUser.emailVerified) {
                res
                    .status(400)
                    .json({ success: false, error: "Email already verified" });
                return;
            }
            await keycloakAdminService_1.default.executeActionsEmail(userId, ["VERIFY_EMAIL"]);
            res.json({ success: true, message: "Verification email sent" });
        }
        catch (error) {
            this.handleError(res, error, "Failed to send verification email");
        }
    }
    async publicRequestPasswordReset(req, res) {
        try {
            const { email } = req.body;
            if (!email) {
                res.status(400).json({ success: false, error: "Email is required" });
                return;
            }
            const users = await keycloakAdminService_1.default.getUsers(email);
            const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
            if (user && user.id) {
                await keycloakAdminService_1.default.executeActionsEmail(user.id, [
                    "UPDATE_PASSWORD",
                ]);
            }
            res.json({
                success: true,
                message: "If an account exists, a password reset email has been sent.",
            });
        }
        catch (error) {
            console.error("Password reset request error:", error);
            res.json({
                success: true,
                message: "If an account exists, a password reset email has been sent.",
            });
        }
    }
    validateCreateUser(userData) {
        const errors = [];
        if (!userData.username) {
            errors.push("Username is required");
        }
        else if (userData.username.length < user_1.CreateUserValidation.username.minLength) {
            errors.push(`Username must be at least ${user_1.CreateUserValidation.username.minLength} characters`);
        }
        else if (userData.username.length > user_1.CreateUserValidation.username.maxLength) {
            errors.push(`Username must not exceed ${user_1.CreateUserValidation.username.maxLength} characters`);
        }
        else if (!user_1.CreateUserValidation.username.pattern.test(userData.username)) {
            errors.push("Username can only contain letters, numbers, underscores, and hyphens");
        }
        if (!userData.email) {
            errors.push("Email is required");
        }
        else if (!user_1.CreateUserValidation.email.pattern.test(userData.email)) {
            errors.push("Invalid email format");
        }
        if (userData.password &&
            userData.password.length < user_1.CreateUserValidation.password.minLength) {
            errors.push(`Password must be at least ${user_1.CreateUserValidation.password.minLength} characters`);
        }
        if (userData.roles) {
            const invalidRoles = userData.roles.filter((role) => !user_1.CreateUserValidation.roles.validRoles.includes(role));
            if (invalidRoles.length > 0) {
                errors.push(`Invalid roles: ${invalidRoles.join(", ")}`);
            }
        }
        return {
            isValid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined,
        };
    }
    validateUpdateUser(userData) {
        const errors = [];
        if (userData.email &&
            !user_1.UpdateUserValidation.email.pattern.test(userData.email)) {
            errors.push("Invalid email format");
        }
        if (userData.roles) {
            const invalidRoles = userData.roles.filter((role) => !user_1.UpdateUserValidation.roles.validRoles.includes(role));
            if (invalidRoles.length > 0) {
                errors.push(`Invalid roles: ${invalidRoles.join(", ")}`);
            }
        }
        return {
            isValid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined,
        };
    }
}
exports.default = UserController;
//# sourceMappingURL=UserController.js.map