import { Router } from 'express';
import UserController from '../controllers/UserController';
import { requireAuth } from '../middleware/auth';

const router = Router();
const userController = new UserController();

// All profile routes require authentication (but not admin)
router.use(requireAuth);

// Link current user to a player profile
router.post('/link-player', userController.linkPlayerToSelf.bind(userController));

export default router;
