import { Request, Response } from "express";
import { BaseController } from "./base";
import TournamentInvitation, { DEFAULT_INVITATION_EXPIRY_HOURS } from "../models/TournamentInvitation";
import { Tournament } from "../models/Tournament";
import { Player } from "../models/Player";
import { Types } from "mongoose";
import logger from "../utils/logger";
import emailService from "../services/EmailService";
import { generateTournamentInvitationEmail } from "../services/email/templates/tournamentInvitation";
import { generateInvitationReminderEmail } from "../services/email/templates/invitationReminder";

export class InvitationController extends BaseController {
  constructor() {
    super();
  }

  // Get invitations for tournament (GET /api/tournaments/:id/invitations) - Admin
  getInvitations = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id: tournamentId } = req.params;
      const { status } = req.query;
      
      if (!Types.ObjectId.isValid(tournamentId)) {
        return this.sendError(res, "Invalid tournament ID", 400);
      }
      
      let invitations;
      if (status === 'pending') {
        invitations = await TournamentInvitation.getPendingForTournament(
          new Types.ObjectId(tournamentId)
        );
      } else {
        invitations = await TournamentInvitation.getForTournament(
          new Types.ObjectId(tournamentId)
        );
      }
      
      // Get stats
      const stats = {
        total: invitations.length,
        pending: invitations.filter(i => i.status === 'pending').length,
        paid: invitations.filter(i => i.status === 'paid').length,
        declined: invitations.filter(i => i.status === 'declined').length,
        expired: invitations.filter(i => i.status === 'expired').length,
      };
      
      this.sendSuccess(res, { invitations, stats }, "Invitations retrieved successfully");
    }
  );

  // Send invitations (POST /api/tournaments/:id/invitations) - Admin
  sendInvitations = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id: tournamentId } = req.params;
      const { players, deadline, message } = req.body;
      const adminUserId = (req as any).user?.sub || (req as any).user?.id;
      
      if (!Types.ObjectId.isValid(tournamentId)) {
        return this.sendError(res, "Invalid tournament ID", 400);
      }
      
      if (!players || !Array.isArray(players) || players.length === 0) {
        return this.sendError(res, "Players array is required", 400);
      }
      
      // Verify tournament exists and is invite-only
      const tournament = await Tournament.findById(tournamentId);
      if (!tournament) {
        return this.sendNotFound(res, "Tournament");
      }
      
      // Calculate expiry
      const expiryHours = deadline 
        ? Math.floor((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60))
        : (tournament.paymentDeadlineHours || DEFAULT_INVITATION_EXPIRY_HOURS);
      
      const results = {
        sent: 0,
        failed: [] as Array<{ playerId: string; error: string }>,
      };
      
      for (const playerData of players) {
        const { playerId, email } = playerData;
        
        try {
          if (!Types.ObjectId.isValid(playerId)) {
            results.failed.push({ playerId, error: 'Invalid player ID' });
            continue;
          }
          
          // Get player
          const player = await Player.findById(playerId);
          if (!player) {
            results.failed.push({ playerId, error: 'Player not found' });
            continue;
          }
          
          // Determine email - use provided or player's email
          const playerEmail = email || player.email;
          if (!playerEmail) {
            results.failed.push({ playerId, error: 'Email address required' });
            continue;
          }
          
          // Check if already invited
          const existingInvitation = await TournamentInvitation.findOne({
            tournamentId: new Types.ObjectId(tournamentId),
            playerId: new Types.ObjectId(playerId),
            status: { $in: ['pending', 'paid'] },
          });
          
          if (existingInvitation) {
            results.failed.push({ playerId, error: 'Already invited' });
            continue;
          }
          
          // Create invitation
          const invitation = await TournamentInvitation.createInvitation(
            new Types.ObjectId(tournamentId),
            new Types.ObjectId(playerId),
            playerEmail,
            new Types.ObjectId(adminUserId),
            expiryHours,
            message
          );
          
          // Send invitation email
          try {
            const branding = await emailService.getBrandingConfig();
            const appUrl = process.env.APP_URL || 'http://localhost:5173';
            
            // Get admin name if available (from their player profile)
            let invitedByName: string | undefined;
            const adminPlayer = await Player.findOne({ keycloakUserId: adminUserId });
            if (adminPlayer) {
              invitedByName = adminPlayer.name;
            }
            
            const emailContent = generateTournamentInvitationEmail({
              playerName: player.name,
              invitedByName,
              tournament: {
                id: tournamentId,
                name: `BOD #${tournament.bodNumber}`,
                bodNumber: tournament.bodNumber,
                date: tournament.date,
                location: tournament.location || 'TBA',
                format: tournament.format,
                entryFee: tournament.entryFee || 0,
              },
              expiresAt: invitation.expiresAt!,
              customMessage: message,
              paymentLink: `${appUrl}/tournaments/${tournamentId}/register`,
              branding,
            });
            
            const html = await emailService.wrapInBrandedTemplate(emailContent.html);
            
            await emailService.sendEmail({
              to: playerEmail,
              subject: emailContent.subject,
              text: emailContent.text,
              html,
            });
            
            logger.info(`Invitation email sent to ${playerEmail} for tournament ${tournamentId}`);
          } catch (emailError) {
            logger.error(`Failed to send invitation email to ${playerEmail}:`, emailError);
            // Don't fail the invitation, just log the error
          }
          
          results.sent++;
          
        } catch (error: any) {
          logger.error(`Failed to send invitation to ${playerId}:`, error);
          results.failed.push({ playerId, error: error.message || 'Unknown error' });
        }
      }
      
      logger.info(`Invitations sent for tournament ${tournamentId}: ${results.sent} sent, ${results.failed.length} failed`);
      
      this.sendSuccess(res, results, `${results.sent} invitation(s) sent successfully`);
    }
  );

  // Resend invitation reminder (POST /api/tournaments/:id/invitations/:playerId/remind) - Admin
  sendReminder = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id: tournamentId, playerId } = req.params;
      
      if (!Types.ObjectId.isValid(tournamentId) || !Types.ObjectId.isValid(playerId)) {
        return this.sendError(res, "Invalid tournament or player ID", 400);
      }
      
      const invitation = await TournamentInvitation.findOne({
        tournamentId: new Types.ObjectId(tournamentId),
        playerId: new Types.ObjectId(playerId),
        status: 'pending',
      }).populate('playerId', 'firstName lastName');
      
      if (!invitation) {
        return this.sendNotFound(res, "Pending invitation");
      }
      
      if (!invitation.canSendReminder) {
        return this.sendError(res, "Cannot send reminder at this time", 429);
      }
      
      // Get tournament details
      const tournament = await Tournament.findById(tournamentId);
      if (!tournament) {
        return this.sendNotFound(res, "Tournament");
      }
      
      // Get player details
      const player = invitation.playerId as any;
      
      // Calculate hours remaining
      const hoursRemaining = invitation.expiresAt 
        ? Math.max(0, (invitation.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60))
        : 24;
      
      // Send reminder email
      try {
        const branding = await emailService.getBrandingConfig();
        const appUrl = process.env.APP_URL || 'http://localhost:5173';
        
        const emailContent = generateInvitationReminderEmail({
          playerName: player.name,
          tournament: {
            id: tournamentId,
            name: `BOD #${tournament.bodNumber}`,
            bodNumber: tournament.bodNumber,
            date: tournament.date,
            location: tournament.location || 'TBA',
            entryFee: tournament.entryFee || 0,
          },
          expiresAt: invitation.expiresAt!,
          hoursRemaining,
          paymentLink: `${appUrl}/tournaments/${tournamentId}/register`,
          branding,
        });
        
        const html = await emailService.wrapInBrandedTemplate(emailContent.html);
        
        await emailService.sendEmail({
          to: invitation.email,
          subject: emailContent.subject,
          text: emailContent.text,
          html,
        });
        
        logger.info(`Reminder email sent to ${invitation.email} for tournament ${tournamentId}`);
      } catch (emailError) {
        logger.error(`Failed to send reminder email to ${invitation.email}:`, emailError);
        return this.sendError(res, "Failed to send reminder email", 500);
      }
      
      await invitation.recordReminderSent();
      
      logger.info(`Invitation reminder sent for tournament ${tournamentId}, player ${playerId}`);
      
      this.sendSuccess(res, {
        remindersSent: invitation.remindersSent,
        lastReminderAt: invitation.lastReminderAt,
      }, "Reminder sent successfully");
    }
  );

  // Revoke invitation (DELETE /api/tournaments/:id/invitations/:playerId) - Admin
  revokeInvitation = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id: tournamentId, playerId } = req.params;
      
      if (!Types.ObjectId.isValid(tournamentId) || !Types.ObjectId.isValid(playerId)) {
        return this.sendError(res, "Invalid tournament or player ID", 400);
      }
      
      const invitation = await TournamentInvitation.findOne({
        tournamentId: new Types.ObjectId(tournamentId),
        playerId: new Types.ObjectId(playerId),
      });
      
      if (!invitation) {
        return this.sendNotFound(res, "Invitation");
      }
      
      if (invitation.status === 'paid') {
        return this.sendError(res, "Cannot revoke a paid invitation", 400);
      }
      
      await TournamentInvitation.deleteOne({ _id: invitation._id });
      
      logger.info(`Invitation revoked for tournament ${tournamentId}, player ${playerId}`);
      
      this.sendSuccess(res, {}, "Invitation revoked successfully");
    }
  );

  // Check if player is invited (for registration flow)
  checkInvitation = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id: tournamentId } = req.params;
      const userId = (req as any).user?.sub || (req as any).user?.id;
      
      if (!userId) {
        return this.sendError(res, "Authentication required", 401);
      }
      
      // Get player for this user
      const player = await Player.findOne({ keycloakUserId: userId });
      if (!player) {
        return this.sendSuccess(res, { isInvited: false }, "Player not found");
      }
      
      const isInvited = await TournamentInvitation.isPlayerInvited(
        new Types.ObjectId(tournamentId),
        player._id as Types.ObjectId
      );
      
      let invitation = null;
      if (isInvited) {
        invitation = await TournamentInvitation.findOne({
          tournamentId: new Types.ObjectId(tournamentId),
          playerId: player._id,
          status: { $in: ['pending', 'paid'] },
        });
      }
      
      this.sendSuccess(res, {
        isInvited,
        invitation: invitation ? {
          status: invitation.status,
          expiresAt: invitation.expiresAt,
          invitedAt: invitation.invitedAt,
        } : null,
      }, isInvited ? "Player is invited" : "Player is not invited");
    }
  );
}

export const invitationController = new InvitationController();
export default invitationController;
