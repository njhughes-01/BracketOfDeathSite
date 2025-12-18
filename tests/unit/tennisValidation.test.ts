import { validateTennisScore, requiresAdminOverride } from '../../src/backend/utils/tennisValidation';

describe('Tennis Score Validation', () => {
  describe('validateTennisScore', () => {
    describe('Valid Tennis Scores', () => {
      test('should accept standard wins (6-0 to 6-4)', () => {
        const validScores = [
          [6, 0], [6, 1], [6, 2], [6, 3], [6, 4],
          [0, 6], [1, 6], [2, 6], [3, 6], [4, 6]
        ];

        validScores.forEach(([score1, score2]) => {
          const result = validateTennisScore(score1, score2);
          expect(result.isValid).toBe(true);
          expect(result.reason).toBeUndefined();
        });
      });

      test('should accept tiebreak wins (7-5, 7-6)', () => {
        const validScores = [[7, 5], [5, 7], [7, 6], [6, 7]];

        validScores.forEach(([score1, score2]) => {
          const result = validateTennisScore(score1, score2);
          expect(result.isValid).toBe(true);
          expect(result.reason).toBeUndefined();
        });
      });

      test('should accept extended play scores', () => {
        const validScores = [[8, 6], [6, 8], [9, 7], [7, 9], [10, 8], [8, 10]];

        validScores.forEach(([score1, score2]) => {
          const result = validateTennisScore(score1, score2);
          expect(result.isValid).toBe(true);
          expect(result.reason).toBeUndefined();
        });
      });

      test('should accept walkover/forfeit scores (one team at 0)', () => {
        const validScores = [
          [0, 1], [0, 6], [0, 7],
          [1, 0], [6, 0], [7, 0]
        ];

        validScores.forEach(([score1, score2]) => {
          const result = validateTennisScore(score1, score2);
          expect(result.isValid).toBe(true);
        });
      });

      test('should accept 0-0 score (admin override case)', () => {
        const result = validateTennisScore(0, 0);
        expect(result.isValid).toBe(true);
      });
    });

    describe('Invalid Tennis Scores', () => {
      test('should reject incomplete match scores', () => {
        const invalidScores = [
          [5, 3], [4, 2], [3, 1], [5, 4]
        ];

        invalidScores.forEach(([score1, score2]) => {
          const result = validateTennisScore(score1, score2);
          expect(result.isValid).toBe(false);
          expect(result.reason).toBeDefined();
        });
      });

      test('should reject tied scores except 0-0', () => {
        const invalidScores = [
          [1, 1], [2, 2], [5, 5], [6, 6]
        ];

        invalidScores.forEach(([score1, score2]) => {
          const result = validateTennisScore(score1, score2);
          expect(result.isValid).toBe(false);
          expect(result.reason).toContain('tied');
        });
      });

      test('should reject negative scores', () => {
        const invalidScores = [
          [-1, 6], [6, -1], [-5, -3]
        ];

        invalidScores.forEach(([score1, score2]) => {
          const result = validateTennisScore(score1, score2);
          expect(result.isValid).toBe(false);
          expect(result.reason).toContain('negative');
        });
      });

      test('should reject non-integer scores', () => {
        const invalidScores = [
          [6.5, 4], [6, 4.2], [5.5, 3.3]
        ];

        invalidScores.forEach(([score1, score2]) => {
          const result = validateTennisScore(score1, score2);
          expect(result.isValid).toBe(false);
          expect(result.reason).toContain('whole numbers');
        });
      });

      test('should reject invalid high scores', () => {
        const invalidScores = [
          [8, 4], [9, 5], [10, 6]
        ];

        invalidScores.forEach(([score1, score2]) => {
          const result = validateTennisScore(score1, score2);
          expect(result.isValid).toBe(false);
          expect(result.reason).toBeDefined();
        });
      });
    });

    describe('Edge Cases', () => {
      test('should handle score order (higher score first vs second)', () => {
        // 6-4 and 4-6 should both be valid
        expect(validateTennisScore(6, 4).isValid).toBe(true);
        expect(validateTennisScore(4, 6).isValid).toBe(true);
      });

      test('should provide clear error messages', () => {
        const result = validateTennisScore(5, 3);
        expect(result.reason).toContain('Invalid tennis score');
        expect(result.reason).toContain('5-3');
      });
    });
  });

  describe('requiresAdminOverride', () => {
    test('should return false for valid scores', () => {
      const validScores = [
        [6, 0], [6, 4], [7, 5], [7, 6]
      ];

      validScores.forEach(([score1, score2]) => {
        expect(requiresAdminOverride(score1, score2)).toBe(false);
      });
    });

    test('should return true for invalid scores', () => {
      const invalidScores = [
        [5, 3], [4, 2], [3, 1], [1, 1]
      ];

      invalidScores.forEach(([score1, score2]) => {
        expect(requiresAdminOverride(score1, score2)).toBe(true);
      });
    });
  });
});

describe('Tennis Score Validation - Real World Scenarios', () => {
  test('injury retirement scenario', () => {
    // Player injured at 3-1 (incomplete match)
    const result = validateTennisScore(3, 1);
    expect(result.isValid).toBe(false);
    expect(requiresAdminOverride(3, 1)).toBe(true);
  });

  test('walkover scenario', () => {
    // Player doesn't show up
    const result = validateTennisScore(6, 0);
    expect(result.isValid).toBe(true);
    expect(requiresAdminOverride(6, 0)).toBe(false);
  });

  test('match stopped for rain scenario', () => {
    // Match stopped at 4-3
    const result = validateTennisScore(4, 3);
    expect(result.isValid).toBe(false);
    expect(requiresAdminOverride(4, 3)).toBe(true);
  });

  test('standard completed match', () => {
    // Normal 6-4 win
    const result = validateTennisScore(6, 4);
    expect(result.isValid).toBe(true);
    expect(requiresAdminOverride(6, 4)).toBe(false);
  });

  test('tiebreak match', () => {
    // Tiebreak at 6-6, winner gets 7-6
    const result = validateTennisScore(7, 6);
    expect(result.isValid).toBe(true);
    expect(requiresAdminOverride(7, 6)).toBe(false);
  });
});
