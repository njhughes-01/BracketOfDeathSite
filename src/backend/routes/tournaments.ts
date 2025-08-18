import { Router } from 'express';
import { tournamentController } from '../controllers/TournamentController';
import { TournamentAdminController } from '../controllers/TournamentAdminController';
import { requireAuth } from '../middleware/auth';
import { validateObjectId, validatePagination, validateRequest } from '../middleware/validation';
import { body, param } from 'express-validator';

const router = Router();
const tournamentAdminController = new TournamentAdminController();

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
router.get('/:id/registration', validateObjectId, tournamentAdminController.getRegistrationInfo);

// Protected routes (require authentication)
router.post('/', requireAuth, tournamentController.create);
router.put('/:id', requireAuth, validateObjectId, tournamentController.update);
router.delete('/:id', requireAuth, validateObjectId, tournamentController.delete);

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

// Admin routes
router.post('/bulk-import', requireAuth, tournamentController.bulkImport);

export default router;