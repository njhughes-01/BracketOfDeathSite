import express from 'express';
import SettingsController from '../controllers/SettingsController'; // Import default export
import { requireSuperAdmin, requireAuth } from '../middleware/auth';

const router = express.Router();

// GET /api/settings/email/status - Check if email is configured (any authenticated user)
router.get('/email/status', requireAuth, SettingsController.isEmailConfigured);

// GET /api/settings - Fetch current settings (masked)
router.get('/', requireSuperAdmin, SettingsController.getSettings);

// PUT /api/settings - Update settings
router.put('/', requireSuperAdmin, SettingsController.updateSettings);

// POST /api/settings/email/test - Send test email
router.post('/email/test', requireSuperAdmin, SettingsController.testEmail);

export default router;
