import { Router } from "express";
import PlayerController from "../controllers/PlayerController";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { validateObjectId, validatePagination } from "../middleware/validation";

const router = Router();

// Public routes (read-only)
router.get("/", validatePagination, PlayerController.getAll);
router.get("/search", validatePagination, PlayerController.search);
router.get("/stats", PlayerController.getStats);
router.get("/champions", PlayerController.getChampions);
router.get("/:id", validateObjectId, PlayerController.getById);
router.get(
  "/:id/performance",
  validateObjectId,
  PlayerController.getPerformanceTrends,
);
router.get(
  "/:id/scoring",
  validateObjectId,
  PlayerController.getScoringSummary,
);

// Protected routes (require admin)
router.post("/", requireAdmin, PlayerController.create);
router.put("/:id", requireAdmin, validateObjectId, PlayerController.update);
router.patch(
  "/:id/stats",
  requireAdmin,
  validateObjectId,
  PlayerController.updateStats,
);
router.delete("/:id", requireAdmin, validateObjectId, PlayerController.delete);

// Admin routes
router.post("/bulk-import", requireAdmin, PlayerController.bulkImport);

export default router;
