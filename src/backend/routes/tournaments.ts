import { Router } from 'express';
import { tournamentController } from '../controllers/TournamentController';
import { liveTournamentController } from '../controllers/LiveTournamentController';
import { requireAuth } from '../middleware/auth';
import { validateObjectId, validatePagination } from '../middleware/validation';

const router = Router();

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

// Protected routes (require authentication)
router.post('/', requireAuth, tournamentController.create);
router.put('/:id', requireAuth, validateObjectId, tournamentController.update);
router.delete('/:id', requireAuth, validateObjectId, tournamentController.delete);

// Tournament management routes
router.post('/generate-seeds', requireAuth, tournamentController.generatePlayerSeeds);
router.post('/generate-teams', requireAuth, tournamentController.generateTeams);
router.post('/setup', requireAuth, tournamentController.setupTournament);

// Live tournament management routes
router.get('/:id/live', validateObjectId, liveTournamentController.getLiveTournament);
router.get('/:id/live-stats', validateObjectId, liveTournamentController.getLiveStats);
router.post('/:id/action', requireAuth, validateObjectId, liveTournamentController.executeTournamentAction);
router.get('/:id/matches', validateObjectId, liveTournamentController.getTournamentMatches);
router.post('/:id/checkin', requireAuth, validateObjectId, liveTournamentController.checkInTeam);
router.post('/:id/generate-matches', requireAuth, validateObjectId, liveTournamentController.generateMatches);

// Match management routes (create separate route file later if needed)
router.put('/matches/:matchId', requireAuth, liveTournamentController.updateMatch);

// Admin routes
router.post('/bulk-import', requireAuth, tournamentController.bulkImport);

export default router;