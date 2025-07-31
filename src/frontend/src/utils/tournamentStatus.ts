/**
 * Utility functions for tournament status determination
 */

export const getTournamentStatus = (dateString: string): 'scheduled' | 'completed' => {
  const tournamentDate = new Date(dateString);
  const today = new Date();
  
  // Reset time to compare just dates
  today.setHours(0, 0, 0, 0);
  tournamentDate.setHours(0, 0, 0, 0);
  
  return tournamentDate < today ? 'completed' : 'scheduled';
};

export const getStatusDisplayInfo = (status: 'scheduled' | 'completed') => {
  switch (status) {
    case 'scheduled':
      return {
        label: 'Scheduled',
        color: 'bg-blue-100 text-blue-800'
      };
    case 'completed':
      return {
        label: 'Completed', 
        color: 'bg-green-100 text-green-800'
      };
    default:
      return {
        label: 'Unknown',
        color: 'bg-gray-100 text-gray-800'
      };
  }
};