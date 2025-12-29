"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const DataMigrationController_1 = __importDefault(require("../controllers/DataMigrationController"));
const router = (0, express_1.Router)();
// All data routes require admin access
// Using singleton instance
// Migration endpoints
router.post("/migrate", auth_1.requireAdmin, DataMigrationController_1.default.migrateAll);
router.post("/migrate/players", auth_1.requireAdmin, DataMigrationController_1.default.migratePlayers);
router.post("/migrate/tournaments", auth_1.requireAdmin, DataMigrationController_1.default.migrateTournaments);
router.post("/migrate/results", auth_1.requireAdmin, DataMigrationController_1.default.migrateResults);
// Migration status and info
router.get("/migration/status", auth_1.requireAdmin, DataMigrationController_1.default.getMigrationStatus);
router.get("/migration/preview", auth_1.requireAdmin, DataMigrationController_1.default.previewMigration);
// Backup and restore
router.post("/backup", auth_1.requireAdmin, DataMigrationController_1.default.createBackup);
router.post("/restore", auth_1.requireAdmin, DataMigrationController_1.default.restoreBackup);
// Validation
router.post("/validate", auth_1.requireAdmin, DataMigrationController_1.default.validateData);
exports.default = router;
//# sourceMappingURL=data.js.map