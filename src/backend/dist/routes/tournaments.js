"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const TournamentController_1 = require("../controllers/TournamentController");
<<<<<<< HEAD
const TournamentAdminController_1 = require("../controllers/TournamentAdminController");
=======
const LiveTournamentController_1 = require("../controllers/LiveTournamentController");
>>>>>>> new-ui
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const express_validator_1 = require("express-validator");
const router = (0, express_1.Router)();
<<<<<<< HEAD
const tournamentAdminController = new TournamentAdminController_1.TournamentAdminController();
// Public routes (read-only)
=======
// Public routes (read-only) - Order matters! Specific routes before parameterized ones
>>>>>>> new-ui
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
router.get('/:id/registration', validation_1.validateObjectId, tournamentAdminController.getRegistrationInfo);
// Protected routes (require authentication)
router.post('/', auth_1.requireAuth, TournamentController_1.tournamentController.create);
router.put('/:id', auth_1.requireAuth, validation_1.validateObjectId, TournamentController_1.tournamentController.update);
router.delete('/:id', auth_1.requireAuth, validation_1.validateObjectId, TournamentController_1.tournamentController.delete);
<<<<<<< HEAD
// Public registration routes (for self-registration)
router.post('/:id/register', auth_1.requireAuth, [
    (0, express_validator_1.param)('id').isMongoId().withMessage('Invalid tournament ID'),
    (0, express_validator_1.body)('playerId').isMongoId().withMessage('Invalid player ID'),
], validation_1.validateRequest, tournamentAdminController.registerPlayer);
router.delete('/:id/register/:playerId', auth_1.requireAuth, [
    (0, express_validator_1.param)('id').isMongoId().withMessage('Invalid tournament ID'),
    (0, express_validator_1.param)('playerId').isMongoId().withMessage('Invalid player ID'),
], validation_1.validateRequest, tournamentAdminController.unregisterPlayer);
=======
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
>>>>>>> new-ui
// Admin routes
router.post('/bulk-import', auth_1.requireAuth, TournamentController_1.tournamentController.bulkImport);
exports.default = router;
//# sourceMappingURL=tournaments.js.map