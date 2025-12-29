/**
 * Validation Constants
 *
 * Centralized validation rules for user input across the application.
 * Extracted from UserController.ts and types/user.ts.
 */

/**
 * Password validation rules
 */
export const PASSWORD_RULES = {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: false,
} as const;

/**
 * Username validation rules
 */
export const USERNAME_RULES = {
    minLength: 3,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9_-]+$/,
    patternDescription:
        "Username can only contain letters, numbers, underscores, and hyphens",
} as const;

/**
 * Email validation rules
 */
export const EMAIL_RULES = {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    patternDescription: "Invalid email format",
} as const;

/**
 * Name validation rules
 */
export const NAME_RULES = {
    maxLength: 50,
} as const;

/**
 * Valid user roles
 */
export const VALID_ROLES = ["superadmin", "admin", "user"] as const;
export type UserRole = (typeof VALID_ROLES)[number];

/**
 * Valid gender options
 */
export const VALID_GENDERS = ["male", "female", "other"] as const;
export type Gender = (typeof VALID_GENDERS)[number];

/**
 * Validation result interface
 */
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}

/**
 * Validate a password against the rules
 */
export function validatePassword(password: string): ValidationResult {
    const errors: string[] = [];

    if (password.length < PASSWORD_RULES.minLength) {
        errors.push(
            `Password must be at least ${PASSWORD_RULES.minLength} characters`
        );
    }

    if (password.length > PASSWORD_RULES.maxLength) {
        errors.push(
            `Password must not exceed ${PASSWORD_RULES.maxLength} characters`
        );
    }

    if (PASSWORD_RULES.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push("Password must contain at least one uppercase letter");
    }

    if (PASSWORD_RULES.requireLowercase && !/[a-z]/.test(password)) {
        errors.push("Password must contain at least one lowercase letter");
    }

    if (PASSWORD_RULES.requireNumber && !/\d/.test(password)) {
        errors.push("Password must contain at least one number");
    }

    if (
        PASSWORD_RULES.requireSpecial &&
        !/[!@#$%^&*(),.?":{}|<>]/.test(password)
    ) {
        errors.push("Password must contain at least one special character");
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

/**
 * Validate a username against the rules
 */
export function validateUsername(username: string): ValidationResult {
    const errors: string[] = [];

    if (!username) {
        errors.push("Username is required");
    } else {
        if (username.length < USERNAME_RULES.minLength) {
            errors.push(
                `Username must be at least ${USERNAME_RULES.minLength} characters`
            );
        }

        if (username.length > USERNAME_RULES.maxLength) {
            errors.push(
                `Username must not exceed ${USERNAME_RULES.maxLength} characters`
            );
        }

        if (!USERNAME_RULES.pattern.test(username)) {
            errors.push(USERNAME_RULES.patternDescription);
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

/**
 * Validate an email against the rules
 */
export function validateEmail(email: string): ValidationResult {
    const errors: string[] = [];

    if (!email) {
        errors.push("Email is required");
    } else if (!EMAIL_RULES.pattern.test(email)) {
        errors.push(EMAIL_RULES.patternDescription);
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

/**
 * Validate roles against valid roles list
 */
export function validateRoles(roles: string[]): ValidationResult {
    const errors: string[] = [];
    const invalidRoles = roles.filter(
        (role) => !VALID_ROLES.includes(role as UserRole)
    );

    if (invalidRoles.length > 0) {
        errors.push(`Invalid roles: ${invalidRoles.join(", ")}`);
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

/**
 * Validate gender against valid options
 */
export function validateGender(gender: string): ValidationResult {
    const errors: string[] = [];

    if (!VALID_GENDERS.includes(gender as Gender)) {
        errors.push(`Invalid gender. Must be one of: ${VALID_GENDERS.join(", ")}`);
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

/**
 * Combine multiple validation results
 */
export function combineValidations(
    ...results: ValidationResult[]
): ValidationResult {
    const allErrors = results.flatMap((r) => r.errors);
    return {
        isValid: allErrors.length === 0,
        errors: allErrors,
    };
}
