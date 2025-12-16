"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const TournamentAdminController_1 = require("../controllers/TournamentAdminController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const express_validator_1 = require("express-validator");
const router = (0, express_1.Router)();
const tournamentAdminController = new TournamentAdminController_1.TournamentAdminController();
// Apply authentication and admin requirements to all admin routes
router.use(auth_1.requireAdmin);
// Tournament status management
router.put('/tournaments/:id/status', [
    (0, express_validator_1.param)('id').isMongoId().withMessage('Invalid tournament ID'),
    (0, express_validator_1.body)('status')
        .isIn(['scheduled', 'open', 'active', 'completed', 'cancelled'])
        .withMessage('Invalid tournament status'),
], validation_1.validateRequest, tournamentAdminController.updateStatus);
// Player management
router.post('/tournaments/:id/players', [
    (0, express_validator_1.param)('id').isMongoId().withMessage('Invalid tournament ID'),
    (0, express_validator_1.body)('playerIds')
        .isArray({ min: 1 })
        .withMessage('Player IDs must be a non-empty array'),
    (0, express_validator_1.body)('playerIds.*')
        .isMongoId()
        .withMessage('Each player ID must be a valid MongoDB ObjectId'),
], validation_1.validateRequest, tournamentAdminController.addPlayers);
router.delete('/tournaments/:id/players/:playerId', [
    (0, express_validator_1.param)('id').isMongoId().withMessage('Invalid tournament ID'),
    (0, express_validator_1.param)('playerId').isMongoId().withMessage('Invalid player ID'),
], validation_1.validateRequest, tournamentAdminController.removePlayer);
// Match generation and management
router.post('/tournaments/:id/generate-matches', [
    (0, express_validator_1.param)('id').isMongoId().withMessage('Invalid tournament ID'),
    (0, express_validator_1.body)('bracketType')
        .optional()
        .isIn(['single-elimination', 'double-elimination'])
        .withMessage('Invalid bracket type'),
], validation_1.validateRequest, tournamentAdminController.generateMatches);
router.put('/tournaments/matches/:matchId', [
    (0, express_validator_1.param)('matchId').isMongoId().withMessage('Invalid match ID'),
    (0, express_validator_1.body)('team1Score')
        .optional()
        .isInt({ min: 0, max: 99 })
        .withMessage('Team 1 score must be between 0 and 99'),
    (0, express_validator_1.body)('team2Score')
        .optional()
        .isInt({ min: 0, max: 99 })
        .withMessage('Team 2 score must be between 0 and 99'),
    (0, express_validator_1.body)('notes')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Notes cannot exceed 500 characters'),
], validation_1.validateRequest, tournamentAdminController.updateMatchScore);
// Tournament finalization
router.put('/tournaments/:id/finalize', [
    (0, express_validator_1.param)('id').isMongoId().withMessage('Invalid tournament ID'),
], validation_1.validateRequest, tournamentAdminController.finalizeTournament);
// Tournament details with matches
router.get('/tournaments/:id/details', [
    (0, express_validator_1.param)('id').isMongoId().withMessage('Invalid tournament ID'),
], validation_1.validateRequest, tournamentAdminController.getTournamentWithMatches);
// Tournament deletion
router.delete('/tournaments/:id', [
    (0, express_validator_1.param)('id').isMongoId().withMessage('Invalid tournament ID'),
], validation_1.validateRequest, tournamentAdminController.deleteTournament);
exports.default = router;
//# sourceMappingURL=admin.js.map