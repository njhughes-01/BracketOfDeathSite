"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateUserValidation = exports.CreateUserValidation = void 0;
exports.CreateUserValidation = {
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
exports.UpdateUserValidation = {
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
//# sourceMappingURL=user.js.map