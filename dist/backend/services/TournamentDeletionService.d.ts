export interface DeletionOperation {
    correlationId: string;
    tournamentId: string;
    adminUserId: string;
    status: 'started' | 'matches_deleted' | 'results_deleted' | 'tournament_deleted' | 'completed' | 'failed' | 'compensating';
    steps: DeletionStep[];
    error?: Error;
    startTime: Date;
    endTime?: Date;
}
export interface DeletionStep {
    name: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'compensated';
    startTime?: Date;
    endTime?: Date;
    expectedCount?: number;
    actualCount?: number;
    error?: Error;
    compensationData?: any;
}
export interface DeletionResult {
    success: boolean;
    operation: DeletionOperation;
    tournamentInfo?: {
        format: string;
        date: string;
    };
}
export declare class TournamentDeletionError extends Error {
    readonly code: string;
    readonly retryable: boolean;
    readonly operation?: DeletionOperation;
    constructor(message: string, code: string, retryable?: boolean, operation?: DeletionOperation);
}
export declare class TournamentDeletionService {
    private readonly BATCH_SIZE;
    private readonly MAX_RETRY_ATTEMPTS;
    deleteTournament(tournamentId: string, adminUserId: string, correlationId?: string): Promise<DeletionResult>;
    private validateAndPrepareDeletion;
    private deleteMatchesWithCompensation;
    private deleteResultsWithCompensation;
    private deleteTournamentEntity;
    private attemptCompensation;
    private getStep;
    private generateCorrelationId;
    private sanitizeOperationForLogging;
    isRetryable(error: TournamentDeletionError): boolean;
    getOperationSummary(operation: DeletionOperation): any;
}
export default TournamentDeletionService;
//# sourceMappingURL=TournamentDeletionService.d.ts.map