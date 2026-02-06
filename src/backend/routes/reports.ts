import { Router } from "express";
import { stripeEventController } from "../controllers/StripeEventController";
import { requireAdmin } from "../middleware/auth";

const router = Router();

// All report routes require admin
router.use(requireAdmin);

// Revenue reports
router.get("/revenue", stripeEventController.getRevenueSummary);
router.get("/revenue/:tournamentId", stripeEventController.getTournamentRevenue);

// Future report endpoints (post-MVP):
// - GET /revenue/export - CSV export of revenue data
// - GET /attendance - Check-in statistics by tournament
// - GET /refunds - Refund summary and details

export default router;
