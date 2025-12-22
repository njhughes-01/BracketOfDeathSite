"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const TournamentResultController_1 = require("../controllers/TournamentResultController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const router = (0, express_1.Router)();
// Public routes (read-only)
router.get('/', TournamentResultController_1.tournamentResultController.getAll);
router.get('/search', TournamentResultController_1.tournamentResultController.search);
router.get('/stats', TournamentResultController_1.tournamentResultController.getStats);
router.get('/years', TournamentResultController_1.tournamentResultController.getAvailableYears);
router.get('/leaderboard', TournamentResultController_1.tournamentResultController.getLeaderboard);
router.get('/tournament/:tournamentId', validation_1.validateObjectId, TournamentResultController_1.tournamentResultController.getByTournament);
router.get('/player/:playerId', validation_1.validateObjectId, TournamentResultController_1.tournamentResultController.getByPlayer);
router.get('/:id', validation_1.validateObjectId, TournamentResultController_1.tournamentResultController.getById);
// Protected routes (require admin)
router.post('/', auth_1.requireAdmin, TournamentResultController_1.tournamentResultController.create);
router.put('/:id', auth_1.requireAdmin, validation_1.validateObjectId, TournamentResultController_1.tournamentResultController.update);
router.delete('/:id', auth_1.requireAdmin, validation_1.validateObjectId, TournamentResultController_1.tournamentResultController.delete);
// Admin routes
router.post('/bulk-import', auth_1.requireAdmin, TournamentResultController_1.tournamentResultController.bulkImport);
exports.default = router;
//# sourceMappingURL=tournamentResults.js.map