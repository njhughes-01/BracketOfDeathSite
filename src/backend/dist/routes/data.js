"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const DataMigrationController_1 = require("../controllers/DataMigrationController");
const router = (0, express_1.Router)();
// All data routes require admin access
const dataMigrationController = new DataMigrationController_1.DataMigrationController();
// Migration endpoints
router.post("/migrate", auth_1.requireAdmin, dataMigrationController.migrateAll);
router.post("/migrate/players", auth_1.requireAdmin, dataMigrationController.migratePlayers);
router.post("/migrate/tournaments", auth_1.requireAdmin, dataMigrationController.migrateTournaments);
router.post("/migrate/results", auth_1.requireAdmin, dataMigrationController.migrateResults);
// Migration status and info
router.get("/migration/status", auth_1.requireAdmin, dataMigrationController.getMigrationStatus);
router.get("/migration/preview", auth_1.requireAdmin, dataMigrationController.previewMigration);
// Backup and restore
router.post("/backup", auth_1.requireAdmin, dataMigrationController.createBackup);
router.post("/restore", auth_1.requireAdmin, dataMigrationController.restoreBackup);
// Validation
router.post("/validate", auth_1.requireAdmin, dataMigrationController.validateData);
exports.default = router;
//# sourceMappingURL=data.js.map