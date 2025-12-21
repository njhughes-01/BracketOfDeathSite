import { Router } from 'express';
import { tournamentResultController } from '../controllers/TournamentResultController';
import { requireAuth } from '../middleware/auth';
import { validateObjectId } from '../middleware/validation';

const router = Router();

// Public routes (read-only)
router.get('/', tournamentResultController.getAll);
router.get('/search', tournamentResultController.search);
router.get('/stats', tournamentResultController.getStats);
router.get('/years', tournamentResultController.getAvailableYears);
router.get('/leaderboard', tournamentResultController.getLeaderboard);
router.get('/tournament/:tournamentId', validateObjectId, tournamentResultController.getByTournament);
router.get('/player/:playerId', validateObjectId, tournamentResultController.getByPlayer);
router.get('/:id', validateObjectId, tournamentResultController.getById);

// Protected routes (require authentication)
router.post('/', requireAuth, tournamentResultController.create);
router.put('/:id', requireAuth, validateObjectId, tournamentResultController.update);
router.delete('/:id', requireAuth, validateObjectId, tournamentResultController.delete);

// Admin routes
router.post('/bulk-import', requireAuth, tournamentResultController.bulkImport);

export default router;