"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const PlayerController_1 = __importDefault(require("../controllers/PlayerController"));
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const router = (0, express_1.Router)();
// Public routes (read-only)
router.get("/", validation_1.validatePagination, PlayerController_1.default.getAll);
router.get("/search", validation_1.validatePagination, PlayerController_1.default.search);
router.get("/stats", PlayerController_1.default.getStats);
router.get("/champions", PlayerController_1.default.getChampions);
router.get("/:id", validation_1.validateObjectId, PlayerController_1.default.getById);
router.get("/:id/performance", validation_1.validateObjectId, PlayerController_1.default.getPerformanceTrends);
router.get("/:id/scoring", validation_1.validateObjectId, PlayerController_1.default.getScoringSummary);
// Protected routes (require admin)
router.post("/", auth_1.requireAdmin, PlayerController_1.default.create);
router.put("/:id", auth_1.requireAdmin, validation_1.validateObjectId, PlayerController_1.default.update);
router.patch("/:id/stats", auth_1.requireAdmin, validation_1.validateObjectId, PlayerController_1.default.updateStats);
router.delete("/:id", auth_1.requireAdmin, validation_1.validateObjectId, PlayerController_1.default.delete);
// Admin routes
router.post("/bulk-import", auth_1.requireAdmin, PlayerController_1.default.bulkImport);
exports.default = router;
//# sourceMappingURL=players.js.map