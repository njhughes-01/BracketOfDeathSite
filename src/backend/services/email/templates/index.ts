/**
 * Email Templates for Phase 4 Ticket System
 * 
 * These templates generate branded HTML emails for the tournament
 * ticket lifecycle: registration, invitations, reminders, and refunds.
 */

export {
  generateTicketConfirmationEmail,
  type TicketEmailData,
} from "./ticketConfirmation";

export {
  generateTournamentInvitationEmail,
  type InvitationEmailData,
} from "./tournamentInvitation";

export {
  generateInvitationReminderEmail,
  type InvitationReminderEmailData,
} from "./invitationReminder";

export {
  generateRefundConfirmationEmail,
  type RefundEmailData,
} from "./refundConfirmation";
