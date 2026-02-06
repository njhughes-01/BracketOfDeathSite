import { Router, raw } from "express";
import { stripeWebhookController } from "../controllers/StripeWebhookController";
import { stripeEventController } from "../controllers/StripeEventController";
import { requireAuth, requireAdmin } from "../middleware/auth";

const router = Router();

// Webhook route - needs raw body for signature verification
// Note: This should be mounted before body-parser middleware in app.ts
router.post(
  "/webhooks",
  raw({ type: "application/json" }),
  stripeWebhookController.handleWebhook
);

// Admin routes - Stripe event log
router.get("/events", requireAdmin, stripeEventController.getEvents);
router.get("/events/types", requireAdmin, stripeEventController.getEventTypes);
router.get("/events/:id", requireAdmin, stripeEventController.getEvent);

// Customer portal session
router.post("/portal-session", requireAuth, async (req, res) => {
  // TODO: Implement Stripe Customer Portal session creation
  res.status(501).json({
    success: false,
    message: "Stripe Customer Portal not yet implemented",
  });
});

export default router;
