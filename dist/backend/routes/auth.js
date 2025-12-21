"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const UserController_1 = __importDefault(require("../controllers/UserController"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const userController = new UserController_1.default();
router.post('/login', userController.login.bind(userController));
router.post('/register', userController.register.bind(userController));
router.post('/forgot-password', userController.publicRequestPasswordReset.bind(userController));
router.post('/verify-email-request', auth_1.requireAuth, userController.requestEmailVerification.bind(userController));
exports.default = router;
//# sourceMappingURL=auth.js.map