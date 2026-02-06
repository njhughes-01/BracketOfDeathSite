import { Request, Response } from "express";
import { BaseController } from "./base";
import { DataMigrationService } from "../services/DataMigrationService";
import path from "path";
import Player from "../models/Player";
import Tournament from "../models/Tournament";
import TournamentResult from "../models/TournamentResult";
import mongoose from "mongoose";

// Migration status tracking
interface MigrationStatus {
  status: 'idle' | 'running' | 'completed' | 'failed';
  currentStep: string;
  progress: {
    players: { total: number; migrated: number; errors: number };
    tournaments: { total: number; migrated: number; errors: number };
    results: { total: number; migrated: number; errors: number };
  };
  startedAt?: Date;
  completedAt?: Date;
  errors: string[];
}

class DataMigrationController extends BaseController {
  private migrationService: DataMigrationService;
  private migrationStatus: MigrationStatus;

  constructor() {
    super();
    const jsonDir = path.join(__dirname, '../../../json');
    this.migrationService = new DataMigrationService(jsonDir);
    this.migrationStatus = this.getInitialStatus();
  }

  private getInitialStatus(): MigrationStatus {
    return {
      status: 'idle',
      currentStep: '',
      progress: {
        players: { total: 0, migrated: 0, errors: 0 },
        tournaments: { total: 0, migrated: 0, errors: 0 },
        results: { total: 0, migrated: 0, errors: 0 }
      },
      errors: []
    };
  }

  /**
   * Normalize legacy format strings to valid enum values
   */
  private normalizeFormat(format: string): string {
    const formatMap: Record<string, string> = {
      "Men's Singles": "M",
      "Men's Doubles": "M",
      "Women's Singles": "W",
      "Women's Doubles": "W",
      "Mixed Doubles": "Mixed",
      "Men": "M",
      "Women": "W",
      "M": "M",
      "W": "W",
      "Mixed": "Mixed"
    };
    return formatMap[format] || "Mixed";
  }

  // Migrate all data from JSON files
  migrateAll = this.asyncHandler(
    async (_req: Request, res: Response): Promise<void> => {
      if (this.migrationStatus.status === 'running') {
        this.sendError(res, "Migration already in progress", 409);
        return;
      }

      this.migrationStatus = this.getInitialStatus();
      this.migrationStatus.status = 'running';
      this.migrationStatus.startedAt = new Date();

      try {
        // Step 1: Migrate players
        this.migrationStatus.currentStep = 'Migrating players';
        await this.doMigratePlayers();

        // Step 2: Migrate tournaments
        this.migrationStatus.currentStep = 'Migrating tournaments';
        await this.doMigrateTournaments();

        // Step 3: Migrate results
        this.migrationStatus.currentStep = 'Migrating results';
        await this.doMigrateResults();

        this.migrationStatus.status = 'completed';
        this.migrationStatus.completedAt = new Date();
        this.migrationStatus.currentStep = 'Complete';

        this.sendSuccess(res, this.migrationStatus, "Migration completed successfully");
      } catch (error: any) {
        this.migrationStatus.status = 'failed';
        this.migrationStatus.errors.push(error.message);
        this.sendError(res, `Migration failed: ${error.message}`, 500);
      }
    },
  );

  // Migrate players from JSON
  migratePlayers = this.asyncHandler(
    async (_req: Request, res: Response): Promise<void> => {
      try {
        const result = await this.doMigratePlayers();
        this.sendSuccess(res, result, "Player migration completed");
      } catch (error: any) {
        this.sendError(res, `Player migration failed: ${error.message}`, 500);
      }
    },
  );

  private async doMigratePlayers(): Promise<{ total: number; migrated: number; errors: number }> {
    // Load from All Players.json
    const allPlayersData = await this.migrationService.loadAllPlayersData();
    this.migrationStatus.progress.players.total = allPlayersData.length;

    let migrated = 0;
    let errors = 0;

    for (const playerData of allPlayersData) {
      try {
        const playerName = playerData.name || '';
        
        // Check if player already exists by name
        const existingPlayer = await Player.findOne({ name: playerName });

        const stats = {
          gamesPlayed: playerData['Games Played'] || 0,
          gamesWon: playerData['Games Won'] || 0,
          winningPercentage: playerData['Winning %'] || 0,
          bodsPlayed: playerData["BOD's Played"] || 0,
          bestResult: playerData['Best Result'] || 0,
          avgFinish: playerData['AVG Finish'] || 0,
          individualChampionships: playerData['Ind Champs'] || playerData.individualChampionships || 0,
          divisionChampionships: playerData['Div Champs'] || playerData.divisionChampionships || 0,
          totalChampionships: playerData['Champs'] || playerData.totalChampionships || 0
        };

        if (existingPlayer) {
          // Update with legacy stats
          existingPlayer.gamesPlayed = stats.gamesPlayed;
          existingPlayer.gamesWon = stats.gamesWon;
          existingPlayer.winningPercentage = stats.winningPercentage;
          existingPlayer.bodsPlayed = stats.bodsPlayed;
          existingPlayer.bestResult = stats.bestResult;
          existingPlayer.avgFinish = stats.avgFinish;
          existingPlayer.individualChampionships = stats.individualChampionships;
          existingPlayer.divisionChampionships = stats.divisionChampionships;
          existingPlayer.totalChampionships = stats.totalChampionships;
          await existingPlayer.save();
        } else {
          // Create new player
          await Player.create({
            name: playerName,
            email: playerData.email || undefined,
            ...stats
          });
        }
        migrated++;
        this.migrationStatus.progress.players.migrated = migrated;
      } catch (error: any) {
        errors++;
        this.migrationStatus.progress.players.errors = errors;
        this.migrationStatus.errors.push(`Player ${playerData.name}: ${error.message}`);
      }
    }

    return { total: allPlayersData.length, migrated, errors };
  }

  // Migrate tournaments from JSON
  migrateTournaments = this.asyncHandler(
    async (_req: Request, res: Response): Promise<void> => {
      try {
        const result = await this.doMigrateTournaments();
        this.sendSuccess(res, result, "Tournament migration completed");
      } catch (error: any) {
        this.sendError(res, `Tournament migration failed: ${error.message}`, 500);
      }
    },
  );

  private async doMigrateTournaments(): Promise<{ total: number; migrated: number; errors: number }> {
    const championsData = await this.migrationService.loadChampionsData();
    this.migrationStatus.progress.tournaments.total = championsData.length;

    let migrated = 0;
    let errors = 0;

    for (const championRecord of championsData) {
      try {
        const tournamentData = this.migrationService.mapChampionToTournament(championRecord);
        
        // Check if tournament already exists
        const existing = await Tournament.findOne({ bodNumber: tournamentData.bodNumber });
        
        if (existing) {
          // Update with legacy data
          if (tournamentData.advancementCriteria) {
            existing.advancementCriteria = tournamentData.advancementCriteria;
          }
          if (tournamentData.notes) {
            existing.notes = tournamentData.notes;
          }
          await existing.save();
        } else {
          // Create tournament - need to match required fields
          await Tournament.create({
            name: `BOD #${tournamentData.bodNumber}`,
            date: tournamentData.date,
            bodNumber: tournamentData.bodNumber,
            format: this.normalizeFormat(tournamentData.format),
            location: tournamentData.location || 'TBD',
            status: 'completed',
            advancementCriteria: tournamentData.advancementCriteria || 'Round robin followed by single elimination bracket',
            notes: tournamentData.notes || '',
            registrationType: 'invitational'
          });
        }
        migrated++;
        this.migrationStatus.progress.tournaments.migrated = migrated;
      } catch (error: any) {
        errors++;
        this.migrationStatus.progress.tournaments.errors = errors;
        this.migrationStatus.errors.push(`Tournament BOD#${championRecord['BOD#']}: ${error.message}`);
      }
    }

    return { total: championsData.length, migrated, errors };
  }

  // Migrate results from JSON
  migrateResults = this.asyncHandler(
    async (_req: Request, res: Response): Promise<void> => {
      try {
        const result = await this.doMigrateResults();
        this.sendSuccess(res, result, "Results migration completed");
      } catch (error: any) {
        this.sendError(res, `Results migration failed: ${error.message}`, 500);
      }
    },
  );

  private async doMigrateResults(): Promise<{ total: number; migrated: number; errors: number }> {
    const tournamentFiles = await this.migrationService.listTournamentFiles();
    let totalRecords = 0;
    let migrated = 0;
    let errors = 0;

    for (const file of tournamentFiles) {
      const parsed = this.migrationService.parseFileName(file);
      if (!parsed) continue;

      // Find matching tournament by date
      const tournament = await Tournament.findOne({
        date: {
          $gte: new Date(parsed.date.setHours(0, 0, 0, 0)),
          $lt: new Date(parsed.date.setHours(23, 59, 59, 999))
        }
      });

      if (!tournament) {
        this.migrationStatus.errors.push(`No tournament found for file: ${file}`);
        continue;
      }

      const filePath = path.join(__dirname, '../../../json', file);
      const fs = await import('fs/promises');
      const content = await fs.readFile(filePath, 'utf-8');
      const records = JSON.parse(content);

      if (!Array.isArray(records)) continue;

      totalRecords += records.length;
      this.migrationStatus.progress.results.total = totalRecords;

      for (const record of records) {
        try {
          const resultData = this.migrationService.mapRecordToTournamentResult(
            record, 
            tournament._id.toString()
          );

          // Resolve player IDs from names
          const playerIds: mongoose.Types.ObjectId[] = [];
          for (const playerName of resultData.playerNames) {
            const player = await Player.findOne({ name: playerName });
            if (player) {
              playerIds.push(player._id);
            }
          }

          // Create or update result - use players array for matching
          const existingResult = await TournamentResult.findOne({
            tournamentId: tournament._id,
            players: { $all: playerIds, $size: playerIds.length }
          });

          if (existingResult) {
            // Update existing
            existingResult.division = resultData.division;
            existingResult.seed = resultData.seed;
            existingResult.roundRobinScores = resultData.roundRobinScores;
            existingResult.bracketScores = resultData.bracketScores;
            existingResult.totalStats = resultData.totalStats;
            await existingResult.save();
          } else {
            // Create new
            await TournamentResult.create({
              tournamentId: tournament._id,
              players: playerIds,
              division: resultData.division,
              seed: resultData.seed,
              roundRobinScores: resultData.roundRobinScores,
              bracketScores: resultData.bracketScores,
              totalStats: resultData.totalStats
            });
          }

          migrated++;
          this.migrationStatus.progress.results.migrated = migrated;
        } catch (error: any) {
          errors++;
          this.migrationStatus.progress.results.errors = errors;
          this.migrationStatus.errors.push(`Result in ${file}: ${error.message}`);
        }
      }
    }

    return { total: totalRecords, migrated, errors };
  }

  // Get migration status
  getMigrationStatus = this.asyncHandler(
    async (_req: Request, res: Response): Promise<void> => {
      this.sendSuccess(res, this.migrationStatus, "Migration status retrieved");
    },
  );

  // Preview migration data
  previewMigration = this.asyncHandler(
    async (_req: Request, res: Response): Promise<void> => {
      try {
        const tournamentFiles = await this.migrationService.listTournamentFiles();
        const championsData = await this.migrationService.loadChampionsData();
        const playersData = await this.migrationService.loadAllPlayersData();
        const uniquePlayers = await this.migrationService.extractAllPlayers();

        this.sendSuccess(res, {
          tournamentFiles: tournamentFiles.length,
          championsRecords: championsData.length,
          playersInRoster: playersData.length,
          uniquePlayersInTournaments: uniquePlayers.size,
          sampleFiles: tournamentFiles.slice(0, 5),
          samplePlayers: Array.from(uniquePlayers).slice(0, 10)
        }, "Migration preview generated");
      } catch (error: any) {
        this.sendError(res, `Preview failed: ${error.message}`, 500);
      }
    },
  );

  // Create backup
  createBackup = this.asyncHandler(
    async (_req: Request, res: Response): Promise<void> => {
      try {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        
        const backupDir = path.join(__dirname, '../../../data/backups');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(backupDir, `backup-${timestamp}`);

        // Create backup directory
        const fs = await import('fs/promises');
        await fs.mkdir(backupDir, { recursive: true });

        // Get MongoDB URI from environment
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bracketofdeath';
        
        await execAsync(`mongodump --uri="${mongoUri}" --out="${backupPath}"`);

        this.sendSuccess(res, { backupPath, timestamp }, "Backup created successfully");
      } catch (error: any) {
        this.sendError(res, `Backup failed: ${error.message}`, 500);
      }
    },
  );

  // Restore backup
  restoreBackup = this.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { backupPath } = req.body;
      
      if (!backupPath) {
        this.sendError(res, "backupPath is required", 400);
        return;
      }

      try {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);

        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bracketofdeath';
        
        await execAsync(`mongorestore --uri="${mongoUri}" --drop "${backupPath}"`);

        this.sendSuccess(res, null, "Backup restored successfully");
      } catch (error: any) {
        this.sendError(res, `Restore failed: ${error.message}`, 500);
      }
    },
  );

  // Validate data
  validateData = this.asyncHandler(
    async (_req: Request, res: Response): Promise<void> => {
      try {
        const validation = {
          players: {
            total: await Player.countDocuments(),
            withLegacyData: await Player.countDocuments({ legacyName: { $exists: true } }),
            withoutEmail: await Player.countDocuments({ email: { $exists: false } })
          },
          tournaments: {
            total: await Tournament.countDocuments(),
            completed: await Tournament.countDocuments({ status: 'completed' }),
            withLegacyData: await Tournament.countDocuments({ legacyData: { $exists: true } })
          },
          results: {
            total: await TournamentResult.countDocuments(),
            withPlayers: await TournamentResult.countDocuments({ 'players.0': { $exists: true } }),
            orphaned: await TournamentResult.countDocuments({ players: { $size: 0 } })
          }
        };

        this.sendSuccess(res, validation, "Data validation completed");
      } catch (error: any) {
        this.sendError(res, `Validation failed: ${error.message}`, 500);
      }
    },
  );
}

export default new DataMigrationController();
