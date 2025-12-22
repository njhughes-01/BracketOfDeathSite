"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const PlayerController_1 = require("../controllers/PlayerController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const router = (0, express_1.Router)();
// Public routes (read-only)
router.get('/', validation_1.validatePagination, PlayerController_1.playerController.getAll);
router.get('/search', validation_1.validatePagination, PlayerController_1.playerController.search);
router.get('/stats', PlayerController_1.playerController.getStats);
router.get('/champions', PlayerController_1.playerController.getChampions);
router.get('/:id', validation_1.validateObjectId, PlayerController_1.playerController.getById);
router.get('/:id/performance', validation_1.validateObjectId, PlayerController_1.playerController.getPerformanceTrends);
router.get('/:id/scoring', validation_1.validateObjectId, PlayerController_1.playerController.getScoringSummary);
// Protected routes (require admin)
router.post('/', auth_1.requireAdmin, PlayerController_1.playerController.create);
router.put('/:id', auth_1.requireAdmin, validation_1.validateObjectId, PlayerController_1.playerController.update);
router.patch('/:id/stats', auth_1.requireAdmin, validation_1.validateObjectId, PlayerController_1.playerController.updateStats);
router.delete('/:id', auth_1.requireAdmin, validation_1.validateObjectId, PlayerController_1.playerController.delete);
// Admin routes
router.post('/bulk-import', auth_1.requireAdmin, PlayerController_1.playerController.bulkImport);
exports.default = router;
//# sourceMappingURL=players.js.map