import { Router } from "express";
import { tournamentController } from "../controllers/TournamentController";
import { TournamentAdminController } from "../controllers/TournamentAdminController";
import { liveTournamentController } from "../controllers/LiveTournamentController";
import { requireAuth, requireAdmin } from "../middleware/auth";
import {
  validateObjectId,
  validatePagination,
  validateRequest,
} from "../middleware/validation";
import { body, param } from "express-validator";

const router = Router();
const tournamentAdminController = new TournamentAdminController();

// Public routes (read-only) - Order matters! Specific routes before parameterized ones
router.get("/", validatePagination, tournamentController.getAll);
router.get("/search", validatePagination, tournamentController.search);
router.get("/stats", tournamentController.getStats);
router.get("/upcoming", tournamentController.getUpcoming);
router.get("/open", tournamentController.listOpen); // New Endpoint
router.get("/recent", tournamentController.getRecent);
router.get("/next-bod-number", tournamentController.getNextBodNumber);
router.get("/year/:year", tournamentController.getByYear);
router.get("/format/:format", tournamentController.getByFormat);
router.get("/:id", validateObjectId, tournamentController.getById);
router.get(
  "/:id/results",
  validateObjectId,
  tournamentController.getWithResults,
);
router.get(
  "/:id/registration",
  validateObjectId,
  tournamentAdminController.getRegistrationInfo,
);

// Protected routes (require admin)
router.post("/", requireAdmin, tournamentController.create);
// Match management routes (specific before generic :id)
router.put(
  "/matches/:matchId",
  requireAdmin,
  liveTournamentController.updateMatch,
);
router.put("/:id", requireAdmin, validateObjectId, tournamentController.update);
router.delete(
  "/:id",
  requireAdmin,
  validateObjectId,
  tournamentController.delete,
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
  tournamentAdminController.registerPlayer,
);

router.post(
  "/:id/join",
  requireAuth,
  [
    param("id").isMongoId().withMessage("Invalid tournament ID"),
    body("playerId").isMongoId().withMessage("Invalid player ID"),
  ],
  validateRequest,
  tournamentController.join,
);

router.delete(
  "/:id/register/:playerId",
  requireAuth,
  [
    param("id").isMongoId().withMessage("Invalid tournament ID"),
    param("playerId").isMongoId().withMessage("Invalid player ID"),
  ],
  validateRequest,
  tournamentAdminController.unregisterPlayer,
);

// Tournament management routes (Admin only)
router.post(
  "/generate-seeds",
  requireAdmin,
  tournamentController.generatePlayerSeeds,
);
router.post(
  "/generate-teams",
  requireAdmin,
  tournamentController.generateTeams,
);
router.post("/setup", requireAdmin, tournamentController.setupTournament);

// Live tournament management routes
router.get(
  "/:id/live",
  validateObjectId,
  liveTournamentController.getLiveTournament,
);
router.get(
  "/:id/live-stats",
  validateObjectId,
  liveTournamentController.getLiveStats,
);
router.get(
  "/:id/player-stats",
  validateObjectId,
  liveTournamentController.getTournamentPlayerStats,
);
router.get(
  "/:id/stream",
  validateObjectId,
  liveTournamentController.streamTournamentEvents,
);
router.post(
  "/:id/action",
  requireAdmin,
  validateObjectId,
  liveTournamentController.executeTournamentAction,
);
router.get(
  "/:id/matches",
  validateObjectId,
  liveTournamentController.getTournamentMatches,
);
router.post(
  "/:id/checkin",
  requireAdmin,
  validateObjectId,
  liveTournamentController.checkInTeam,
);
router.post(
  "/:id/generate-matches",
  requireAdmin,
  validateObjectId,
  liveTournamentController.generateMatches,
);
router.post(
  "/:id/matches/confirm-completed",
  requireAdmin,
  validateObjectId,
  liveTournamentController.confirmCompletedMatches,
);

// Match management routes (create separate route file later if needed)

// Admin routes
router.post("/bulk-import", requireAdmin, tournamentController.bulkImport);

export default router;
