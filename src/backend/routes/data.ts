import { Router } from "express";
import { requireAdmin } from "../middleware/auth";
import DataMigrationController from "../controllers/DataMigrationController";

const router = Router();

// All data routes require admin access
// Using singleton instance

// Migration endpoints
router.post("/migrate", requireAdmin, DataMigrationController.migrateAll);
router.post(
  "/migrate/players",
  requireAdmin,
  DataMigrationController.migratePlayers,
);
router.post(
  "/migrate/tournaments",
  requireAdmin,
  DataMigrationController.migrateTournaments,
);
router.post(
  "/migrate/results",
  requireAdmin,
  DataMigrationController.migrateResults,
);

// Migration status and info
router.get(
  "/migration/status",
  requireAdmin,
  DataMigrationController.getMigrationStatus,
);
router.get(
  "/migration/preview",
  requireAdmin,
  DataMigrationController.previewMigration,
);

// Backup and restore
router.post("/backup", requireAdmin, DataMigrationController.createBackup);
router.post("/restore", requireAdmin, DataMigrationController.restoreBackup);

// Validation
router.post("/validate", requireAdmin, DataMigrationController.validateData);

export default router;
