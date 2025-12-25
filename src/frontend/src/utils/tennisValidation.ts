/**
 * Tennis Score Validation Utilities (Frontend)
 * Validates tennis match scores according to standard tennis rules
 */

export interface TennisScoreValidation {
  isValid: boolean;
  reason?: string;
}

/**
 * Validates if a score is valid according to Bracket of Death tournament rules
 * Uses "First to 11 games" format (pro-set style)
 *
 * Valid scores include:
 * - First to 11: 11-0, 11-1, 11-2, ... 11-9
 * - Win by 2 after 10-10: 12-10, 13-11, 14-12, etc.
 * - Special case: 0-0 (no contest)
 * - Invalid scores (2-0, 5-3, 9-8, etc.) require admin override
 *
 * @param team1Score - Score for team 1
 * @param team2Score - Score for team 2
 * @returns Validation result with reason if invalid
 */
export function validateTennisScore(
  team1Score: number,
  team2Score: number,
): TennisScoreValidation {
  // Ensure scores are non-negative integers
  if (!Number.isInteger(team1Score) || !Number.isInteger(team2Score)) {
    return {
      isValid: false,
      reason: "Scores must be whole numbers",
    };
  }

  if (team1Score < 0 || team2Score < 0) {
    return {
      isValid: false,
      reason: "Scores cannot be negative",
    };
  }

  // Special case: 0-0 is allowed for no contest/forfeit
  if (team1Score === 0 && team2Score === 0) {
    return {
      isValid: true,
    };
  }

  // Ties are not allowed (except 0-0 handled above)
  if (team1Score === team2Score) {
    return {
      isValid: false,
      reason: "Scores cannot be tied - one team must win",
    };
  }

  const higherScore = Math.max(team1Score, team2Score);
  const lowerScore = Math.min(team1Score, team2Score);

  // Bracket of Death uses "First to 11" format
  // Valid scenarios:
  // 1. Winner reaches 11 with loser at 0-9 (11-0, 11-1, ... 11-9)
  // 2. Win by 2 after 10-10 deuce (12-10, 13-11, 14-12, etc.)

  // Check if winner reached 11 with loser at 0-9
  if (higherScore === 11 && lowerScore <= 9) {
    return { isValid: true };
  }

  // Check win-by-2 scenarios after 10-10 (12-10, 13-11, 14-12, etc.)
  // Both scores must be >= 10, difference must be 2, higher score wins
  if (lowerScore >= 10 && higherScore - lowerScore === 2) {
    return { isValid: true };
  }

  // Invalid score
  return {
    isValid: false,
    reason: `Invalid score: ${team1Score}-${team2Score}. Valid scores: 11-0 through 11-9, or win-by-2 after 10-10 (e.g., 12-10, 13-11). Incomplete matches require admin override.`,
  };
}

/**
 * Check if a score requires admin override
 * (e.g., incomplete match, injury retirement)
 */
export function requiresAdminOverride(
  team1Score: number,
  team2Score: number,
): boolean {
  // Scores that don't follow standard tennis rules
  const validation = validateTennisScore(team1Score, team2Score);
  return !validation.isValid;
}
