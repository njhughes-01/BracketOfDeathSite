interface KeycloakUser {
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
}
interface CreateUserRequest {
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    password?: string;
    temporary?: boolean;
    roles?: string[];
}
interface UpdateUserRequest {
    firstName?: string;
    lastName?: string;
    email?: string;
    enabled?: boolean;
    roles?: string[];
}
declare class KeycloakAdminService {
    private client;
    private adminToken;
    private tokenExpiry;
    constructor();
    private getAdminToken;
    private makeAuthenticatedRequest;
    private makeAuthenticatedRequestWithResponse;
    createUser(userData: CreateUserRequest): Promise<KeycloakUser>;
    getUsers(search?: string, max?: number): Promise<KeycloakUser[]>;
    getUser(userId: string): Promise<KeycloakUser>;
    updateUser(userId: string, userData: UpdateUserRequest): Promise<KeycloakUser>;
    deleteUser(userId: string): Promise<void>;
    resetUserPassword(userId: string, newPassword: string, temporary?: boolean): Promise<void>;
    assignRolesToUser(userId: string, roleNames: string[]): Promise<void>;
    removeRolesFromUser(userId: string, roleNames: string[]): Promise<void>;
    setUserRoles(userId: string, roleNames: string[]): Promise<void>;
    getAvailableRoles(): Promise<Array<{
        id: string;
        name: string;
        description?: string;
    }>>;
}
export declare const keycloakAdminService: KeycloakAdminService;
export default keycloakAdminService;
//# sourceMappingURL=keycloakAdminService.d.ts.map