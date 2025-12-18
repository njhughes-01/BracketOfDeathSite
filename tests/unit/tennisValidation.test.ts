import {
  validateTennisScore,
  requiresAdminOverride,
} from "../../src/backend/utils/tennisValidation";

/**
 * Tennis Score Validation Tests
 * Tests for Bracket of Death "First to 11" scoring format:
 * - Valid: 11-0 through 11-9
 * - Valid: Win by 2 after 10-10 (12-10, 13-11, etc.)
 * - Valid: 0-0 (no contest)
 */
describe("Tennis Score Validation", () => {
  describe("validateTennisScore", () => {
    describe("Valid Scores - First to 11 Format", () => {
      test("should accept standard wins (11-0 to 11-9)", () => {
        const validScores = [
          [11, 0],
          [11, 1],
          [11, 2],
          [11, 3],
          [11, 4],
          [11, 5],
          [11, 6],
          [11, 7],
          [11, 8],
          [11, 9],
          [0, 11],
          [1, 11],
          [2, 11],
          [3, 11],
          [4, 11],
          [5, 11],
          [6, 11],
          [7, 11],
          [8, 11],
          [9, 11],
        ];

        validScores.forEach(([score1, score2]) => {
          const result = validateTennisScore(score1, score2);
          expect(result.isValid).toBe(true);
          expect(result.reason).toBeUndefined();
        });
      });

      test("should accept win-by-2 after 10-10 deuce", () => {
        const validScores = [
          [12, 10],
          [10, 12],
          [13, 11],
          [11, 13],
          [14, 12],
          [12, 14],
        ];

        validScores.forEach(([score1, score2]) => {
          const result = validateTennisScore(score1, score2);
          expect(result.isValid).toBe(true);
          expect(result.reason).toBeUndefined();
        });
      });

      test("should accept 0-0 score (no contest case)", () => {
        const result = validateTennisScore(0, 0);
        expect(result.isValid).toBe(true);
      });
    });

    describe("Invalid Scores", () => {
      test("should reject incomplete match scores", () => {
        const invalidScores = [
          [5, 3],
          [4, 2],
          [3, 1],
          [5, 4],
          [6, 4],
          [7, 5],
          [10, 8], // These are incomplete in First-to-11
        ];

        invalidScores.forEach(([score1, score2]) => {
          const result = validateTennisScore(score1, score2);
          expect(result.isValid).toBe(false);
          expect(result.reason).toBeDefined();
        });
      });

      test("should reject tied scores except 0-0", () => {
        const invalidScores = [
          [1, 1],
          [2, 2],
          [5, 5],
          [10, 10],
        ];

        invalidScores.forEach(([score1, score2]) => {
          const result = validateTennisScore(score1, score2);
          expect(result.isValid).toBe(false);
          expect(result.reason).toContain("tied");
        });
      });

      test("should reject negative scores", () => {
        const invalidScores = [
          [-1, 11],
          [11, -1],
          [-5, -3],
        ];

        invalidScores.forEach(([score1, score2]) => {
          const result = validateTennisScore(score1, score2);
          expect(result.isValid).toBe(false);
          expect(result.reason).toContain("negative");
        });
      });

      test("should reject non-integer scores", () => {
        const invalidScores = [
          [11.5, 4],
          [11, 4.2],
          [5.5, 3.3],
        ];

        invalidScores.forEach(([score1, score2]) => {
          const result = validateTennisScore(score1, score2);
          expect(result.isValid).toBe(false);
          expect(result.reason).toContain("whole numbers");
        });
      });

      test("should reject win-by-1 after 10-10", () => {
        // Must win by 2 after 10-10
        const invalidScores = [
          [11, 10],
          [10, 11],
        ];

        invalidScores.forEach(([score1, score2]) => {
          const result = validateTennisScore(score1, score2);
          expect(result.isValid).toBe(false);
          expect(result.reason).toBeDefined();
        });
      });
    });

    describe("Edge Cases", () => {
      test("should handle score order (higher score first vs second)", () => {
        // 11-4 and 4-11 should both be valid
        expect(validateTennisScore(11, 4).isValid).toBe(true);
        expect(validateTennisScore(4, 11).isValid).toBe(true);
      });

      test("should provide clear error messages", () => {
        const result = validateTennisScore(5, 3);
        expect(result.reason).toContain("Invalid score");
        expect(result.reason).toContain("5-3");
      });
    });
  });

  describe("requiresAdminOverride", () => {
    test("should return false for valid scores", () => {
      const validScores = [
        [11, 0],
        [11, 9],
        [12, 10],
        [13, 11],
      ];

      validScores.forEach(([score1, score2]) => {
        expect(requiresAdminOverride(score1, score2)).toBe(false);
      });
    });

    test("should return true for invalid scores", () => {
      const invalidScores = [
        [5, 3],
        [4, 2],
        [3, 1],
        [1, 1],
        [6, 4],
        [7, 5],
      ];

      invalidScores.forEach(([score1, score2]) => {
        expect(requiresAdminOverride(score1, score2)).toBe(true);
      });
    });
  });
});

describe("Tennis Score Validation - Real World Scenarios", () => {
  test("injury retirement scenario", () => {
    // Player injured at 3-1 (incomplete match)
    const result = validateTennisScore(3, 1);
    expect(result.isValid).toBe(false);
    expect(requiresAdminOverride(3, 1)).toBe(true);
  });

  test("walkover scenario", () => {
    // Player doesn't show up - recorded as 11-0
    const result = validateTennisScore(11, 0);
    expect(result.isValid).toBe(true);
    expect(requiresAdminOverride(11, 0)).toBe(false);
  });

  test("match stopped for rain scenario", () => {
    // Match stopped at 4-3
    const result = validateTennisScore(4, 3);
    expect(result.isValid).toBe(false);
    expect(requiresAdminOverride(4, 3)).toBe(true);
  });

  test("standard completed match", () => {
    // Normal 11-7 win
    const result = validateTennisScore(11, 7);
    expect(result.isValid).toBe(true);
    expect(requiresAdminOverride(11, 7)).toBe(false);
  });

  test("deuce extended match", () => {
    // Deuce at 10-10, winner gets 12-10
    const result = validateTennisScore(12, 10);
    expect(result.isValid).toBe(true);
    expect(requiresAdminOverride(12, 10)).toBe(false);
  });
});
