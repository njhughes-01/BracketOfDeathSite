import { Router } from "express";
import { checkoutController } from "../controllers/CheckoutController";
import { requireAuth } from "../middleware/auth";

const router = Router();

// All checkout routes require authentication
router.post("/create-session", requireAuth, checkoutController.createCheckoutSession);
router.post("/free", requireAuth, checkoutController.completeFreeRegistration);
router.get("/session/:sessionId", requireAuth, checkoutController.getSessionStatus);

// Reservation routes
router.post("/reserve/:tournamentId", requireAuth, checkoutController.reserveSlot);
router.post("/cancel-reservation/:reservationId", requireAuth, checkoutController.cancelReservation);
router.get("/reservation/:reservationId", requireAuth, checkoutController.getReservation);

export default router;
