"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const TournamentController_1 = require("../controllers/TournamentController");
const LiveTournamentController_1 = require("../controllers/LiveTournamentController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const router = (0, express_1.Router)();
// Public routes (read-only) - Order matters! Specific routes before parameterized ones
router.get('/', validation_1.validatePagination, TournamentController_1.tournamentController.getAll);
router.get('/search', validation_1.validatePagination, TournamentController_1.tournamentController.search);
router.get('/stats', TournamentController_1.tournamentController.getStats);
router.get('/upcoming', TournamentController_1.tournamentController.getUpcoming);
router.get('/recent', TournamentController_1.tournamentController.getRecent);
router.get('/next-bod-number', TournamentController_1.tournamentController.getNextBodNumber);
router.get('/year/:year', TournamentController_1.tournamentController.getByYear);
router.get('/format/:format', TournamentController_1.tournamentController.getByFormat);
router.get('/:id', validation_1.validateObjectId, TournamentController_1.tournamentController.getById);
router.get('/:id/results', validation_1.validateObjectId, TournamentController_1.tournamentController.getWithResults);
// Protected routes (require authentication)
router.post('/', auth_1.requireAuth, TournamentController_1.tournamentController.create);
router.put('/:id', auth_1.requireAuth, validation_1.validateObjectId, TournamentController_1.tournamentController.update);
router.delete('/:id', auth_1.requireAuth, validation_1.validateObjectId, TournamentController_1.tournamentController.delete);
// Tournament management routes
router.post('/generate-seeds', TournamentController_1.tournamentController.generatePlayerSeeds);
router.post('/generate-teams', TournamentController_1.tournamentController.generateTeams);
router.post('/setup', TournamentController_1.tournamentController.setupTournament);
// Live tournament management routes
router.get('/:id/live', validation_1.validateObjectId, LiveTournamentController_1.liveTournamentController.getLiveTournament);
router.get('/:id/live-stats', validation_1.validateObjectId, LiveTournamentController_1.liveTournamentController.getLiveStats);
router.get('/:id/player-stats', validation_1.validateObjectId, LiveTournamentController_1.liveTournamentController.getTournamentPlayerStats);
router.get('/:id/stream', validation_1.validateObjectId, LiveTournamentController_1.liveTournamentController.streamTournamentEvents);
router.post('/:id/action', auth_1.requireAuth, validation_1.validateObjectId, LiveTournamentController_1.liveTournamentController.executeTournamentAction);
router.get('/:id/matches', validation_1.validateObjectId, LiveTournamentController_1.liveTournamentController.getTournamentMatches);
router.post('/:id/checkin', auth_1.requireAuth, validation_1.validateObjectId, LiveTournamentController_1.liveTournamentController.checkInTeam);
router.post('/:id/generate-matches', auth_1.requireAuth, validation_1.validateObjectId, LiveTournamentController_1.liveTournamentController.generateMatches);
router.post('/:id/matches/confirm-completed', auth_1.requireAuth, validation_1.validateObjectId, LiveTournamentController_1.liveTournamentController.confirmCompletedMatches);
// Match management routes (create separate route file later if needed)
router.put('/matches/:matchId', auth_1.requireAuth, LiveTournamentController_1.liveTournamentController.updateMatch);
// Admin routes
router.post('/bulk-import', auth_1.requireAuth, TournamentController_1.tournamentController.bulkImport);
exports.default = router;
//# sourceMappingURL=tournaments.js.map