import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';
import { DataMigrationController } from '../controllers/DataMigrationController';

const router = Router();

// All data routes require admin access
const dataMigrationController = new DataMigrationController();

// Migration endpoints
router.post('/migrate', requireAdmin, dataMigrationController.migrateAll);
router.post('/migrate/players', requireAdmin, dataMigrationController.migratePlayers);
router.post('/migrate/tournaments', requireAdmin, dataMigrationController.migrateTournaments);
router.post('/migrate/results', requireAdmin, dataMigrationController.migrateResults);

// Migration status and info
router.get('/migration/status', requireAdmin, dataMigrationController.getMigrationStatus);
router.get('/migration/preview', requireAdmin, dataMigrationController.previewMigration);

// Backup and restore
router.post('/backup', requireAdmin, dataMigrationController.createBackup);
router.post('/restore', requireAdmin, dataMigrationController.restoreBackup);

// Validation
router.post('/validate', requireAdmin, dataMigrationController.validateData);

export default router;
