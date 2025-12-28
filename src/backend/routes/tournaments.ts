import { Router } from "express";
import TournamentController from "../controllers/TournamentController";
import TournamentAdminController from "../controllers/TournamentAdminController";
import LiveTournamentController from "../controllers/LiveTournamentController";
import { requireAuth, requireAdmin } from "../middleware/auth";
import {
  validateObjectId,
  validatePagination,
  validateRequest,
} from "../middleware/validation";
import { body, param } from "express-validator";

const router = Router();

// Public routes (read-only) - Order matters! Specific routes before parameterized ones
router.get("/", validatePagination, TournamentController.getAll);
router.get("/search", validatePagination, TournamentController.search);
router.get("/stats", TournamentController.getStats);
router.get("/upcoming", TournamentController.getUpcoming);
router.get("/open", TournamentController.listOpen); // New Endpoint
router.get("/recent", TournamentController.getRecent);
router.get("/next-bod-number", TournamentController.getNextBodNumber);
router.get("/year/:year", TournamentController.getByYear);
router.get("/format/:format", TournamentController.getByFormat);
router.get("/:id", validateObjectId, TournamentController.getById);
router.get(
  "/:id/results",
  validateObjectId,
  TournamentController.getWithResults,
);
router.get(
  "/:id/registration",
  validateObjectId,
  TournamentAdminController.getRegistrationInfo,
);

// Protected routes (require admin)
router.post("/", requireAdmin, TournamentController.create);
// Match management routes (specific before generic :id)
router.put(
  "/matches/:matchId",
  requireAdmin,
  LiveTournamentController.updateMatch,
);
router.put("/:id", requireAdmin, validateObjectId, TournamentController.update);
router.delete(
  "/:id",
  requireAdmin,
  validateObjectId,
  TournamentController.delete,
);

// Public registration routes (for self-registration)
router.post(
  "/:id/register",
  requireAuth,
  [
    param("id").isMongoId().withMessage("Invalid tournament ID"),
    body("playerId").isMongoId().withMessage("Invalid player ID"),
  ],
  validateRequest,
  TournamentAdminController.registerPlayer,
);

router.post(
  "/:id/join",
  requireAuth,
  [
    param("id").isMongoId().withMessage("Invalid tournament ID"),
    body("playerId").isMongoId().withMessage("Invalid player ID"),
  ],
  validateRequest,
  TournamentController.join,
);

router.delete(
  "/:id/register/:playerId",
  requireAuth,
  [
    param("id").isMongoId().withMessage("Invalid tournament ID"),
    param("playerId").isMongoId().withMessage("Invalid player ID"),
  ],
  validateRequest,
  TournamentAdminController.unregisterPlayer,
);

// Tournament management routes (Admin only)
router.post(
  "/generate-seeds",
  requireAdmin,
  TournamentController.generatePlayerSeeds,
);
router.post(
  "/generate-teams",
  requireAdmin,
  TournamentController.generateTeams,
);
router.post("/setup", requireAdmin, TournamentController.setupTournament);

// Live tournament management routes
router.get(
  "/:id/live",
  validateObjectId,
  LiveTournamentController.getLiveTournament,
);
router.get(
  "/:id/live-stats",
  validateObjectId,
  LiveTournamentController.getLiveStats,
);
router.get(
  "/:id/player-stats",
  validateObjectId,
  LiveTournamentController.getTournamentPlayerStats,
);
router.get(
  "/:id/stream",
  validateObjectId,
  LiveTournamentController.streamTournamentEvents,
);
router.post(
  "/:id/action",
  requireAdmin,
  validateObjectId,
  LiveTournamentController.executeTournamentAction,
);
router.get(
  "/:id/matches",
  validateObjectId,
  LiveTournamentController.getTournamentMatches,
);
router.post(
  "/:id/checkin",
  requireAdmin,
  validateObjectId,
  LiveTournamentController.checkInTeam,
);
router.post(
  "/:id/generate-matches",
  requireAdmin,
  validateObjectId,
  LiveTournamentController.generateMatches,
);
router.post(
  "/:id/matches/confirm-completed",
  requireAdmin,
  validateObjectId,
  LiveTournamentController.confirmCompletedMatches,
);

// Match management routes (create separate route file later if needed)

// Admin routes
router.post("/bulk-import", requireAdmin, TournamentController.bulkImport);

export default router;
