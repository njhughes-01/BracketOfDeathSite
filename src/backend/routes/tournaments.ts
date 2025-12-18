import { Router } from 'express';
import { tournamentController } from '../controllers/TournamentController';
<<<<<<< HEAD
import { TournamentAdminController } from '../controllers/TournamentAdminController';
=======
import { liveTournamentController } from '../controllers/LiveTournamentController';
>>>>>>> new-ui
import { requireAuth } from '../middleware/auth';
import { validateObjectId, validatePagination, validateRequest } from '../middleware/validation';
import { body, param } from 'express-validator';

const router = Router();
const tournamentAdminController = new TournamentAdminController();

// Public routes (read-only) - Order matters! Specific routes before parameterized ones
router.get('/', validatePagination, tournamentController.getAll);
router.get('/search', validatePagination, tournamentController.search);
router.get('/stats', tournamentController.getStats);
router.get('/upcoming', tournamentController.getUpcoming);
router.get('/recent', tournamentController.getRecent);
router.get('/next-bod-number', tournamentController.getNextBodNumber);
router.get('/year/:year', tournamentController.getByYear);
router.get('/format/:format', tournamentController.getByFormat);
router.get('/:id', validateObjectId, tournamentController.getById);
router.get('/:id/results', validateObjectId, tournamentController.getWithResults);
router.get('/:id/registration', validateObjectId, tournamentAdminController.getRegistrationInfo);

// Protected routes (require authentication)
router.post('/', requireAuth, tournamentController.create);
router.put('/:id', requireAuth, validateObjectId, tournamentController.update);
router.delete('/:id', requireAuth, validateObjectId, tournamentController.delete);

<<<<<<< HEAD
// Public registration routes (for self-registration)
router.post(
  '/:id/register',
  requireAuth,
  [
    param('id').isMongoId().withMessage('Invalid tournament ID'),
    body('playerId').isMongoId().withMessage('Invalid player ID'),
  ],
  validateRequest,
  tournamentAdminController.registerPlayer
);

router.delete(
  '/:id/register/:playerId',
  requireAuth,
  [
    param('id').isMongoId().withMessage('Invalid tournament ID'),
    param('playerId').isMongoId().withMessage('Invalid player ID'),
  ],
  validateRequest,
  tournamentAdminController.unregisterPlayer
);
=======
// Tournament management routes
router.post('/generate-seeds', tournamentController.generatePlayerSeeds);
router.post('/generate-teams', tournamentController.generateTeams);
router.post('/setup', tournamentController.setupTournament);

// Live tournament management routes
router.get('/:id/live', validateObjectId, liveTournamentController.getLiveTournament);
router.get('/:id/live-stats', validateObjectId, liveTournamentController.getLiveStats);
router.get('/:id/player-stats', validateObjectId, liveTournamentController.getTournamentPlayerStats);
router.get('/:id/stream', validateObjectId, liveTournamentController.streamTournamentEvents);
router.post('/:id/action', requireAuth, validateObjectId, liveTournamentController.executeTournamentAction);
router.get('/:id/matches', validateObjectId, liveTournamentController.getTournamentMatches);
router.post('/:id/checkin', requireAuth, validateObjectId, liveTournamentController.checkInTeam);
router.post('/:id/generate-matches', requireAuth, validateObjectId, liveTournamentController.generateMatches);
router.post('/:id/matches/confirm-completed', requireAuth, validateObjectId, liveTournamentController.confirmCompletedMatches);

// Match management routes (create separate route file later if needed)
router.put('/matches/:matchId', requireAuth, liveTournamentController.updateMatch);
>>>>>>> new-ui

// Admin routes
router.post('/bulk-import', requireAuth, tournamentController.bulkImport);

export default router;
