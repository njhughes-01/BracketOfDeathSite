import { Router } from "express";
import playersRoutes from "./players";
import tournamentsRoutes from "./tournaments";
import tournamentResultsRoutes from "./tournamentResults";
import dataRoutes from "./data";
import adminRoutes from "./admin";
import usersRoutes from "./users";
import profileRoutes from "./profile";
import authRoutes from "./auth";
import settingsRoutes from "./settings";
import systemRoutes from "./system";

// Phase 4: Stripe & Ticketing routes
import discountCodesRoutes from "./discountCodes";
import checkoutRoutes from "./checkout";
import ticketsRoutes from "./tickets";
import stripeRoutes from "./stripe";
import reportsRoutes from "./reports";

const router = Router();

// Mount all route modules
router.use("/auth", authRoutes);
router.use("/players", playersRoutes);
router.use("/tournaments", tournamentsRoutes);
router.use("/tournament-results", tournamentResultsRoutes);
router.use("/data", dataRoutes);
router.use("/admin", adminRoutes);
router.use("/admin/users", usersRoutes);
router.use("/profile", profileRoutes);
router.use("/settings", settingsRoutes);
router.use("/system", systemRoutes);

// Phase 4: Stripe & Ticketing routes
router.use("/discount-codes", discountCodesRoutes);
router.use("/checkout", checkoutRoutes);
router.use("/tickets", ticketsRoutes);
router.use("/stripe", stripeRoutes);
router.use("/reports", reportsRoutes);

// API info endpoint
router.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Bracket of Death API",
    version: "2.1.0",
    endpoints: {
      players: "/api/players",
      tournaments: "/api/tournaments",
      tournamentResults: "/api/tournament-results",
      data: "/api/data",
      admin: "/api/admin",
      users: "/api/admin/users",
      profile: "/api/profile",
      // Phase 4: Stripe & Ticketing
      discountCodes: "/api/discount-codes",
      checkout: "/api/checkout",
      tickets: "/api/tickets",
      stripe: "/api/stripe",
      reports: "/api/reports",
    },
    documentation: "See CLAUDE.md for API documentation",
  });
});

export default router;
