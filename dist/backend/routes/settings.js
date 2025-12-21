"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const SettingsController_1 = __importDefault(require("../controllers/SettingsController"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get('/email/status', auth_1.requireAuth, SettingsController_1.default.isEmailConfigured);
router.get('/', auth_1.requireSuperAdmin, SettingsController_1.default.getSettings);
router.put('/', auth_1.requireSuperAdmin, SettingsController_1.default.updateSettings);
router.post('/email/test', auth_1.requireSuperAdmin, SettingsController_1.default.testEmail);
exports.default = router;
//# sourceMappingURL=settings.js.map