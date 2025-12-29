"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const UserController_1 = __importDefault(require("../controllers/UserController"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All user management routes require admin privileges
router.use(auth_1.requireAdmin);
// User CRUD operations
router.get("/", UserController_1.default.getUsers);
router.get("/roles", UserController_1.default.getAvailableRoles);
router.get("/:id", UserController_1.default.getUser);
router.post("/", UserController_1.default.createUser);
router.put("/:id", UserController_1.default.updateUser);
router.delete("/:id", UserController_1.default.deleteUser);
router.post("/claim", UserController_1.default.claimUser);
// User-specific operations
router.put("/:id/roles", UserController_1.default.updateUserRoles);
router.post("/:id/password", UserController_1.default.resetPassword);
exports.default = router;
//# sourceMappingURL=users.js.map