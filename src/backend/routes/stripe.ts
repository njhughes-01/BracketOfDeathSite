import { Router } from "express";
import { stripeEventController } from "../controllers/StripeEventController";
import { connectController } from "../controllers/ConnectController";
import { requireAuth, requireAdmin } from "../middleware/auth";

const router = Router();

// Webhook route is mounted directly in server.ts BEFORE body-parser middleware
// to ensure raw body is available for Stripe signature verification.

// Admin routes - Stripe event log
router.get("/events", requireAdmin, stripeEventController.getEvents);
router.get("/events/types", requireAdmin, stripeEventController.getEventTypes);
router.get("/events/:id", requireAdmin, stripeEventController.getEvent);

// Stripe Connect routes (admin)
router.post("/connect/onboard", requireAdmin, connectController.onboard);
router.get("/connect/status", requireAdmin, connectController.getStatus);
router.get("/connect/dashboard", requireAdmin, connectController.getDashboardLink);

// Customer portal session
router.post("/portal-session", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.sub || (req as any).user?.id;
    const { returnUrl } = req.body;
    
    if (!returnUrl) {
      return res.status(400).json({
        success: false,
        message: "returnUrl is required",
      });
    }
    
    // Get user's email from a ticket or use auth email
    const userEmail = (req as any).user?.email;
    const userName = (req as any).user?.name || "Customer";
    
    if (!userEmail) {
      return res.status(400).json({
        success: false,
        message: "User email not available",
      });
    }
    
    // Find or create customer
    const StripeService = (await import("../services/StripeService")).default;
    const customer = await StripeService.findOrCreateCustomer(
      userEmail,
      userName,
      { userId }
    );
    
    // Create portal session
    const session = await StripeService.createPortalSession(
      customer.id,
      returnUrl
    );
    
    return res.json({
      success: true,
      data: {
        url: session.url,
      },
    });
  } catch (error: any) {
    console.error("Failed to create portal session:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create portal session",
    });
  }
});

export default router;
