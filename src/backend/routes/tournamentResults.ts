import { Router } from "express";
import { tournamentResultController } from "../controllers/TournamentResultController";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { validateObjectId } from "../middleware/validation";

const router = Router();

// Public routes (read-only)
router.get("/", tournamentResultController.getAll);
router.get("/search", tournamentResultController.search);
router.get("/stats", tournamentResultController.getStats);
router.get("/years", tournamentResultController.getAvailableYears);
router.get("/leaderboard", tournamentResultController.getLeaderboard);
router.get(
  "/tournament/:tournamentId",
  validateObjectId,
  tournamentResultController.getByTournament,
);
router.get(
  "/player/:playerId",
  validateObjectId,
  tournamentResultController.getByPlayer,
);
router.get("/:id", validateObjectId, tournamentResultController.getById);

// Protected routes (require admin)
router.post("/", requireAdmin, tournamentResultController.create);
router.put(
  "/:id",
  requireAdmin,
  validateObjectId,
  tournamentResultController.update,
);
router.delete(
  "/:id",
  requireAdmin,
  validateObjectId,
  tournamentResultController.delete,
);

// Admin routes
router.post(
  "/bulk-import",
  requireAdmin,
  tournamentResultController.bulkImport,
);

export default router;
