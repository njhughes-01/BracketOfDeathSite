import { Response } from 'express';
import { RequestWithAuth } from './base';
import { ApiResponse } from '../types/common';
import {
  User,
  CreateUserInput,
  UpdateUserInput,
  UserFilters,
  ResetPasswordInput,
  UserRole,
  CreateUserValidation,
  UpdateUserValidation,
} from '../types/user';
import keycloakAdminService from '../services/keycloakAdminService';

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
      const { search, max = '100' } = req.query as { search?: string; max?: string };

      const keycloakUsers = await keycloakAdminService.getUsers(search, parseInt(max));

      const users: User[] = keycloakUsers.map(kcUser => ({
        id: kcUser.id!,
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

      const response: ApiResponse<User[]> = {
        success: true,
        data: users,
        message: `Retrieved ${users.length} users`,
      };

      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to retrieve users');
    }
  }

  async getUser(req: RequestWithAuth, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        const response: ApiResponse = {
          success: false,
          error: 'User ID is required',
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
        fullName: [kcUser.firstName, kcUser.lastName].filter(Boolean).join(' ') || kcUser.username,
        enabled: kcUser.enabled,
        emailVerified: kcUser.emailVerified,
        roles: kcUser.realmRoles || [],
        isAdmin: (kcUser.realmRoles || []).includes('admin'),
        playerId: kcUser.attributes?.playerId?.[0],
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
          error: 'User not found',
        };
        res.status(404).json(response);
        return;
      }

      this.handleError(res, error, 'Failed to retrieve user');
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

      const kcUser = await keycloakAdminService.createUser(serviceRequest);

      const user: User = {
        id: kcUser.id!,
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

      const response: ApiResponse<User> = {
        success: true,
        data: user,
        message: 'User created successfully',
      };

      res.status(201).json(response);
    } catch (error: any) {
      if (error.response?.status === 409) {
        const response: ApiResponse = {
          success: false,
          error: 'User with this username or email already exists',
        };
        res.status(409).json(response);
        return;
      }

      this.handleError(res, error, 'Failed to create user');
    }
  }

  async updateUser(req: RequestWithAuth, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userData: UpdateUserInput = req.body;

      if (!id) {
        const response: ApiResponse = {
          success: false,
          error: 'User ID is required',
        };
        res.status(400).json(response);
        return;
      }

      // Validate input
      const validation = this.validateUpdateUser(userData);
      if (!validation.isValid) {
        const response: ApiResponse = {
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

      const kcUser = await keycloakAdminService.updateUser(id, serviceRequest);

      const user: User = {
        id: kcUser.id!,
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

      const response: ApiResponse<User> = {
        success: true,
        data: user,
        message: 'User updated successfully',
      };

      res.json(response);
    } catch (error: any) {
      if (error.response?.status === 404) {
        const response: ApiResponse = {
          success: false,
          error: 'User not found',
        };
        res.status(404).json(response);
        return;
      }

      this.handleError(res, error, 'Failed to update user');
    }
  }

  async deleteUser(req: RequestWithAuth, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        const response: ApiResponse = {
          success: false,
          error: 'User ID is required',
        };
        res.status(400).json(response);
        return;
      }

      // Prevent self-deletion
      if (req.user && req.user.id === id) {
        const response: ApiResponse = {
          success: false,
          error: 'Cannot delete your own account',
        };
        res.status(403).json(response);
        return;
      }

      await keycloakAdminService.deleteUser(id);

      const response: ApiResponse = {
        success: true,
        message: 'User deleted successfully',
      };

      res.json(response);
    } catch (error: any) {
      if (error.response?.status === 404) {
        const response: ApiResponse = {
          success: false,
          error: 'User not found',
        };
        res.status(404).json(response);
        return;
      }

      this.handleError(res, error, 'Failed to delete user');
    }
  }

  async resetPassword(req: RequestWithAuth, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { newPassword, temporary = false }: ResetPasswordInput = req.body;

      if (!id) {
        const response: ApiResponse = {
          success: false,
          error: 'User ID is required',
        };
        res.status(400).json(response);
        return;
      }

      if (!newPassword || newPassword.length < 8) {
        const response: ApiResponse = {
          success: false,
          error: 'Password must be at least 8 characters long',
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
          console.warn('Could not clear required actions after password reset:', error);
        }
      }

      const response: ApiResponse = {
        success: true,
        message: `Password ${temporary ? 'reset' : 'updated'} successfully`,
      };

      res.json(response);
    } catch (error: any) {
      if (error.response?.status === 404) {
        const response: ApiResponse = {
          success: false,
          error: 'User not found',
        };
        res.status(404).json(response);
        return;
      }

      this.handleError(res, error, 'Failed to reset password');
    }
  }

  async updateUserRoles(req: RequestWithAuth, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { roles }: { roles: string[] } = req.body;

      if (!id) {
        const response: ApiResponse = {
          success: false,
          error: 'User ID is required',
        };
        res.status(400).json(response);
        return;
      }

      if (!roles || !Array.isArray(roles)) {
        const response: ApiResponse = {
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
        const response: ApiResponse = {
          success: false,
          error: `Invalid roles: ${invalidRoles.join(', ')}`,
        };
        res.status(400).json(response);
        return;
      }

      await keycloakAdminService.setUserRoles(id, roles);

      const response: ApiResponse = {
        success: true,
        message: 'User roles updated successfully',
      };

      res.json(response);
    } catch (error: any) {
      if (error.response?.status === 404) {
        const response: ApiResponse = {
          success: false,
          error: 'User not found',
        };
        res.status(404).json(response);
        return;
      }

      this.handleError(res, error, 'Failed to update user roles');
    }
  }

  async getAvailableRoles(req: RequestWithAuth, res: Response): Promise<void> {
    try {
      const kcRoles = await keycloakAdminService.getAvailableRoles();

      const roles: UserRole[] = kcRoles.map(role => ({
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
      this.handleError(res, error, 'Failed to retrieve available roles');
    }
  }
  async linkPlayerToSelf(req: RequestWithAuth, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { playerId } = req.body;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          error: 'User not authenticated',
        };
        res.status(401).json(response);
        return;
      }

      if (!playerId) {
        const response: ApiResponse = {
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

      await keycloakAdminService.updateUser(userId, serviceRequest);

      // Fetch the updated user to return
      const kcUser = await keycloakAdminService.getUser(userId);

      const user: User = {
        id: kcUser.id!,
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

      const response: ApiResponse<User> = {
        success: true,
        data: user,
        message: 'Player profile linked successfully',
      };

      res.json(response);
    } catch (error: any) {
      this.handleError(res, error, 'Failed to link player profile');
    }
  }


  private validateCreateUser(userData: CreateUserInput): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];

    // Username validation
    if (!userData.username) {
      errors.push('Username is required');
    } else if (userData.username.length < CreateUserValidation.username.minLength) {
      errors.push(`Username must be at least ${CreateUserValidation.username.minLength} characters`);
    } else if (userData.username.length > CreateUserValidation.username.maxLength) {
      errors.push(`Username must not exceed ${CreateUserValidation.username.maxLength} characters`);
    } else if (!CreateUserValidation.username.pattern.test(userData.username)) {
      errors.push('Username can only contain letters, numbers, underscores, and hyphens');
    }

    // Email validation
    if (!userData.email) {
      errors.push('Email is required');
    } else if (!CreateUserValidation.email.pattern.test(userData.email)) {
      errors.push('Invalid email format');
    }

    // Password validation
    if (userData.password && userData.password.length < CreateUserValidation.password.minLength) {
      errors.push(`Password must be at least ${CreateUserValidation.password.minLength} characters`);
    }

    // Role validation
    if (userData.roles) {
      const invalidRoles = userData.roles.filter(role => !CreateUserValidation.roles.validRoles.includes(role));
      if (invalidRoles.length > 0) {
        errors.push(`Invalid roles: ${invalidRoles.join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private validateUpdateUser(userData: UpdateUserInput): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];

    // Email validation
    if (userData.email && !UpdateUserValidation.email.pattern.test(userData.email)) {
      errors.push('Invalid email format');
    }

    // Role validation
    if (userData.roles) {
      const invalidRoles = userData.roles.filter(role => !UpdateUserValidation.roles.validRoles.includes(role));
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

export default UserController;