import { Router } from 'express';
import systemController from '../controllers/SystemController';
import { requireAuth as authenticate } from '../middleware/auth';

const router = Router();

// Public route to check status (e.g., for login screen or onboarding check)
// Can be authenticated if strictly required, but public is easier for "Is system setup?" checks
router.get('/status', systemController.getStatus.bind(systemController));

// Protected route to claim admin
router.post('/claim-admin', authenticate, systemController.claimSuperadmin.bind(systemController));

export default router;
