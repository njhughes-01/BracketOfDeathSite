"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.keycloakAdminService = void 0;
const axios_1 = __importDefault(require("axios"));
class KeycloakAdminService {
    client;
    adminToken = null;
    tokenExpiry = 0;
    constructor() {
        this.client = axios_1.default.create({
            baseURL: `${process.env.KEYCLOAK_URL}/admin/realms/${process.env.KEYCLOAK_REALM}`,
            timeout: 10000,
        });
    }
    async getAdminToken() {
        const now = Date.now();
        if (this.adminToken && now < this.tokenExpiry - 30000) {
            return this.adminToken;
        }
        try {
            const response = await axios_1.default.post(`${process.env.KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`, new URLSearchParams({
                username: process.env.KEYCLOAK_ADMIN_USER,
                password: process.env.KEYCLOAK_ADMIN_PASSWORD,
                grant_type: 'password',
                client_id: 'admin-cli',
            }), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            this.adminToken = response.data.access_token;
            this.tokenExpiry = now + (response.data.expires_in * 1000);
            return this.adminToken;
        }
        catch (error) {
            console.error('Failed to get Keycloak admin token:', error);
            throw new Error('Failed to authenticate with Keycloak admin API');
        }
    }
    async makeAuthenticatedRequest(method, url, data) {
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
        }
        catch (error) {
            console.error(`Keycloak API error (${method} ${url}):`, error.response?.data || error.message);
            throw error;
        }
    }
    async makeAuthenticatedRequestWithResponse(method, url, data) {
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
        }
        catch (error) {
            console.error(`Keycloak API error (${method} ${url}):`, error.response?.data || error.message);
            throw error;
        }
    }
    async createUser(userData) {
        const keycloakUser = {
            username: userData.username,
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            enabled: true,
            emailVerified: true,
            requiredActions: [],
            attributes: userData.attributes,
        };
        if (userData.password) {
            keycloakUser.credentials = [
                {
                    type: 'password',
                    value: userData.password,
                    temporary: userData.temporary ?? false,
                },
            ];
        }
        const response = await this.makeAuthenticatedRequestWithResponse('POST', '/users', keycloakUser);
        const locationHeader = response.headers?.location;
        if (!locationHeader) {
            throw new Error('User creation failed: No location header returned');
        }
        const userId = locationHeader.split('/').pop();
        if (!userId) {
            throw new Error('User creation failed: Could not extract user ID from location header');
        }
        const createdUser = await this.getUser(userId);
        if (userData.roles && userData.roles.length > 0) {
            await this.assignRolesToUser(userId, userData.roles);
        }
        return createdUser;
    }
    async getUsers(search, max) {
        const params = new URLSearchParams();
        if (search)
            params.append('search', search);
        if (max)
            params.append('max', max.toString());
        return this.makeAuthenticatedRequest('GET', `/users?${params.toString()}`);
    }
    async getUser(userId) {
        const user = await this.makeAuthenticatedRequest('GET', `/users/${userId}`);
        const realmRoles = await this.makeAuthenticatedRequest('GET', `/users/${userId}/role-mappings/realm`);
        user.realmRoles = realmRoles.map(role => role.name);
        return user;
    }
    async updateUser(userId, userData) {
        const updateData = {};
        if (userData.firstName !== undefined)
            updateData.firstName = userData.firstName;
        if (userData.lastName !== undefined)
            updateData.lastName = userData.lastName;
        if (userData.email !== undefined)
            updateData.email = userData.email;
        if (userData.enabled !== undefined)
            updateData.enabled = userData.enabled;
        if (userData.attributes !== undefined)
            updateData.attributes = userData.attributes;
        await this.makeAuthenticatedRequest('PUT', `/users/${userId}`, updateData);
        if (userData.roles) {
            await this.setUserRoles(userId, userData.roles);
        }
        return this.getUser(userId);
    }
    async deleteUser(userId) {
        await this.makeAuthenticatedRequest('DELETE', `/users/${userId}`);
    }
    async resetUserPassword(userId, newPassword, temporary = false) {
        const credentialData = {
            type: 'password',
            value: newPassword,
            temporary,
        };
        await this.makeAuthenticatedRequest('PUT', `/users/${userId}/reset-password`, credentialData);
        if (!temporary) {
            try {
                await this.makeAuthenticatedRequest('PUT', `/users/${userId}`, {
                    requiredActions: []
                });
            }
            catch (error) {
                console.warn('Could not clear required actions for user:', error);
            }
        }
    }
    async assignRolesToUser(userId, roleNames) {
        const allRoles = await this.makeAuthenticatedRequest('GET', '/roles');
        const rolesToAssign = allRoles.filter(role => roleNames.includes(role.name));
        if (rolesToAssign.length > 0) {
            await this.makeAuthenticatedRequest('POST', `/users/${userId}/role-mappings/realm`, rolesToAssign);
        }
    }
    async removeRolesFromUser(userId, roleNames) {
        const allRoles = await this.makeAuthenticatedRequest('GET', '/roles');
        const rolesToRemove = allRoles.filter(role => roleNames.includes(role.name));
        if (rolesToRemove.length > 0) {
            await this.makeAuthenticatedRequest('DELETE', `/users/${userId}/role-mappings/realm`, rolesToRemove);
        }
    }
    async setUserRoles(userId, roleNames) {
        const currentRoles = await this.makeAuthenticatedRequest('GET', `/users/${userId}/role-mappings/realm`);
        const currentRoleNames = currentRoles.map(role => role.name);
        const rolesToAdd = roleNames.filter(role => !currentRoleNames.includes(role));
        const rolesToRemove = currentRoleNames.filter(role => !roleNames.includes(role));
        if (rolesToAdd.length > 0) {
            await this.assignRolesToUser(userId, rolesToAdd);
        }
        if (rolesToRemove.length > 0) {
            await this.removeRolesFromUser(userId, rolesToRemove);
        }
    }
    async getAvailableRoles() {
        return this.makeAuthenticatedRequest('GET', '/roles');
    }
    async clearUserRequiredActions(userId) {
        await this.makeAuthenticatedRequest('PUT', `/users/${userId}`, {
            requiredActions: []
        });
    }
    async executeActionsEmail(userId, actions) {
        await this.makeAuthenticatedRequest('PUT', `/users/${userId}/execute-actions-email`, actions);
    }
}
exports.keycloakAdminService = new KeycloakAdminService();
exports.default = exports.keycloakAdminService;
//# sourceMappingURL=keycloakAdminService.js.map