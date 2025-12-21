"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const UserController_1 = __importDefault(require("../controllers/UserController"));
const ProfileController_1 = __importDefault(require("../controllers/ProfileController"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const userController = new UserController_1.default();
router.use(auth_1.requireAuth);
router.get('/', ProfileController_1.default.getProfile.bind(ProfileController_1.default));
router.put('/', ProfileController_1.default.updateProfile.bind(ProfileController_1.default));
router.post('/link-player', userController.linkPlayerToSelf.bind(userController));
router.post('/password', ProfileController_1.default.changePassword.bind(ProfileController_1.default));
exports.default = router;
//# sourceMappingURL=profile.js.map