"use strict";
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
            const { search, max = '100' } = req.query;
            const keycloakUsers = await keycloakAdminService_1.default.getUsers(search, parseInt(max));
            const users = keycloakUsers.map(kcUser => ({
                id: kcUser.id,
                username: kcUser.username,
                email: kcUser.email,
                firstName: kcUser.firstName,
                lastName: kcUser.lastName,
                fullName: [kcUser.firstName, kcUser.lastName].filter(Boolean).join(' ') || kcUser.username,
                enabled: kcUser.enabled,
                emailVerified: kcUser.emailVerified,
                roles: kcUser.realmRoles || [],
                isAdmin: (kcUser.realmRoles || []).includes('admin'),
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
            this.handleError(res, error, 'Failed to retrieve users');
        }
    }
    async getUser(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                const response = {
                    success: false,
                    error: 'User ID is required',
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
                fullName: [kcUser.firstName, kcUser.lastName].filter(Boolean).join(' ') || kcUser.username,
                enabled: kcUser.enabled,
                emailVerified: kcUser.emailVerified,
                roles: kcUser.realmRoles || [],
                isAdmin: (kcUser.realmRoles || []).includes('admin'),
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
                    error: 'User not found',
                };
                res.status(404).json(response);
                return;
            }
            this.handleError(res, error, 'Failed to retrieve user');
        }
    }
    async createUser(req, res) {
        try {
            const userData = req.body;
            // Validate input
            const validation = this.validateCreateUser(userData);
            if (!validation.isValid) {
                const response = {
                    success: false,
                    error: 'Validation failed',
                    details: validation.errors,
                };
                res.status(400).json(response);
                return;
            }
            // Ensure default role if none provided
            if (!userData.roles || userData.roles.length === 0) {
                userData.roles = ['user'];
            }
            const serviceRequest = {
                ...userData,
                attributes: userData.playerId ? { playerId: [userData.playerId] } : undefined,
            };
            const kcUser = await keycloakAdminService_1.default.createUser(serviceRequest);
            const user = {
                id: kcUser.id,
                username: kcUser.username,
                email: kcUser.email,
                firstName: kcUser.firstName,
                lastName: kcUser.lastName,
                fullName: [kcUser.firstName, kcUser.lastName].filter(Boolean).join(' ') || kcUser.username,
                enabled: kcUser.enabled,
                emailVerified: kcUser.emailVerified,
                roles: userData.roles,
                isAdmin: userData.roles.includes('admin'),
                playerId: userData.playerId,
            };
            const response = {
                success: true,
                data: user,
                message: 'User created successfully',
            };
            res.status(201).json(response);
        }
        catch (error) {
            if (error.response?.status === 409) {
                const response = {
                    success: false,
                    error: 'User with this username or email already exists',
                };
                res.status(409).json(response);
                return;
            }
            this.handleError(res, error, 'Failed to create user');
        }
    }
    async updateUser(req, res) {
        try {
            const { id } = req.params;
            const userData = req.body;
            if (!id) {
                const response = {
                    success: false,
                    error: 'User ID is required',
                };
                res.status(400).json(response);
                return;
            }
            // Validate input
            const validation = this.validateUpdateUser(userData);
            if (!validation.isValid) {
                const response = {
                    success: false,
                    error: 'Validation failed',
                    details: validation.errors,
                };
                res.status(400).json(response);
                return;
            }
            const serviceRequest = {
                ...userData,
                attributes: userData.playerId ? { playerId: [userData.playerId] } : undefined,
            };
            const kcUser = await keycloakAdminService_1.default.updateUser(id, serviceRequest);
            const user = {
                id: kcUser.id,
                username: kcUser.username,
                email: kcUser.email,
                firstName: kcUser.firstName,
                lastName: kcUser.lastName,
                fullName: [kcUser.firstName, kcUser.lastName].filter(Boolean).join(' ') || kcUser.username,
                enabled: kcUser.enabled,
                emailVerified: kcUser.emailVerified,
                roles: kcUser.realmRoles || [],
                isAdmin: (kcUser.realmRoles || []).includes('admin'),
                playerId: kcUser.attributes?.playerId?.[0],
            };
            const response = {
                success: true,
                data: user,
                message: 'User updated successfully',
            };
            res.json(response);
        }
        catch (error) {
            if (error.response?.status === 404) {
                const response = {
                    success: false,
                    error: 'User not found',
                };
                res.status(404).json(response);
                return;
            }
            this.handleError(res, error, 'Failed to update user');
        }
    }
    async deleteUser(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                const response = {
                    success: false,
                    error: 'User ID is required',
                };
                res.status(400).json(response);
                return;
            }
            // Prevent self-deletion
            if (req.user && req.user.id === id) {
                const response = {
                    success: false,
                    error: 'Cannot delete your own account',
                };
                res.status(403).json(response);
                return;
            }
            await keycloakAdminService_1.default.deleteUser(id);
            const response = {
                success: true,
                message: 'User deleted successfully',
            };
            res.json(response);
        }
        catch (error) {
            if (error.response?.status === 404) {
                const response = {
                    success: false,
                    error: 'User not found',
                };
                res.status(404).json(response);
                return;
            }
            this.handleError(res, error, 'Failed to delete user');
        }
    }
    async resetPassword(req, res) {
        try {
            const { id } = req.params;
            const { newPassword, temporary = false } = req.body;
            if (!id) {
                const response = {
                    success: false,
                    error: 'User ID is required',
                };
                res.status(400).json(response);
                return;
            }
            if (!newPassword || newPassword.length < 8) {
                const response = {
                    success: false,
                    error: 'Password must be at least 8 characters long',
                };
                res.status(400).json(response);
                return;
            }
            await keycloakAdminService_1.default.resetUserPassword(id, newPassword, temporary);
            // Clear required actions to ensure user can login immediately
            if (!temporary) {
                try {
                    await keycloakAdminService_1.default.clearUserRequiredActions(id);
                }
                catch (error) {
                    console.warn('Could not clear required actions after password reset:', error);
                }
            }
            const response = {
                success: true,
                message: `Password ${temporary ? 'reset' : 'updated'} successfully`,
            };
            res.json(response);
        }
        catch (error) {
            if (error.response?.status === 404) {
                const response = {
                    success: false,
                    error: 'User not found',
                };
                res.status(404).json(response);
                return;
            }
            this.handleError(res, error, 'Failed to reset password');
        }
    }
    async updateUserRoles(req, res) {
        try {
            const { id } = req.params;
            const { roles } = req.body;
            if (!id) {
                const response = {
                    success: false,
                    error: 'User ID is required',
                };
                res.status(400).json(response);
                return;
            }
            if (!roles || !Array.isArray(roles)) {
                const response = {
                    success: false,
                    error: 'Roles array is required',
                };
                res.status(400).json(response);
                return;
            }
            // Validate roles
            const validRoles = ['admin', 'user'];
            const invalidRoles = roles.filter(role => !validRoles.includes(role));
            if (invalidRoles.length > 0) {
                const response = {
                    success: false,
                    error: `Invalid roles: ${invalidRoles.join(', ')}`,
                };
                res.status(400).json(response);
                return;
            }
            await keycloakAdminService_1.default.setUserRoles(id, roles);
            const response = {
                success: true,
                message: 'User roles updated successfully',
            };
            res.json(response);
        }
        catch (error) {
            if (error.response?.status === 404) {
                const response = {
                    success: false,
                    error: 'User not found',
                };
                res.status(404).json(response);
                return;
            }
            this.handleError(res, error, 'Failed to update user roles');
        }
    }
    async getAvailableRoles(req, res) {
        try {
            const kcRoles = await keycloakAdminService_1.default.getAvailableRoles();
            const roles = kcRoles.map(role => ({
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
            this.handleError(res, error, 'Failed to retrieve available roles');
        }
    }
    async linkPlayerToSelf(req, res) {
        try {
            const userId = req.user?.id;
            const { playerId } = req.body;
            if (!userId) {
                const response = {
                    success: false,
                    error: 'User not authenticated',
                };
                res.status(401).json(response);
                return;
            }
            if (!playerId) {
                const response = {
                    success: false,
                    error: 'Player ID is required',
                };
                res.status(400).json(response);
                return;
            }
            // Update the user's attributes
            const serviceRequest = {
                attributes: { playerId: [playerId] },
            };
            await keycloakAdminService_1.default.updateUser(userId, serviceRequest);
            // Fetch the updated user to return
            const kcUser = await keycloakAdminService_1.default.getUser(userId);
            const user = {
                id: kcUser.id,
                username: kcUser.username,
                email: kcUser.email,
                firstName: kcUser.firstName,
                lastName: kcUser.lastName,
                fullName: [kcUser.firstName, kcUser.lastName].filter(Boolean).join(' ') || kcUser.username,
                enabled: kcUser.enabled,
                emailVerified: kcUser.emailVerified,
                roles: kcUser.realmRoles || [],
                isAdmin: (kcUser.realmRoles || []).includes('admin'),
                playerId: kcUser.attributes?.playerId?.[0],
            };
            const response = {
                success: true,
                data: user,
                message: 'Player profile linked successfully',
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(res, error, 'Failed to link player profile');
        }
    }
    async claimUser(req, res) {
        try {
            const { email, playerId } = req.body;
            if (!email || !playerId) {
                res.status(400).json({ success: false, error: 'Email and Player ID are required' });
                return;
            }
            // 1. Verify player exists
            const player = await Player_1.Player.findById(playerId);
            if (!player) {
                res.status(404).json({ success: false, error: 'Player not found' });
                return;
            }
            // 2. Generate Claim Token
            const token = jsonwebtoken_1.default.sign({ email, playerId, type: 'claim_profile' }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
            // 3. Send Email
            await MailjetService_1.default.sendClaimInvitation(email, token, player.name);
            res.json({ success: true, message: 'Invitation sent successfully' });
        }
        catch (error) {
            this.handleError(res, error, 'Failed to send claim invitation');
        }
    }
    // Public Registration endpoint (moved logic from routes/auth.ts to controller for better organization)
    async register(req, res) {
        try {
            const { userData, claimToken } = req.body;
            // If claim token exists, decode and override/verify specific fields
            let linkedPlayerId;
            if (claimToken) {
                try {
                    const decoded = jsonwebtoken_1.default.verify(claimToken, process.env.JWT_SECRET || 'secret');
                    if (decoded.type === 'claim_profile') {
                        // Enforce the email/player connection from the token
                        userData.email = decoded.email;
                        linkedPlayerId = decoded.playerId;
                    }
                }
                catch (e) {
                    console.error("Invalid claim token", e);
                    // Proceed without linking if token is invalid? Or fail? 
                    // For now, let's fail to prevent security issues if someone thinks they are claiming but aren't
                    res.status(400).json({ success: false, error: "Invalid or expired claim token" });
                    return;
                }
            }
            // Validate required fields
            if (!userData.username || !userData.email || !userData.password) {
                const response = {
                    success: false,
                    error: 'Missing required fields: username, email, password',
                };
                res.status(400).json(response);
                return;
            }
            // Validate username
            if (userData.username.length < user_1.CreateUserValidation.username.minLength ||
                userData.username.length > user_1.CreateUserValidation.username.maxLength ||
                !user_1.CreateUserValidation.username.pattern.test(userData.username)) {
                const response = {
                    success: false,
                    error: 'Invalid username format',
                };
                res.status(400).json(response);
                return;
            }
            // Validate email
            if (!user_1.CreateUserValidation.email.pattern.test(userData.email)) {
                const response = {
                    success: false,
                    error: 'Invalid email format',
                };
                res.status(400).json(response);
                return;
            }
            // Validate password
            if (userData.password.length < user_1.CreateUserValidation.password.minLength) {
                const response = {
                    success: false,
                    error: `Password must be at least ${user_1.CreateUserValidation.password.minLength} characters`,
                };
                res.status(400).json(response);
                return;
            }
            // Force safe roles for public registration
            const safeUserData = {
                ...userData,
                roles: ['user'],
                enabled: true,
                emailVerified: false,
                attributes: linkedPlayerId ? { playerId: [linkedPlayerId] } : undefined
            };
            // Create user in Keycloak
            const createdUser = await keycloakAdminService_1.default.createUser(safeUserData);
            const response = {
                success: true,
                data: {
                    id: createdUser.id,
                    username: createdUser.username,
                    email: createdUser.email,
                    message: 'Registration successful. Please login.',
                },
            };
            res.status(201).json(response);
        }
        catch (error) {
            if (error.response?.status === 409) {
                const response = {
                    success: false,
                    error: 'User with this username or email already exists',
                };
                res.status(409).json(response);
                return;
            }
            this.handleError(res, error, 'Registration failed');
        }
    }
    async publicRequestPasswordReset(req, res) {
        try {
            const { email } = req.body;
            if (!email) {
                res.status(400).json({ success: false, error: 'Email is required' });
                return;
            }
            // Find user by email
            const users = await keycloakAdminService_1.default.getUsers(email);
            // Keycloak search is fuzzy, so filter exact match
            const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
            if (user && user.id) {
                // Trigger Keycloak reset email
                await keycloakAdminService_1.default.executeActionsEmail(user.id, ['UPDATE_PASSWORD']);
            }
            // Always return success to prevent user enumeration
            res.json({ success: true, message: 'If an account exists, a password reset email has been sent.' });
        }
        catch (error) {
            // Log but return success
            console.error("Password reset request error:", error);
            res.json({ success: true, message: 'If an account exists, a password reset email has been sent.' });
        }
    }
    validateCreateUser(userData) {
        const errors = [];
        // Username validation
        if (!userData.username) {
            errors.push('Username is required');
        }
        else if (userData.username.length < user_1.CreateUserValidation.username.minLength) {
            errors.push(`Username must be at least ${user_1.CreateUserValidation.username.minLength} characters`);
        }
        else if (userData.username.length > user_1.CreateUserValidation.username.maxLength) {
            errors.push(`Username must not exceed ${user_1.CreateUserValidation.username.maxLength} characters`);
        }
        else if (!user_1.CreateUserValidation.username.pattern.test(userData.username)) {
            errors.push('Username can only contain letters, numbers, underscores, and hyphens');
        }
        // Email validation
        if (!userData.email) {
            errors.push('Email is required');
        }
        else if (!user_1.CreateUserValidation.email.pattern.test(userData.email)) {
            errors.push('Invalid email format');
        }
        // Password validation
        if (userData.password && userData.password.length < user_1.CreateUserValidation.password.minLength) {
            errors.push(`Password must be at least ${user_1.CreateUserValidation.password.minLength} characters`);
        }
        // Role validation
        if (userData.roles) {
            const invalidRoles = userData.roles.filter(role => !user_1.CreateUserValidation.roles.validRoles.includes(role));
            if (invalidRoles.length > 0) {
                errors.push(`Invalid roles: ${invalidRoles.join(', ')}`);
            }
        }
        return {
            isValid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined,
        };
    }
    validateUpdateUser(userData) {
        const errors = [];
        // Email validation
        if (userData.email && !user_1.UpdateUserValidation.email.pattern.test(userData.email)) {
            errors.push('Invalid email format');
        }
        // Role validation
        if (userData.roles) {
            const invalidRoles = userData.roles.filter(role => !user_1.UpdateUserValidation.roles.validRoles.includes(role));
            if (invalidRoles.length > 0) {
                errors.push(`Invalid roles: ${invalidRoles.join(', ')}`);
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