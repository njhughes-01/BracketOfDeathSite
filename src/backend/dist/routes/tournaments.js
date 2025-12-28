"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const TournamentController_1 = __importDefault(require("../controllers/TournamentController"));
const TournamentAdminController_1 = require("../controllers/TournamentAdminController");
const LiveTournamentController_1 = require("../controllers/LiveTournamentController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const express_validator_1 = require("express-validator");
const router = (0, express_1.Router)();
const tournamentAdminController = new TournamentAdminController_1.TournamentAdminController();
// Public routes (read-only) - Order matters! Specific routes before parameterized ones
router.get("/", validation_1.validatePagination, TournamentController_1.default.getAll);
router.get("/search", validation_1.validatePagination, TournamentController_1.default.search);
router.get("/stats", TournamentController_1.default.getStats);
router.get("/upcoming", TournamentController_1.default.getUpcoming);
router.get("/open", TournamentController_1.default.listOpen); // New Endpoint
router.get("/recent", TournamentController_1.default.getRecent);
router.get("/next-bod-number", TournamentController_1.default.getNextBodNumber);
router.get("/year/:year", TournamentController_1.default.getByYear);
router.get("/format/:format", TournamentController_1.default.getByFormat);
router.get("/:id", validation_1.validateObjectId, TournamentController_1.default.getById);
router.get("/:id/results", validation_1.validateObjectId, TournamentController_1.default.getWithResults);
router.get("/:id/registration", validation_1.validateObjectId, tournamentAdminController.getRegistrationInfo);
// Protected routes (require admin)
router.post("/", auth_1.requireAdmin, TournamentController_1.default.create);
// Match management routes (specific before generic :id)
router.put("/matches/:matchId", auth_1.requireAdmin, LiveTournamentController_1.liveTournamentController.updateMatch);
router.put("/:id", auth_1.requireAdmin, validation_1.validateObjectId, TournamentController_1.default.update);
router.delete("/:id", auth_1.requireAdmin, validation_1.validateObjectId, TournamentController_1.default.delete);
// Public registration routes (for self-registration)
router.post("/:id/register", auth_1.requireAuth, [
    (0, express_validator_1.param)("id").isMongoId().withMessage("Invalid tournament ID"),
    (0, express_validator_1.body)("playerId").isMongoId().withMessage("Invalid player ID"),
], validation_1.validateRequest, tournamentAdminController.registerPlayer);
router.post("/:id/join", auth_1.requireAuth, [
    (0, express_validator_1.param)("id").isMongoId().withMessage("Invalid tournament ID"),
    (0, express_validator_1.body)("playerId").isMongoId().withMessage("Invalid player ID"),
], validation_1.validateRequest, TournamentController_1.default.join);
router.delete("/:id/register/:playerId", auth_1.requireAuth, [
    (0, express_validator_1.param)("id").isMongoId().withMessage("Invalid tournament ID"),
    (0, express_validator_1.param)("playerId").isMongoId().withMessage("Invalid player ID"),
], validation_1.validateRequest, tournamentAdminController.unregisterPlayer);
// Tournament management routes (Admin only)
router.post("/generate-seeds", auth_1.requireAdmin, TournamentController_1.default.generatePlayerSeeds);
router.post("/generate-teams", auth_1.requireAdmin, TournamentController_1.default.generateTeams);
router.post("/setup", auth_1.requireAdmin, TournamentController_1.default.setupTournament);
// Live tournament management routes
router.get("/:id/live", validation_1.validateObjectId, LiveTournamentController_1.liveTournamentController.getLiveTournament);
router.get("/:id/live-stats", validation_1.validateObjectId, LiveTournamentController_1.liveTournamentController.getLiveStats);
router.get("/:id/player-stats", validation_1.validateObjectId, LiveTournamentController_1.liveTournamentController.getTournamentPlayerStats);
router.get("/:id/stream", validation_1.validateObjectId, LiveTournamentController_1.liveTournamentController.streamTournamentEvents);
router.post("/:id/action", auth_1.requireAdmin, validation_1.validateObjectId, LiveTournamentController_1.liveTournamentController.executeTournamentAction);
router.get("/:id/matches", validation_1.validateObjectId, LiveTournamentController_1.liveTournamentController.getTournamentMatches);
router.post("/:id/checkin", auth_1.requireAdmin, validation_1.validateObjectId, LiveTournamentController_1.liveTournamentController.checkInTeam);
router.post("/:id/generate-matches", auth_1.requireAdmin, validation_1.validateObjectId, LiveTournamentController_1.liveTournamentController.generateMatches);
router.post("/:id/matches/confirm-completed", auth_1.requireAdmin, validation_1.validateObjectId, LiveTournamentController_1.liveTournamentController.confirmCompletedMatches);
// Match management routes (create separate route file later if needed)
// Admin routes
router.post("/bulk-import", auth_1.requireAdmin, TournamentController_1.default.bulkImport);
exports.default = router;
//# sourceMappingURL=tournaments.js.map