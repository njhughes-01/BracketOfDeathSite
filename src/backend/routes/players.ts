import { Router } from "express";
import { playerController } from "../controllers/PlayerController";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { validateObjectId, validatePagination } from "../middleware/validation";

const router = Router();

// Public routes (read-only)
router.get("/", validatePagination, playerController.getAll);
router.get("/search", validatePagination, playerController.search);
router.get("/stats", playerController.getStats);
router.get("/champions", playerController.getChampions);
router.get("/:id", validateObjectId, playerController.getById);
router.get(
  "/:id/performance",
  validateObjectId,
  playerController.getPerformanceTrends,
);
router.get(
  "/:id/scoring",
  validateObjectId,
  playerController.getScoringSummary,
);

// Protected routes (require admin)
router.post("/", requireAdmin, playerController.create);
router.put("/:id", requireAdmin, validateObjectId, playerController.update);
router.patch(
  "/:id/stats",
  requireAdmin,
  validateObjectId,
  playerController.updateStats,
);
router.delete("/:id", requireAdmin, validateObjectId, playerController.delete);

// Admin routes
router.post("/bulk-import", requireAdmin, playerController.bulkImport);

export default router;
