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
            // Only Super Admin (admin:admin123) is considered complete automatically
            // to avoid forcing the bootstrap account to create a player profile.
            const isSuperAdmin = kcUser.username === 'admin' || kcUser.username === (process.env.KEYCLOAK_ADMIN_USER || 'admin');
            const isPlayerComplete = !!(playerData && playerData.gender);

            // Construct the response profile object
            const profileData = {
                user: {
                    id: kcUser.id,
                    username: kcUser.username,
                    email: kcUser.email,
                    firstName: kcUser.firstName,
                    lastName: kcUser.lastName,
                    fullName: [kcUser.firstName, kcUser.lastName].filter(Boolean).join(' ') || kcUser.username,
                    roles: kcUser.realmRoles || [],
                    playerId: playerId,
                },
                player: playerData,
                isComplete: isSuperAdmin || isPlayerComplete
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
}

export default new ProfileController();
