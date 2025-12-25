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
// All user management routes require admin privileges
router.use(auth_1.requireAdmin);
// User CRUD operations
router.get("/", userController.getUsers.bind(userController));
router.get("/roles", userController.getAvailableRoles.bind(userController));
router.get("/:id", userController.getUser.bind(userController));
router.post("/", userController.createUser.bind(userController));
router.put("/:id", userController.updateUser.bind(userController));
router.delete("/:id", userController.deleteUser.bind(userController));
router.post("/claim", userController.claimUser.bind(userController));
// User-specific operations
router.put("/:id/roles", userController.updateUserRoles.bind(userController));
router.post("/:id/password", userController.resetPassword.bind(userController));
exports.default = router;
//# sourceMappingURL=users.js.map