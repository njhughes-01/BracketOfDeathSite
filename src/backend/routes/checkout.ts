import { Router } from "express";
import { checkoutController } from "../controllers/CheckoutController";
import { requireAuth } from "../middleware/auth";

const router = Router();

// All checkout routes require authentication
router.post("/create-session", requireAuth, checkoutController.createCheckoutSession);
router.post("/free", requireAuth, checkoutController.completeFreeRegistration);
router.get("/session/:sessionId", requireAuth, checkoutController.getSessionStatus);

export default router;
