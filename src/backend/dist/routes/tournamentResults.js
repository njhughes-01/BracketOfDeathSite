"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const TournamentResultController_1 = __importDefault(require("../controllers/TournamentResultController"));
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const router = (0, express_1.Router)();
// Public routes (read-only)
router.get("/", TournamentResultController_1.default.getAll);
router.get("/search", TournamentResultController_1.default.search);
router.get("/stats", TournamentResultController_1.default.getStats);
router.get("/years", TournamentResultController_1.default.getAvailableYears);
router.get("/leaderboard", TournamentResultController_1.default.getLeaderboard);
router.get("/tournament/:tournamentId", validation_1.validateObjectId, TournamentResultController_1.default.getByTournament);
router.get("/player/:playerId", validation_1.validateObjectId, TournamentResultController_1.default.getByPlayer);
router.get("/:id", validation_1.validateObjectId, TournamentResultController_1.default.getById);
// Protected routes (require admin)
router.post("/", auth_1.requireAdmin, TournamentResultController_1.default.create);
router.put("/:id", auth_1.requireAdmin, validation_1.validateObjectId, TournamentResultController_1.default.update);
router.delete("/:id", auth_1.requireAdmin, validation_1.validateObjectId, TournamentResultController_1.default.delete);
// Admin routes
router.post("/bulk-import", auth_1.requireAdmin, TournamentResultController_1.default.bulkImport);
exports.default = router;
//# sourceMappingURL=tournamentResults.js.map