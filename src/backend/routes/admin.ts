import { Router } from "express";
import { TournamentAdminController } from "../controllers/TournamentAdminController";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { validateRequest } from "../middleware/validation";
import { body, param } from "express-validator";

const router = Router();
const tournamentAdminController = new TournamentAdminController();

// Apply authentication and admin requirements to all admin routes
router.use(requireAdmin);

// Tournament status management
router.put(
  "/tournaments/:id/status",
  [
    param("id").isMongoId().withMessage("Invalid tournament ID"),
    body("status")
      .isIn(["scheduled", "open", "active", "completed", "cancelled"])
      .withMessage("Invalid tournament status"),
  ],
  validateRequest,
  tournamentAdminController.updateStatus,
);

// Player management
router.post(
  "/tournaments/:id/players",
  [
    param("id").isMongoId().withMessage("Invalid tournament ID"),
    body("playerIds")
      .isArray({ min: 1 })
      .withMessage("Player IDs must be a non-empty array"),
    body("playerIds.*")
      .isMongoId()
      .withMessage("Each player ID must be a valid MongoDB ObjectId"),
  ],
  validateRequest,
  tournamentAdminController.addPlayers,
);

router.delete(
  "/tournaments/:id/players/:playerId",
  [
    param("id").isMongoId().withMessage("Invalid tournament ID"),
    param("playerId").isMongoId().withMessage("Invalid player ID"),
  ],
  validateRequest,
  tournamentAdminController.removePlayer,
);

// Match generation and management
router.post(
  "/tournaments/:id/generate-matches",
  [
    param("id").isMongoId().withMessage("Invalid tournament ID"),
    body("bracketType")
      .optional()
      .isIn(["single-elimination", "double-elimination"])
      .withMessage("Invalid bracket type"),
  ],
  validateRequest,
  tournamentAdminController.generateMatches,
);

router.put(
  "/tournaments/matches/:matchId",
  [
    param("matchId").isMongoId().withMessage("Invalid match ID"),
    body("team1Score")
      .optional()
      .isInt({ min: 0, max: 99 })
      .withMessage("Team 1 score must be between 0 and 99"),
    body("team2Score")
      .optional()
      .isInt({ min: 0, max: 99 })
      .withMessage("Team 2 score must be between 0 and 99"),
    body("notes")
      .optional()
      .isLength({ max: 500 })
      .withMessage("Notes cannot exceed 500 characters"),
  ],
  validateRequest,
  tournamentAdminController.updateMatchScore,
);

// Tournament finalization
router.put(
  "/tournaments/:id/finalize",
  [param("id").isMongoId().withMessage("Invalid tournament ID")],
  validateRequest,
  tournamentAdminController.finalizeTournament,
);

// Tournament registration management
router.post(
  "/tournaments/:id/register",
  [
    param("id").isMongoId().withMessage("Invalid tournament ID"),
    body("playerId").isMongoId().withMessage("Invalid player ID"),
  ],
  validateRequest,
  tournamentAdminController.registerPlayer,
);

router.delete(
  "/tournaments/:id/register/:playerId",
  [
    param("id").isMongoId().withMessage("Invalid tournament ID"),
    param("playerId").isMongoId().withMessage("Invalid player ID"),
  ],
  validateRequest,
  tournamentAdminController.unregisterPlayer,
);

router.post(
  "/tournaments/:id/finalize-registration",
  [param("id").isMongoId().withMessage("Invalid tournament ID")],
  validateRequest,
  tournamentAdminController.finalizeRegistration,
);

// Tournament seeding
router.get(
  "/tournaments/:id/seeding-preview",
  [param("id").isMongoId().withMessage("Invalid tournament ID")],
  validateRequest,
  tournamentAdminController.getSeedingPreview,
);

// Tournament details with matches
router.get(
  "/tournaments/:id/details",
  [param("id").isMongoId().withMessage("Invalid tournament ID")],
  validateRequest,
  tournamentAdminController.getTournamentWithMatches,
);

// Tournament deletion
router.delete(
  "/tournaments/:id",
  [param("id").isMongoId().withMessage("Invalid tournament ID")],
  validateRequest,
  tournamentAdminController.deleteTournament,
);

// Recalculate player stats for a tournament
router.post(
  "/tournaments/:id/recalculate-stats",
  [param("id").isMongoId().withMessage("Invalid tournament ID")],
  validateRequest,
  tournamentAdminController.recalculatePlayerStats,
);

// Historical match score update
router.put(
  "/tournaments/matches/:matchId/historical",
  [
    param("matchId").isMongoId().withMessage("Invalid match ID"),
    body("team1Score")
      .isInt({ min: 0, max: 99 })
      .withMessage("Team 1 score must be between 0 and 99"),
    body("team2Score")
      .isInt({ min: 0, max: 99 })
      .withMessage("Team 2 score must be between 0 and 99"),
    body("editReason")
      .notEmpty()
      .withMessage("Edit reason is required for historical edits"),
    body("notes")
      .optional()
      .isLength({ max: 500 })
      .withMessage("Notes cannot exceed 500 characters"),
  ],
  validateRequest,
  tournamentAdminController.updateHistoricalMatchScore,
);

export default router;
