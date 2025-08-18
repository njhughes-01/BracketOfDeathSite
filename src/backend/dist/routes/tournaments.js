"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const TournamentController_1 = require("../controllers/TournamentController");
const TournamentAdminController_1 = require("../controllers/TournamentAdminController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const express_validator_1 = require("express-validator");
const router = (0, express_1.Router)();
const tournamentAdminController = new TournamentAdminController_1.TournamentAdminController();
// Public routes (read-only)
router.get('/', validation_1.validatePagination, TournamentController_1.tournamentController.getAll);
router.get('/search', validation_1.validatePagination, TournamentController_1.tournamentController.search);
router.get('/stats', TournamentController_1.tournamentController.getStats);
router.get('/upcoming', TournamentController_1.tournamentController.getUpcoming);
router.get('/recent', TournamentController_1.tournamentController.getRecent);
router.get('/year/:year', TournamentController_1.tournamentController.getByYear);
router.get('/format/:format', TournamentController_1.tournamentController.getByFormat);
router.get('/:id', validation_1.validateObjectId, TournamentController_1.tournamentController.getById);
router.get('/:id/results', validation_1.validateObjectId, TournamentController_1.tournamentController.getWithResults);
router.get('/:id/registration', validation_1.validateObjectId, tournamentAdminController.getRegistrationInfo);
// Protected routes (require authentication)
router.post('/', auth_1.requireAuth, TournamentController_1.tournamentController.create);
router.put('/:id', auth_1.requireAuth, validation_1.validateObjectId, TournamentController_1.tournamentController.update);
router.delete('/:id', auth_1.requireAuth, validation_1.validateObjectId, TournamentController_1.tournamentController.delete);
// Public registration routes (for self-registration)
router.post('/:id/register', auth_1.requireAuth, [
    (0, express_validator_1.param)('id').isMongoId().withMessage('Invalid tournament ID'),
    (0, express_validator_1.body)('playerId').isMongoId().withMessage('Invalid player ID'),
], validation_1.validateRequest, tournamentAdminController.registerPlayer);
router.delete('/:id/register/:playerId', auth_1.requireAuth, [
    (0, express_validator_1.param)('id').isMongoId().withMessage('Invalid tournament ID'),
    (0, express_validator_1.param)('playerId').isMongoId().withMessage('Invalid player ID'),
], validation_1.validateRequest, tournamentAdminController.unregisterPlayer);
// Admin routes
router.post('/bulk-import', auth_1.requireAuth, TournamentController_1.tournamentController.bulkImport);
exports.default = router;
//# sourceMappingURL=tournaments.js.map