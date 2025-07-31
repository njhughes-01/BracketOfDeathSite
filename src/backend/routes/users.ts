import { Router } from 'express';
import UserController from '../controllers/UserController';
import { requireAdmin } from '../middleware/auth';

const router = Router();
const userController = new UserController();

// All user management routes require admin privileges
router.use(requireAdmin);

// User CRUD operations
router.get('/', userController.getUsers.bind(userController));
router.get('/roles', userController.getAvailableRoles.bind(userController));
router.get('/:id', userController.getUser.bind(userController));
router.post('/', userController.createUser.bind(userController));
router.put('/:id', userController.updateUser.bind(userController));
router.delete('/:id', userController.deleteUser.bind(userController));

// User-specific operations
router.put('/:id/roles', userController.updateUserRoles.bind(userController));
router.post('/:id/password', userController.resetPassword.bind(userController));

export default router;