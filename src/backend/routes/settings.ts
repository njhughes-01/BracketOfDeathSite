import express from "express";
import SettingsController from "../controllers/SettingsController"; // Import default export
import { requireSuperAdmin, requireAuth } from "../middleware/auth";

const router = express.Router();

// GET /api/settings/email/status - Check if email is configured (any authenticated user)
router.get("/email/status", requireAuth, SettingsController.isEmailConfigured);

// GET /api/settings/email-providers - List available email providers
router.get("/email-providers", requireSuperAdmin, SettingsController.getEmailProviders);

// GET /api/settings - Fetch current settings (masked)
router.get("/", requireSuperAdmin, SettingsController.getSettings);

// PUT /api/settings - Update settings
router.put("/", requireSuperAdmin, SettingsController.updateSettings);

// PUT /api/settings/email - Update email settings specifically
router.put("/email", requireSuperAdmin, SettingsController.updateEmailSettings);

// POST /api/settings/email/test - Send test email
router.post("/email/test", requireSuperAdmin, SettingsController.testEmail);

// POST /api/settings/email/verify - Verify credentials
router.post("/email/verify", requireSuperAdmin, SettingsController.verifyCredentials);

// GET /api/settings/stripe - Fetch Stripe settings (masked)
router.get("/stripe", requireSuperAdmin, SettingsController.getStripeSettings);

// PUT /api/settings/stripe - Update Stripe settings
router.put("/stripe", requireSuperAdmin, SettingsController.updateStripeSettings);

export default router;

