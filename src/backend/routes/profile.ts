import { Router } from 'express';
import UserController from '../controllers/UserController';
import ProfileController from '../controllers/ProfileController';
import { requireAuth } from '../middleware/auth';

const router = Router();
const userController = new UserController();

// All profile routes require authentication (but not admin)
router.use(requireAuth);

// Profile routes
router.get('/', ProfileController.getProfile.bind(ProfileController));
router.put('/', ProfileController.updateProfile.bind(ProfileController));
router.post('/link-player', userController.linkPlayerToSelf.bind(userController));
router.post('/password', ProfileController.changePassword.bind(ProfileController));

export default router;
