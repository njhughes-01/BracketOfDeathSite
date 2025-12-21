"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTennisScore = validateTennisScore;
exports.requiresAdminOverride = requiresAdminOverride;
exports.validateScoreForCompletion = validateScoreForCompletion;
function validateTennisScore(team1Score, team2Score) {
    if (!Number.isInteger(team1Score) || !Number.isInteger(team2Score)) {
        return {
            isValid: false,
            reason: 'Scores must be whole numbers'
        };
    }
    if (team1Score < 0 || team2Score < 0) {
        return {
            isValid: false,
            reason: 'Scores cannot be negative'
        };
    }
    if (team1Score === 0 && team2Score === 0) {
        return {
            isValid: true
        };
    }
    if (team1Score === team2Score) {
        return {
            isValid: false,
            reason: 'Scores cannot be tied - one team must win'
        };
    }
    const higherScore = Math.max(team1Score, team2Score);
    const lowerScore = Math.min(team1Score, team2Score);
    if (higherScore === 11 && lowerScore <= 9) {
        return { isValid: true };
    }
    if (lowerScore >= 10 && (higherScore - lowerScore) === 2) {
        return { isValid: true };
    }
    return {
        isValid: false,
        reason: `Invalid score: ${team1Score}-${team2Score}. Valid scores: 11-0 through 11-9, or win-by-2 after 10-10 (e.g., 12-10, 13-11). Incomplete matches require admin override.`
    };
}
function requiresAdminOverride(team1Score, team2Score) {
    const validation = validateTennisScore(team1Score, team2Score);
    return !validation.isValid;
}
function validateScoreForCompletion(team1Score, team2Score, adminOverride) {
    const validation = validateTennisScore(team1Score, team2Score);
    if (validation.isValid) {
        return {
            canComplete: true,
            requiresOverride: false
        };
    }
    if (adminOverride && adminOverride.reason && adminOverride.authorizedBy) {
        return {
            canComplete: true,
            requiresOverride: true,
            validationMessage: `Admin override: ${adminOverride.reason}`
        };
    }
    return {
        canComplete: false,
        requiresOverride: true,
        validationMessage: validation.reason
    };
}
//# sourceMappingURL=tennisValidation.js.map