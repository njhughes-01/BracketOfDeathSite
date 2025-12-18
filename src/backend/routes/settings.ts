import express from 'express';
import SettingsController from '../controllers/SettingsController'; // Import default export
import { requireSuperAdmin } from '../middleware/auth';

const router = express.Router();

// GET /api/settings - Fetch current settings (masked)
router.get('/', requireSuperAdmin, SettingsController.getSettings);

// PUT /api/settings - Update settings
router.put('/', requireSuperAdmin, SettingsController.updateSettings);

export default router;
