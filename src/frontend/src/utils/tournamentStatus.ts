/**
 * Utility functions for tournament status determination
 */

export const getTournamentStatus = (
  dateString: string,
): "scheduled" | "active" | "completed" => {
  const tournamentDate = new Date(dateString);
  const today = new Date();

  // Reset time to compare just dates
  const todayTime = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime();
  const tournamentTime = new Date(
    tournamentDate.getFullYear(),
    tournamentDate.getMonth(),
    tournamentDate.getDate(),
  ).getTime();

  if (tournamentTime < todayTime) return "completed";
  if (tournamentTime === todayTime) return "active";
  return "scheduled";
};

export const getStatusDisplayInfo = (
  status: "scheduled" | "active" | "completed",
) => {
  switch (status) {
    case "active":
      return {
        label: "In Progress",
        color: "bg-accent text-black",
      };
    case "scheduled":
      return {
        label: "Scheduled",
        color: "bg-blue-100 text-blue-800",
      };
    case "completed":
      return {
        label: "Completed",
        color: "bg-green-100 text-green-800",
      };
    default:
      return {
        label: "Unknown",
        color: "bg-gray-100 text-gray-800",
      };
  }
};
