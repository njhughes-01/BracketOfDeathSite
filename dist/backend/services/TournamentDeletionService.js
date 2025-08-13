"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TournamentDeletionService = exports.TournamentDeletionError = void 0;
const mongoose_1 = require("mongoose");
const Tournament_1 = require("../models/Tournament");
const Match_1 = require("../models/Match");
const TournamentResult_1 = require("../models/TournamentResult");
class TournamentDeletionError extends Error {
    code;
    retryable;
    operation;
    constructor(message, code, retryable = false, operation) {
        super(message);
        this.code = code;
        this.retryable = retryable;
        this.operation = operation;
        this.name = 'TournamentDeletionError';
    }
}
exports.TournamentDeletionError = TournamentDeletionError;
class TournamentDeletionService {
    BATCH_SIZE = 100;
    MAX_RETRY_ATTEMPTS = 3;
    async deleteTournament(tournamentId, adminUserId, correlationId) {
        const operation = {
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
            const tournament = await this.validateAndPrepareDeletion(operation);
            await this.deleteMatchesWithCompensation(operation);
            await this.deleteResultsWithCompensation(operation);
            await this.deleteTournamentEntity(operation);
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
        }
        catch (error) {
            operation.status = 'failed';
            operation.error = error;
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
            if (['matches_deleted', 'results_deleted'].includes(operation.status)) {
                await this.attemptCompensation(operation);
            }
            throw error;
        }
    }
    async validateAndPrepareDeletion(operation) {
        const step = this.getStep(operation, 'validate_tournament');
        step.status = 'running';
        step.startTime = new Date();
        try {
            if (!mongoose_1.Types.ObjectId.isValid(operation.tournamentId)) {
                throw new TournamentDeletionError('Invalid tournament ID format', 'INVALID_ID', false, operation);
            }
            const tournament = await Tournament_1.Tournament.findById(operation.tournamentId);
            if (!tournament) {
                throw new TournamentDeletionError('Tournament not found', 'NOT_FOUND', false, operation);
            }
            if (!['scheduled', 'completed'].includes(tournament.status)) {
                throw new TournamentDeletionError(`Cannot delete tournament with status '${tournament.status}'. Only scheduled or completed tournaments can be deleted.`, 'INVALID_STATUS', false, operation);
            }
            const [matchCount, resultCount] = await Promise.all([
                Match_1.Match.countDocuments({ tournamentId: operation.tournamentId }),
                TournamentResult_1.TournamentResult.countDocuments({ tournamentId: operation.tournamentId }),
            ]);
            this.getStep(operation, 'delete_matches').expectedCount = matchCount;
            this.getStep(operation, 'delete_results').expectedCount = resultCount;
            this.getStep(operation, 'delete_tournament').expectedCount = 1;
            step.status = 'completed';
            step.endTime = new Date();
            step.actualCount = 1;
            return tournament;
        }
        catch (error) {
            step.status = 'failed';
            step.error = error;
            step.endTime = new Date();
            throw error;
        }
    }
    async deleteMatchesWithCompensation(operation) {
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
            const matches = await Match_1.Match.find({ tournamentId: operation.tournamentId }).lean();
            step.compensationData = { matches };
            let deletedCount = 0;
            let batch = 0;
            while (deletedCount < step.expectedCount) {
                const batchResult = await Match_1.Match.deleteMany({
                    tournamentId: operation.tournamentId
                }).limit(this.BATCH_SIZE);
                const batchDeleted = batchResult.deletedCount || 0;
                deletedCount += batchDeleted;
                batch++;
                console.log(`[${operation.correlationId}] Deleted matches batch ${batch}: ${batchDeleted} records`);
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
        }
        catch (error) {
            step.status = 'failed';
            step.error = error;
            step.endTime = new Date();
            throw new TournamentDeletionError(`Failed to delete matches: ${error.message}`, 'MATCHES_DELETION_FAILED', true, operation);
        }
    }
    async deleteResultsWithCompensation(operation) {
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
            const results = await TournamentResult_1.TournamentResult.find({ tournamentId: operation.tournamentId }).lean();
            step.compensationData = { results };
            let deletedCount = 0;
            let batch = 0;
            while (deletedCount < step.expectedCount) {
                const batchResult = await TournamentResult_1.TournamentResult.deleteMany({
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
        }
        catch (error) {
            step.status = 'failed';
            step.error = error;
            step.endTime = new Date();
            throw new TournamentDeletionError(`Failed to delete tournament results: ${error.message}`, 'RESULTS_DELETION_FAILED', true, operation);
        }
    }
    async deleteTournamentEntity(operation) {
        const step = this.getStep(operation, 'delete_tournament');
        step.status = 'running';
        step.startTime = new Date();
        try {
            const tournament = await Tournament_1.Tournament.findByIdAndDelete(operation.tournamentId);
            if (!tournament) {
                throw new TournamentDeletionError('Tournament was not found during deletion - it may have been deleted already', 'TOURNAMENT_NOT_FOUND_FOR_DELETION', false, operation);
            }
            step.compensationData = { tournament: tournament.toObject() };
            step.actualCount = 1;
            step.status = 'completed';
            step.endTime = new Date();
            operation.status = 'tournament_deleted';
        }
        catch (error) {
            step.status = 'failed';
            step.error = error;
            step.endTime = new Date();
            throw new TournamentDeletionError(`Failed to delete tournament: ${error.message}`, 'TOURNAMENT_DELETION_FAILED', true, operation);
        }
    }
    async attemptCompensation(operation) {
        operation.status = 'compensating';
        console.warn(`[${operation.correlationId}] Attempting compensation for failed deletion`);
        try {
            const tournamentStep = this.getStep(operation, 'delete_tournament');
            if (tournamentStep.status === 'completed' && tournamentStep.compensationData?.tournament) {
                try {
                    await Tournament_1.Tournament.create(tournamentStep.compensationData.tournament);
                    tournamentStep.status = 'compensated';
                    console.log(`[${operation.correlationId}] Tournament restored from compensation data`);
                }
                catch (error) {
                    console.error(`[${operation.correlationId}] Failed to restore tournament:`, error);
                }
            }
        }
        catch (error) {
            console.error(`[${operation.correlationId}] Compensation failed:`, error);
        }
    }
    getStep(operation, stepName) {
        const step = operation.steps.find(s => s.name === stepName);
        if (!step) {
            throw new Error(`Step '${stepName}' not found in operation`);
        }
        return step;
    }
    generateCorrelationId() {
        return `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    sanitizeOperationForLogging(operation) {
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
    isRetryable(error) {
        return error.retryable && (error.code === 'MATCHES_DELETION_FAILED' ||
            error.code === 'RESULTS_DELETION_FAILED' ||
            error.code === 'TOURNAMENT_DELETION_FAILED');
    }
    getOperationSummary(operation) {
        return this.sanitizeOperationForLogging(operation);
    }
}
exports.TournamentDeletionService = TournamentDeletionService;
exports.default = TournamentDeletionService;
//# sourceMappingURL=TournamentDeletionService.js.map