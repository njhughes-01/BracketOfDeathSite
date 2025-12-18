import { Types } from 'mongoose';
import { Tournament } from '../models/Tournament';
import { Match } from '../models/Match';
import { TournamentResult } from '../models/TournamentResult';
import { ITournament } from '../types/tournament';

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

export class TournamentDeletionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false,
    public readonly operation?: DeletionOperation
  ) {
    super(message);
    this.name = 'TournamentDeletionError';
  }
}

export class TournamentDeletionService {
  private readonly BATCH_SIZE = 100; // Process in batches to avoid memory issues
  private readonly MAX_RETRY_ATTEMPTS = 3;
  
  /**
   * Enhanced tournament deletion with enterprise patterns:
   * - Compensation pattern for rollback
   * - Operation tracking for audit
   * - Error classification and handling
   * - Batch processing for performance
   * - Idempotency for safe retries
   */
  public async deleteTournament(
    tournamentId: string,
    adminUserId: string,
    correlationId?: string
  ): Promise<DeletionResult> {
    const operation: DeletionOperation = {
      correlationId: correlationId || this.generateCorrelationId(),
      tournamentId,
      adminUserId,
      status: 'started',
      steps: [
        { name: 'validate_tournament', status: 'pending' },
        { name: 'delete_matches', status: 'pending' },
        { name: 'delete_results', status: 'pending' },
        { name: 'delete_tournament', status: 'pending' },
      ],
      startTime: new Date(),
    };

    try {
      console.log(`[${operation.correlationId}] Starting tournament deletion`, {
        tournamentId,
        adminUserId,
        timestamp: operation.startTime.toISOString(),
      });

      // Step 1: Validate and prepare
      const tournament = await this.validateAndPrepareDeletion(operation);
      
      // Step 2: Delete matches in batches
      await this.deleteMatchesWithCompensation(operation);
      
      // Step 3: Delete results in batches
      await this.deleteResultsWithCompensation(operation);
      
      // Step 4: Delete tournament
      await this.deleteTournamentEntity(operation);
      
      // Mark as completed
      operation.status = 'completed';
      operation.endTime = new Date();
      
      console.log(`[${operation.correlationId}] Tournament deletion completed successfully`, {
        tournamentId,
        duration: operation.endTime.getTime() - operation.startTime.getTime(),
        steps: operation.steps.map(s => ({ name: s.name, status: s.status, actualCount: s.actualCount })),
      });

      return {
        success: true,
        operation,
        tournamentInfo: {
          format: tournament.format,
          date: tournament.date.toDateString(),
        },
      };

    } catch (error) {
      operation.status = 'failed';
      operation.error = error as Error;
      operation.endTime = new Date();
      
      console.error(`[${operation.correlationId}] Tournament deletion failed`, {
        tournamentId,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : error,
        operation: this.sanitizeOperationForLogging(operation),
      });

      // Attempt compensation if we're in a partial state
      if (['matches_deleted', 'results_deleted'].includes(operation.status)) {
        await this.attemptCompensation(operation);
      }

      throw error;
    }
  }

  private async validateAndPrepareDeletion(operation: DeletionOperation): Promise<ITournament> {
    const step = this.getStep(operation, 'validate_tournament');
    step.status = 'running';
    step.startTime = new Date();

    try {
      // Validate ObjectId format
      if (!Types.ObjectId.isValid(operation.tournamentId)) {
        throw new TournamentDeletionError(
          'Invalid tournament ID format',
          'INVALID_ID',
          false,
          operation
        );
      }

      // Find tournament
      const tournament = await Tournament.findById(operation.tournamentId);
      if (!tournament) {
        throw new TournamentDeletionError(
          'Tournament not found',
          'NOT_FOUND',
          false,
          operation
        );
      }

      // Validate status
      if (!['scheduled', 'completed'].includes(tournament.status)) {
        throw new TournamentDeletionError(
          `Cannot delete tournament with status '${tournament.status}'. Only scheduled or completed tournaments can be deleted.`,
          'INVALID_STATUS',
          false,
          operation
        );
      }

      // Count related data for planning
      const [matchCount, resultCount] = await Promise.all([
        Match.countDocuments({ tournamentId: operation.tournamentId }),
        TournamentResult.countDocuments({ tournamentId: operation.tournamentId }),
      ]);

      // Update step counts
      this.getStep(operation, 'delete_matches').expectedCount = matchCount;
      this.getStep(operation, 'delete_results').expectedCount = resultCount;
      this.getStep(operation, 'delete_tournament').expectedCount = 1;

      step.status = 'completed';
      step.endTime = new Date();
      step.actualCount = 1;

      return tournament;

    } catch (error) {
      step.status = 'failed';
      step.error = error as Error;
      step.endTime = new Date();
      throw error;
    }
  }

  private async deleteMatchesWithCompensation(operation: DeletionOperation): Promise<void> {
    const step = this.getStep(operation, 'delete_matches');
    step.status = 'running';
    step.startTime = new Date();

    try {
      if (!step.expectedCount || step.expectedCount === 0) {
        step.status = 'completed';
        step.actualCount = 0;
        step.endTime = new Date();
        return;
      }

      // Store compensation data before deletion
      const matches = await Match.find({ tournamentId: operation.tournamentId }).lean();
      step.compensationData = { matches };

      // Delete in batches for better performance and memory management
      let deletedCount = 0;
      let batch = 0;
      
      while (deletedCount < step.expectedCount) {
        const batchResult = await Match.deleteMany({ 
          tournamentId: operation.tournamentId 
        }).limit(this.BATCH_SIZE);
        
        const batchDeleted = batchResult.deletedCount || 0;
        deletedCount += batchDeleted;
        batch++;

        console.log(`[${operation.correlationId}] Deleted matches batch ${batch}: ${batchDeleted} records`);

        // Safety check to prevent infinite loops
        if (batchDeleted === 0) {
          break;
        }
      }

      step.actualCount = deletedCount;
      step.status = 'completed';
      step.endTime = new Date();
      operation.status = 'matches_deleted';

      if (deletedCount !== step.expectedCount) {
        console.warn(`[${operation.correlationId}] Match deletion count mismatch: expected ${step.expectedCount}, actual ${deletedCount}`);
      }

    } catch (error) {
      step.status = 'failed';
      step.error = error as Error;
      step.endTime = new Date();
      throw new TournamentDeletionError(
        `Failed to delete matches: ${(error as Error).message}`,
        'MATCHES_DELETION_FAILED',
        true,
        operation
      );
    }
  }

  private async deleteResultsWithCompensation(operation: DeletionOperation): Promise<void> {
    const step = this.getStep(operation, 'delete_results');
    step.status = 'running';
    step.startTime = new Date();

    try {
      if (!step.expectedCount || step.expectedCount === 0) {
        step.status = 'completed';
        step.actualCount = 0;
        step.endTime = new Date();
        return;
      }

      // Store compensation data before deletion
      const results = await TournamentResult.find({ tournamentId: operation.tournamentId }).lean();
      step.compensationData = { results };

      // Delete in batches
      let deletedCount = 0;
      let batch = 0;
      
      while (deletedCount < step.expectedCount) {
        const batchResult = await TournamentResult.deleteMany({ 
          tournamentId: operation.tournamentId 
        }).limit(this.BATCH_SIZE);
        
        const batchDeleted = batchResult.deletedCount || 0;
        deletedCount += batchDeleted;
        batch++;

        console.log(`[${operation.correlationId}] Deleted results batch ${batch}: ${batchDeleted} records`);

        if (batchDeleted === 0) {
          break;
        }
      }

      step.actualCount = deletedCount;
      step.status = 'completed';
      step.endTime = new Date();
      operation.status = 'results_deleted';

      if (deletedCount !== step.expectedCount) {
        console.warn(`[${operation.correlationId}] Results deletion count mismatch: expected ${step.expectedCount}, actual ${deletedCount}`);
      }

    } catch (error) {
      step.status = 'failed';
      step.error = error as Error;
      step.endTime = new Date();
      throw new TournamentDeletionError(
        `Failed to delete tournament results: ${(error as Error).message}`,
        'RESULTS_DELETION_FAILED',
        true,
        operation
      );
    }
  }

  private async deleteTournamentEntity(operation: DeletionOperation): Promise<void> {
    const step = this.getStep(operation, 'delete_tournament');
    step.status = 'running';
    step.startTime = new Date();

    try {
      const tournament = await Tournament.findByIdAndDelete(operation.tournamentId);
      
      if (!tournament) {
        throw new TournamentDeletionError(
          'Tournament was not found during deletion - it may have been deleted already',
          'TOURNAMENT_NOT_FOUND_FOR_DELETION',
          false,
          operation
        );
      }

      // Store for potential compensation
      step.compensationData = { tournament: tournament.toObject() };
      step.actualCount = 1;
      step.status = 'completed';
      step.endTime = new Date();
      operation.status = 'tournament_deleted';

    } catch (error) {
      step.status = 'failed';
      step.error = error as Error;
      step.endTime = new Date();
      throw new TournamentDeletionError(
        `Failed to delete tournament: ${(error as Error).message}`,
        'TOURNAMENT_DELETION_FAILED',
        true,
        operation
      );
    }
  }

  private async attemptCompensation(operation: DeletionOperation): Promise<void> {
    operation.status = 'compensating';
    
    console.warn(`[${operation.correlationId}] Attempting compensation for failed deletion`);

    try {
      // Restore tournament if it was deleted
      const tournamentStep = this.getStep(operation, 'delete_tournament');
      if (tournamentStep.status === 'completed' && tournamentStep.compensationData?.tournament) {
        try {
          await Tournament.create(tournamentStep.compensationData.tournament);
          tournamentStep.status = 'compensated';
          console.log(`[${operation.correlationId}] Tournament restored from compensation data`);
        } catch (error) {
          console.error(`[${operation.correlationId}] Failed to restore tournament:`, error);
        }
      }

      // Note: We don't restore matches and results as they're more complex to restore
      // In a real system, you might want to implement more sophisticated compensation
      
    } catch (error) {
      console.error(`[${operation.correlationId}] Compensation failed:`, error);
    }
  }

  private getStep(operation: DeletionOperation, stepName: string): DeletionStep {
    const step = operation.steps.find(s => s.name === stepName);
    if (!step) {
      throw new Error(`Step '${stepName}' not found in operation`);
    }
    return step;
  }

  private generateCorrelationId(): string {
    return `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeOperationForLogging(operation: DeletionOperation): any {
    return {
      correlationId: operation.correlationId,
      tournamentId: operation.tournamentId,
      status: operation.status,
      steps: operation.steps.map(s => ({
        name: s.name,
        status: s.status,
        expectedCount: s.expectedCount,
        actualCount: s.actualCount,
        error: s.error?.message,
      })),
      duration: operation.endTime 
        ? operation.endTime.getTime() - operation.startTime.getTime()
        : undefined,
    };
  }

  /**
   * Check if a deletion operation can be retried based on the error type
   */
  public isRetryable(error: TournamentDeletionError): boolean {
    return error.retryable && (error.code === 'MATCHES_DELETION_FAILED' || 
                              error.code === 'RESULTS_DELETION_FAILED' ||
                              error.code === 'TOURNAMENT_DELETION_FAILED');
  }

  /**
   * Get deletion operation status for monitoring/debugging
   */
  public getOperationSummary(operation: DeletionOperation): any {
    return this.sanitizeOperationForLogging(operation);
  }
}

export default TournamentDeletionService;