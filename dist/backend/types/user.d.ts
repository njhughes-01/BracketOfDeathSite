export interface User {
    id: string;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    enabled: boolean;
    emailVerified?: boolean;
    roles: string[];
    isAdmin: boolean;
    isSuperAdmin: boolean;
    playerId?: string;
    createdAt?: Date;
    lastLogin?: Date;
}
export interface CreateUserInput {
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    password?: string;
    temporary?: boolean;
    roles?: string[];
    playerId?: string;
}
export interface UpdateUserInput {
    firstName?: string;
    lastName?: string;
    email?: string;
    enabled?: boolean;
    roles?: string[];
    playerId?: string;
}
export interface UserFilters {
    search?: string;
    enabled?: boolean;
    role?: string;
}
export interface ResetPasswordInput {
    newPassword: string;
    temporary?: boolean;
}
export interface UserRole {
    id: string;
    name: string;
    description?: string;
}
export interface UserListResponse {
    users: User[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export declare const CreateUserValidation: {
    username: {
        required: boolean;
        minLength: number;
        maxLength: number;
        pattern: RegExp;
    };
    email: {
        required: boolean;
        pattern: RegExp;
    };
    firstName: {
        maxLength: number;
    };
    lastName: {
        maxLength: number;
    };
    password: {
        minLength: number;
        maxLength: number;
    };
    roles: {
        validRoles: string[];
    };
};
export declare const UpdateUserValidation: {
    firstName: {
        maxLength: number;
    };
    lastName: {
        maxLength: number;
    };
    email: {
        pattern: RegExp;
    };
    roles: {
        validRoles: string[];
    };
};
//# sourceMappingURL=user.d.ts.map