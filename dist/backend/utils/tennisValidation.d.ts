export interface TennisScoreValidation {
    isValid: boolean;
    reason?: string;
}
export declare function validateTennisScore(team1Score: number, team2Score: number): TennisScoreValidation;
export declare function requiresAdminOverride(team1Score: number, team2Score: number): boolean;
export interface ScoreValidationWithOverride {
    canComplete: boolean;
    requiresOverride: boolean;
    validationMessage?: string;
}
export declare function validateScoreForCompletion(team1Score: number, team2Score: number, adminOverride?: {
    reason: string;
    authorizedBy: string;
}): ScoreValidationWithOverride;
//# sourceMappingURL=tennisValidation.d.ts.map