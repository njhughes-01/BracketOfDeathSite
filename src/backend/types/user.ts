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

// Validation schemas
export const CreateUserValidation = {
  username: {
    required: true,
    minLength: 3,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9_-]+$/,
  },
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  firstName: {
    maxLength: 50,
  },
  lastName: {
    maxLength: 50,
  },
  password: {
    minLength: 8,
    maxLength: 128,
  },
  roles: {
    validRoles: ["superadmin", "admin", "user"],
  },
};

export const UpdateUserValidation = {
  firstName: {
    maxLength: 50,
  },
  lastName: {
    maxLength: 50,
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  roles: {
    validRoles: ["superadmin", "admin", "user"],
  },
};
