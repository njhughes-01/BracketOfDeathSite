import { Router } from 'express';
import { playerController } from '../controllers/PlayerController';
import { requireAuth } from '../middleware/auth';
import { validateObjectId, validatePagination } from '../middleware/validation';

const router = Router();

// Public routes (read-only)
router.get('/', validatePagination, playerController.getAll);
router.get('/search', validatePagination, playerController.search);
router.get('/stats', playerController.getStats);
router.get('/champions', playerController.getChampions);
router.get('/:id', validateObjectId, playerController.getById);
router.get('/:id/performance', validateObjectId, playerController.getPerformanceTrends);

// Protected routes (require authentication)
router.post('/', requireAuth, playerController.create);
router.put('/:id', requireAuth, validateObjectId, playerController.update);
router.patch('/:id/stats', requireAuth, validateObjectId, playerController.updateStats);
router.delete('/:id', requireAuth, validateObjectId, playerController.delete);

// Admin routes
router.post('/bulk-import', requireAuth, playerController.bulkImport);

export default router;