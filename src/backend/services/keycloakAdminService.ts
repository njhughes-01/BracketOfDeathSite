import axios, { AxiosInstance } from 'axios';

export interface KeycloakUser {
  id?: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  enabled: boolean;
  emailVerified?: boolean;
  credentials?: Array<{
    type: string;
    value: string;
    temporary: boolean;
  }>;
  realmRoles?: string[];
  groups?: string[];
  attributes?: Record<string, string[]>;
}

interface CreateUserRequest {
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  temporary?: boolean;
  roles?: string[];
  attributes?: Record<string, string[]>;
}

interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  enabled?: boolean;
  roles?: string[];
  attributes?: Record<string, string[]>;
}

// ... (KeycloakAdminService class definition)


class KeycloakAdminService {
  private client: AxiosInstance;
  private adminToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.client = axios.create({
      baseURL: `${process.env.KEYCLOAK_URL}/admin/realms/${process.env.KEYCLOAK_REALM}`,
      timeout: 10000,
    });
  }

  private async getAdminToken(): Promise<string> {
    const now = Date.now();

    // Return cached token if still valid (with 30 second buffer)
    if (this.adminToken && now < this.tokenExpiry - 30000) {
      return this.adminToken;
    }

    try {
      const response = await axios.post(
        `${process.env.KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`,
        new URLSearchParams({
          username: process.env.KEYCLOAK_ADMIN_USER!,
          password: process.env.KEYCLOAK_ADMIN_PASSWORD!,
          grant_type: 'password',
          client_id: 'admin-cli',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.adminToken = response.data.access_token;
      this.tokenExpiry = now + (response.data.expires_in * 1000);

      return this.adminToken;
    } catch (error) {
      console.error('Failed to get Keycloak admin token:', error);
      throw new Error('Failed to authenticate with Keycloak admin API');
    }
  }

  private async makeAuthenticatedRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    data?: any
  ): Promise<T> {
    const token = await this.getAdminToken();

    const config = {
      method,
      url,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      ...(data && { data }),
    };

    try {
      const response = await this.client.request(config);
      return response.data;
    } catch (error: any) {
      console.error(`Keycloak API error (${method} ${url}):`, error.response?.data || error.message);
      throw error;
    }
  }

  private async makeAuthenticatedRequestWithResponse(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    data?: any
  ): Promise<any> {
    const token = await this.getAdminToken();

    const config = {
      method,
      url,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      ...(data && { data }),
    };

    try {
      const response = await this.client.request(config);
      return response;
    } catch (error: any) {
      console.error(`Keycloak API error (${method} ${url}):`, error.response?.data || error.message);
      throw error;
    }
  }

  async createUser(userData: CreateUserRequest): Promise<KeycloakUser> {
    const keycloakUser: any = {
      username: userData.username,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      enabled: true,
      emailVerified: true,
      requiredActions: [], // Ensure no required actions block login
      attributes: userData.attributes,
    };

    // Add password if provided
    if (userData.password) {
      keycloakUser.credentials = [
        {
          type: 'password',
          value: userData.password,
          temporary: userData.temporary ?? false,
        },
      ];
    }

    // Create the user and get the Location header with the user ID
    const response = await this.makeAuthenticatedRequestWithResponse('POST', '/users', keycloakUser);

    // Extract user ID from Location header (e.g., .../users/12345-abcd-6789)
    const locationHeader = response.headers?.location;
    if (!locationHeader) {
      throw new Error('User creation failed: No location header returned');
    }

    const userId = locationHeader.split('/').pop();
    if (!userId) {
      throw new Error('User creation failed: Could not extract user ID from location header');
    }

    // Get the created user by ID
    const createdUser = await this.getUser(userId);

    // Assign roles if provided
    if (userData.roles && userData.roles.length > 0) {
      await this.assignRolesToUser(userId, userData.roles);
    }

    // Explicitly clear required actions to prevent "Account not fully set up" errors
    try {
      await this.clearUserRequiredActions(userId);
    } catch (error) {
      console.warn(`Failed to clear required actions for new user ${userData.username}:`, error);
    }

    return createdUser;
  }

  async getUsers(search?: string, max?: number): Promise<KeycloakUser[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (max) params.append('max', max.toString());

    return this.makeAuthenticatedRequest<KeycloakUser[]>(
      'GET',
      `/users?${params.toString()}`
    );
  }

  async getUser(userId: string): Promise<KeycloakUser> {
    const user = await this.makeAuthenticatedRequest<KeycloakUser>(
      'GET',
      `/users/${userId}`
    );

    // Get user's roles
    const realmRoles = await this.makeAuthenticatedRequest<Array<{ name: string }>>(
      'GET',
      `/users/${userId}/role-mappings/realm`
    );

    user.realmRoles = realmRoles.map(role => role.name);

    return user;
  }

  async updateUser(userId: string, userData: UpdateUserRequest): Promise<KeycloakUser> {
    const updateData: Partial<KeycloakUser> = {};

    if (userData.firstName !== undefined) updateData.firstName = userData.firstName;
    if (userData.lastName !== undefined) updateData.lastName = userData.lastName;
    if (userData.email !== undefined) updateData.email = userData.email;
    if (userData.enabled !== undefined) updateData.enabled = userData.enabled;
    if (userData.attributes !== undefined) updateData.attributes = userData.attributes;

    await this.makeAuthenticatedRequest('PUT', `/users/${userId}`, updateData);

    // Update roles if provided
    if (userData.roles) {
      await this.setUserRoles(userId, userData.roles);
    }

    return this.getUser(userId);
  }

  async deleteUser(userId: string): Promise<void> {
    await this.makeAuthenticatedRequest('DELETE', `/users/${userId}`);
  }

  async resetUserPassword(userId: string, newPassword: string, temporary = false): Promise<void> {
    const credentialData = {
      type: 'password',
      value: newPassword,
      temporary,
    };

    await this.makeAuthenticatedRequest('PUT', `/users/${userId}/reset-password`, credentialData);

    // Clear any required actions that might prevent login
    if (!temporary) {
      try {
        await this.makeAuthenticatedRequest('PUT', `/users/${userId}`, {
          requiredActions: []
        });
      } catch (error) {
        console.warn('Could not clear required actions for user:', error);
      }
    }
  }

  async assignRolesToUser(userId: string, roleNames: string[]): Promise<void> {
    // Get all realm roles
    const allRoles = await this.makeAuthenticatedRequest<Array<{ id: string; name: string }>>(
      'GET',
      '/roles'
    );

    // Filter to only the roles we want to assign
    const rolesToAssign = allRoles.filter(role => roleNames.includes(role.name));

    if (rolesToAssign.length > 0) {
      await this.makeAuthenticatedRequest(
        'POST',
        `/users/${userId}/role-mappings/realm`,
        rolesToAssign
      );
    }
  }

  async removeRolesFromUser(userId: string, roleNames: string[]): Promise<void> {
    // Get all realm roles
    const allRoles = await this.makeAuthenticatedRequest<Array<{ id: string; name: string }>>(
      'GET',
      '/roles'
    );

    // Filter to only the roles we want to remove
    const rolesToRemove = allRoles.filter(role => roleNames.includes(role.name));

    if (rolesToRemove.length > 0) {
      await this.makeAuthenticatedRequest(
        'DELETE',
        `/users/${userId}/role-mappings/realm`,
        rolesToRemove
      );
    }
  }

  async setUserRoles(userId: string, roleNames: string[]): Promise<void> {
    // Get current user roles
    const currentRoles = await this.makeAuthenticatedRequest<Array<{ name: string }>>(
      'GET',
      `/users/${userId}/role-mappings/realm`
    );

    const currentRoleNames = currentRoles.map(role => role.name);

    // Determine roles to add and remove
    const rolesToAdd = roleNames.filter(role => !currentRoleNames.includes(role));
    const rolesToRemove = currentRoleNames.filter(role => !roleNames.includes(role));

    // Add new roles
    if (rolesToAdd.length > 0) {
      await this.assignRolesToUser(userId, rolesToAdd);
    }

    // Remove old roles
    if (rolesToRemove.length > 0) {
      await this.removeRolesFromUser(userId, rolesToRemove);
    }
  }

  async getAvailableRoles(): Promise<Array<{ id: string; name: string; description?: string }>> {
    return this.makeAuthenticatedRequest<Array<{ id: string; name: string; description?: string }>>(
      'GET',
      '/roles'
    );
  }

  async clearUserRequiredActions(userId: string): Promise<void> {
    await this.makeAuthenticatedRequest('PUT', `/users/${userId}`, {
      requiredActions: []
    });
  }

  async executeActionsEmail(userId: string, actions: string[]): Promise<void> {
    await this.makeAuthenticatedRequest(
      'PUT',
      `/users/${userId}/execute-actions-email`,
      actions
    );
  }

  async getUsersInRole(roleName: string): Promise<KeycloakUser[]> {
    return this.makeAuthenticatedRequest<KeycloakUser[]>(
      'GET',
      `/roles/${roleName}/users`
    );
  }
}

export const keycloakAdminService = new KeycloakAdminService();
export default keycloakAdminService;