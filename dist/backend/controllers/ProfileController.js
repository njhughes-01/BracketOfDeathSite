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
const Player_1 = require("../models/Player");
const keycloakAdminService_1 = __importDefault(require("../services/keycloakAdminService"));
class ProfileController {
    handleError(res, error, message) {
        console.error(message, error);
        const response = {
            success: false,
            error: error.message || message,
        };
        res.status(500).json(response);
    }
    async getProfile(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ success: false, error: 'Not authenticated' });
                return;
            }
            const kcUser = await keycloakAdminService_1.default.getUser(userId);
            const playerId = kcUser.attributes?.playerId?.[0];
            let playerData = null;
            if (playerId) {
                playerData = await Player_1.Player.findById(playerId);
            }
            const isSuperAdmin = kcUser.username === 'admin' || kcUser.username === (process.env.KEYCLOAK_ADMIN_USER || 'admin');
            const isAdmin = req.user?.isAdmin || false;
            const isPlayerComplete = !!(playerData && playerData.gender);
            const profileData = {
                user: {
                    id: kcUser.id,
                    username: kcUser.username,
                    email: kcUser.email,
                    emailVerified: kcUser.emailVerified,
                    firstName: kcUser.firstName,
                    lastName: kcUser.lastName,
                    fullName: [kcUser.firstName, kcUser.lastName].filter(Boolean).join(' ') || kcUser.username,
                    roles: kcUser.realmRoles || [],
                    playerId: playerId,
                },
                player: playerData,
                isComplete: isSuperAdmin || isAdmin || isPlayerComplete
            };
            const response = {
                success: true,
                data: profileData,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(res, error, 'Failed to retrieve profile');
        }
    }
    async updateProfile(req, res) {
        try {
            const userId = req.user?.id;
            const { gender, bracketPreference } = req.body;
            if (!userId) {
                res.status(401).json({ success: false, error: 'Not authenticated' });
                return;
            }
            if (!gender) {
                res.status(400).json({ success: false, error: 'Gender is required' });
                return;
            }
            const kcUser = await keycloakAdminService_1.default.getUser(userId);
            let playerId = kcUser.attributes?.playerId?.[0];
            let player = null;
            if (playerId) {
                player = await Player_1.Player.findByIdAndUpdate(playerId, { gender, bracketPreference }, { new: true, runValidators: true });
            }
            else {
                const name = [kcUser.firstName, kcUser.lastName].filter(Boolean).join(' ') || kcUser.username || 'Unknown Player';
                try {
                    player = await Player_1.Player.create({
                        name,
                        gender,
                        bracketPreference,
                        isActive: true
                    });
                    playerId = player.id;
                    await keycloakAdminService_1.default.updateUser(userId, {
                        attributes: { playerId: [player.id] }
                    });
                }
                catch (creationError) {
                    if (creationError.code === 11000) {
                        const uniqueName = `${name} (${userId.substring(0, 4)})`;
                        player = await Player_1.Player.create({
                            name: uniqueName,
                            gender,
                            bracketPreference,
                            isActive: true
                        });
                        playerId = player.id;
                        await keycloakAdminService_1.default.updateUser(userId, {
                            attributes: { playerId: [player.id] }
                        });
                    }
                    else {
                        throw creationError;
                    }
                }
            }
            const response = {
                success: true,
                data: player,
                message: 'Profile updated successfully',
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(res, error, 'Failed to update profile');
        }
    }
    async changePassword(req, res) {
        try {
            const userId = req.user?.id;
            const { currentPassword, newPassword } = req.body;
            if (!userId) {
                res.status(401).json({ success: false, error: 'Not authenticated' });
                return;
            }
            if (!currentPassword || !newPassword) {
                res.status(400).json({ success: false, error: 'Current and new password are required' });
                return;
            }
            if (newPassword.length < 8) {
                res.status(400).json({ success: false, error: 'New password must be at least 8 characters' });
                return;
            }
            const kcUser = await keycloakAdminService_1.default.getUser(userId);
            if (!kcUser.username) {
                res.status(404).json({ success: false, error: 'User not found' });
                return;
            }
            const tokenUrl = `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`;
            const params = new URLSearchParams();
            params.append('username', kcUser.username);
            params.append('password', currentPassword);
            params.append('grant_type', 'password');
            params.append('client_id', process.env.KEYCLOAK_CLIENT_ID || 'bod-app');
            if (process.env.KEYCLOAK_CLIENT_SECRET) {
                params.append('client_secret', process.env.KEYCLOAK_CLIENT_SECRET);
            }
            try {
                await Promise.resolve().then(() => __importStar(require('axios'))).then(a => a.default.post(tokenUrl, params, {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                }));
            }
            catch (authError) {
                res.status(401).json({ success: false, error: 'Invalid current password' });
                return;
            }
            await keycloakAdminService_1.default.resetUserPassword(userId, newPassword, false);
            res.json({ success: true, message: 'Password updated successfully' });
        }
        catch (error) {
            this.handleError(res, error, 'Failed to update password');
        }
    }
}
exports.default = new ProfileController();
//# sourceMappingURL=ProfileController.js.map