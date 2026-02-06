import { Router } from "express";
import { stripeEventController } from "../controllers/StripeEventController";
import { requireAdmin } from "../middleware/auth";

const router = Router();

// All report routes require admin
router.use(requireAdmin);

// Revenue reports
router.get("/revenue", stripeEventController.getRevenueSummary);
router.get("/revenue/:tournamentId", stripeEventController.getTournamentRevenue);

// TODO: Add more report endpoints
// router.get("/revenue/export", ...); // CSV export

export default router;
