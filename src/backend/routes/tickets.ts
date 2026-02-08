import { Router } from "express";
import { ticketController } from "../controllers/TicketController";
import { requireAuth, requireAdmin } from "../middleware/auth";

const router = Router();

// User routes
router.get("/history", requireAuth, ticketController.getTransactionHistory);
router.get("/tournament/:tournamentId/mine", requireAuth, ticketController.getMyTicketForTournament);
router.get("/", requireAuth, ticketController.getMyTickets);
router.get("/:id", requireAuth, ticketController.getTicket);
router.post("/:id/resend", requireAuth, ticketController.resendTicket);

// Admin routes
router.get("/lookup/:code", requireAdmin, ticketController.lookupTicket);
router.post("/:id/check-in", requireAdmin, ticketController.checkInTicket);
router.post("/:id/void", requireAdmin, ticketController.voidTicket);
router.post("/:id/refund", requireAdmin, ticketController.refundTicket);
router.post("/:id/remove", requireAdmin, ticketController.removeFromTournament);

export default router;
