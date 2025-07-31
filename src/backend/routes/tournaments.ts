import { Router } from 'express';
import { tournamentController } from '../controllers/TournamentController';
import { requireAuth } from '../middleware/auth';
import { validateObjectId, validatePagination } from '../middleware/validation';

const router = Router();

// Public routes (read-only)
router.get('/', validatePagination, tournamentController.getAll);
router.get('/search', validatePagination, tournamentController.search);
router.get('/stats', tournamentController.getStats);
router.get('/upcoming', tournamentController.getUpcoming);
router.get('/recent', tournamentController.getRecent);
router.get('/year/:year', tournamentController.getByYear);
router.get('/format/:format', tournamentController.getByFormat);
router.get('/:id', validateObjectId, tournamentController.getById);
router.get('/:id/results', validateObjectId, tournamentController.getWithResults);

// Protected routes (require authentication)
router.post('/', requireAuth, tournamentController.create);
router.put('/:id', requireAuth, validateObjectId, tournamentController.update);
router.delete('/:id', requireAuth, validateObjectId, tournamentController.delete);

// Admin routes
router.post('/bulk-import', requireAuth, tournamentController.bulkImport);

export default router;