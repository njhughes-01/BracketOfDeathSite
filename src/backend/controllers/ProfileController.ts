import { Response } from 'express';
import { RequestWithAuth } from './base';
import { ApiResponse } from '../types/common';
import { Player } from '../models/Player';
import { IPlayer } from '../types/player';
import keycloakAdminService from '../services/keycloakAdminService';

class ProfileController {
    private handleError(res: Response, error: any, message: string): void {
        console.error(message, error);
        const response: ApiResponse = {
            success: false,
            error: error.message || message,
        };
        res.status(500).json(response);
    }

    // Get current user's profile which includes user data and linked player data
    async getProfile(req: RequestWithAuth, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;

            if (!userId) {
                res.status(401).json({ success: false, error: 'Not authenticated' });
                return;
            }

            // Fetch user from Keycloak to get latest attributes (playerId)
            const kcUser = await keycloakAdminService.getUser(userId);
            const playerId = kcUser.attributes?.playerId?.[0];

            let playerData: IPlayer | null = null;
            if (playerId) {
                playerData = await Player.findById(playerId);
            }

            // Determine if user should skip onboarding (isComplete)
            // Super Admin (admin:admin123) OR any user with 'admin' role is considered complete automatically
            // Check fresh Keycloak roles to avoid race conditions with token claims
            const userRoles = kcUser.realmRoles || [];
            const isSuperAdmin = kcUser.username === 'admin' || kcUser.username === (process.env.KEYCLOAK_ADMIN_USER || 'admin');
            const isAdmin = userRoles.includes('admin') || (req.user?.isAdmin || false);
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
                    fullName: [kcUser.firstName, kcUser.lastName].filter(Boolean).join(' ') || kcUser.username,
                    roles: kcUser.realmRoles || [],
                    playerId: playerId,
                },
                player: playerData,
                isComplete: isSuperAdmin || isAdmin || isPlayerComplete
            };

            const response: ApiResponse = {
                success: true,
                data: profileData,
            };

            res.json(response);
        } catch (error) {
            this.handleError(res, error, 'Failed to retrieve profile');
        }
    }

    // Update current user's profile (specifically the player data)
    async updateProfile(req: RequestWithAuth, res: Response): Promise<void> {
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

            // 1. Get User
            const kcUser = await keycloakAdminService.getUser(userId);
            let playerId = kcUser.attributes?.playerId?.[0];
            let player: IPlayer | null = null;

            if (playerId) {
                // 2a. Update existing player
                player = await Player.findByIdAndUpdate(
                    playerId,
                    { gender, bracketPreference },
                    { new: true, runValidators: true }
                );
            } else {
                // 2b. Create new player
                // Use user's name or username for the player name
                const name = [kcUser.firstName, kcUser.lastName].filter(Boolean).join(' ') || kcUser.username || 'Unknown Player';

                // Check if name exists, append random if so? Or just try create and fail?
                // Let's rely on unique constraint but maybe handle error gracefully?
                // Actually, for now, let's just try to create. 
                // NOTE: In a real app we might ask user to confirm name if auto-generated one is taken.
                // For Onboarding, we assume the user just registered, so they probably don't have a player yet.

                // Simple logic: Try to create with user's name.
                try {
                    player = await Player.create({
                        name,
                        gender,
                        bracketPreference,
                        isActive: true
                    });
                    playerId = player.id; // Corrected: Use .id for string representation if needed, but _id is ObjectId

                    // Link to User
                    await keycloakAdminService.updateUser(userId, {
                        attributes: { playerId: [player.id] } // Use .id property from mongoose doc
                    });
                } catch (creationError: any) {
                    if (creationError.code === 11000) {
                        // Name duplicate. 
                        // Fallback: append userId suffix or handle error.
                        // Sending error back to frontend to let them know might be better if we had a name field in onboarding.
                        // But since we don't, let's try to make it unique.
                        const uniqueName = `${name} (${userId.substring(0, 4)})`;
                        player = await Player.create({
                            name: uniqueName,
                            gender,
                            bracketPreference,
                            isActive: true
                        });
                        playerId = player.id;
                        await keycloakAdminService.updateUser(userId, {
                            attributes: { playerId: [player.id] }
                        });
                    } else {
                        throw creationError;
                    }
                }
            }

            const response: ApiResponse = {
                success: true,
                data: player,
                message: 'Profile updated successfully',
            };

            res.json(response);

        } catch (error) {
            this.handleError(res, error, 'Failed to update profile');
        }
    }

    // Change password for the current user
    async changePassword(req: RequestWithAuth, res: Response): Promise<void> {
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

            // 1. Verify current password by attempting a login
            const kcUser = await keycloakAdminService.getUser(userId);
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
                // We use dynamic import for axios as seen in UserController
                await import('axios').then(a => a.default.post(tokenUrl, params, {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                }));
            } catch (authError) {
                // If login fails, current password is wrong
                res.status(401).json({ success: false, error: 'Invalid current password' });
                return;
            }

            // 2. If verification successful, update password
            await keycloakAdminService.resetUserPassword(userId, newPassword, false);

            res.json({ success: true, message: 'Password updated successfully' });

        } catch (error) {
            this.handleError(res, error, 'Failed to update password');
        }
    }
}

export default new ProfileController();
