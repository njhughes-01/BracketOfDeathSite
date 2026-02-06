import SlotReservation from '../models/SlotReservation';
import TournamentInvitation from '../models/TournamentInvitation';
import { Tournament } from '../models/Tournament';
import logger from '../utils/logger';

// Cleanup interval in milliseconds (1 minute)
const CLEANUP_INTERVAL_MS = 60 * 1000;

let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Clean up expired slot reservations
 * - Marks reservations as expired
 * - Decrements spotsReserved on tournaments
 */
export const cleanupExpiredReservations = async (): Promise<number> => {
  try {
    // Find all expired active reservations
    const expiredReservations = await SlotReservation.find({
      status: 'active',
      expiresAt: { $lt: new Date() },
    });
    
    if (expiredReservations.length === 0) {
      return 0;
    }
    
    // Group by tournament to batch update spotsReserved
    const tournamentCounts: Record<string, number> = {};
    
    for (const reservation of expiredReservations) {
      const tournamentId = reservation.tournamentId.toString();
      tournamentCounts[tournamentId] = (tournamentCounts[tournamentId] || 0) + 1;
    }
    
    // Mark all as expired
    const expiredCount = await SlotReservation.expireStaleReservations();
    
    // Decrement spotsReserved for each tournament
    for (const [tournamentId, count] of Object.entries(tournamentCounts)) {
      await Tournament.findByIdAndUpdate(tournamentId, {
        $inc: { spotsReserved: -count },
      });
    }
    
    if (expiredCount > 0) {
      logger.info(`Cleaned up ${expiredCount} expired reservations`);
    }
    
    return expiredCount;
  } catch (error) {
    logger.error('Error cleaning up expired reservations:', error);
    return 0;
  }
};

/**
 * Clean up expired tournament invitations
 */
export const cleanupExpiredInvitations = async (): Promise<number> => {
  try {
    const expiredCount = await TournamentInvitation.expireStaleInvitations();
    
    if (expiredCount > 0) {
      logger.info(`Cleaned up ${expiredCount} expired invitations`);
    }
    
    return expiredCount;
  } catch (error) {
    logger.error('Error cleaning up expired invitations:', error);
    return 0;
  }
};

/**
 * Run all cleanup tasks
 */
export const runCleanup = async (): Promise<void> => {
  await cleanupExpiredReservations();
  await cleanupExpiredInvitations();
};

/**
 * Start the cleanup service
 * Runs cleanup every minute
 */
export const startCleanupService = (): void => {
  if (cleanupInterval) {
    logger.warn('Cleanup service already running');
    return;
  }
  
  logger.info('Starting reservation cleanup service');
  
  // Run immediately on start
  runCleanup();
  
  // Then run every minute
  cleanupInterval = setInterval(runCleanup, CLEANUP_INTERVAL_MS);
};

/**
 * Stop the cleanup service
 */
export const stopCleanupService = (): void => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    logger.info('Reservation cleanup service stopped');
  }
};

export default {
  cleanupExpiredReservations,
  cleanupExpiredInvitations,
  runCleanup,
  startCleanupService,
  stopCleanupService,
};
