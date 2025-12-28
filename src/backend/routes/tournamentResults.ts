import { Router } from "express";
import TournamentResultController from "../controllers/TournamentResultController";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { validateObjectId } from "../middleware/validation";

const router = Router();

// Public routes (read-only)
router.get("/", TournamentResultController.getAll);
router.get("/search", TournamentResultController.search);
router.get("/stats", TournamentResultController.getStats);
router.get("/years", TournamentResultController.getAvailableYears);
router.get("/leaderboard", TournamentResultController.getLeaderboard);
router.get(
  "/tournament/:tournamentId",
  validateObjectId,
  TournamentResultController.getByTournament,
);
router.get(
  "/player/:playerId",
  validateObjectId,
  TournamentResultController.getByPlayer,
);
router.get("/:id", validateObjectId, TournamentResultController.getById);

// Protected routes (require admin)
router.post("/", requireAdmin, TournamentResultController.create);
router.put(
  "/:id",
  requireAdmin,
  validateObjectId,
  TournamentResultController.update,
);
router.delete(
  "/:id",
  requireAdmin,
  validateObjectId,
  TournamentResultController.delete,
);

// Admin routes
router.post(
  "/bulk-import",
  requireAdmin,
  TournamentResultController.bulkImport,
);

export default router;
