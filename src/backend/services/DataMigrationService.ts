import fs from 'fs/promises';
import path from 'path';

interface ParsedFileName {
  date: Date;
  format: string;
  bodNumber: number | null;
}

interface RoundRobinScores {
  round1: number | null;
  round2: number | null;
  round3: number | null;
  rrWon: number | null;
  rrLost: number | null;
  rrPlayed: number | null;
  rrWinPercentage?: number | null;
  rrRank?: number | null;
}

interface BracketScores {
  r16Won: number | null;
  r16Lost: number | null;
  qfWon: number | null;
  qfLost: number | null;
  sfWon: number | null;
  sfLost: number | null;
  finalsWon: number | null;
  finalsLost: number | null;
  bracketWon: number | null;
  bracketLost: number | null;
  bracketPlayed: number | null;
}

interface TotalStats {
  totalWon: number | null;
  totalLost: number | null;
  totalPlayed: number | null;
  winPercentage: number | null;
  finalRank: number | null;
  bodFinish: number | null;
}

interface TournamentResultData {
  tournamentId: string;
  playerNames: string[];
  division?: string | null;
  seed?: number | null;
  roundRobinScores: RoundRobinScores;
  bracketScores: BracketScores;
  totalStats: TotalStats;
}

interface TournamentData {
  date: Date;
  bodNumber: number;
  format: string;
  location: string;
  advancementCriteria?: string;
  notes?: string;
  champions?: string;
}

interface ChampionRecord {
  Date: string;
  'BOD#': number;
  Format: string;
  Location?: string;
  Champions?: string;
  'Advancement Criteria'?: string;
  Notes?: string;
}

export class DataMigrationService {
  private jsonDir: string;

  constructor(jsonDir: string) {
    this.jsonDir = jsonDir;
  }

  /**
   * Parse tournament filename to extract date and format
   */
  parseFileName(filename: string): ParsedFileName | null {
    // Match pattern: YYYY-MM-DD Format.json
    const match = filename.match(/^(\d{4}-\d{2}-\d{2})\s+(.+)\.json$/);
    if (!match) {
      return null;
    }

    const [, dateStr, format] = match;
    return {
      date: new Date(dateStr),
      format: format,
      bodNumber: null
    };
  }

  /**
   * List all tournament JSON files (excluding summary files)
   */
  async listTournamentFiles(): Promise<string[]> {
    const files = await fs.readdir(this.jsonDir);
    return files.filter(f => /^\d{4}-\d{2}-\d{2}/.test(f) && f.endsWith('.json'));
  }

  /**
   * Extract player names from a tournament record
   */
  extractPlayersFromRecord(record: Record<string, any>): string[] {
    const players = new Set<string>();

    // Direct player fields
    if (record['Player 1'] && typeof record['Player 1'] === 'string') {
      players.add(record['Player 1'].trim());
    }
    if (record['Player 2'] && typeof record['Player 2'] === 'string') {
      players.add(record['Player 2'].trim());
    }

    // Parse team strings (format: "Name1 & Name2")
    const teamFields = ['Teams (Round Robin)', 'Teams (Summary)', 'Teams (Bracket)', 'Team'];
    for (const field of teamFields) {
      const teamStr = record[field];
      if (teamStr && typeof teamStr === 'string') {
        const names = teamStr.split('&').map(n => n.trim()).filter(n => n.length > 0);
        names.forEach(n => players.add(n));
      }
    }

    return Array.from(players).filter(p => p.length > 0);
  }

  /**
   * Extract all unique players from all tournament files
   */
  async extractAllPlayers(): Promise<Set<string>> {
    const allPlayers = new Set<string>();
    const files = await this.listTournamentFiles();

    for (const file of files) {
      const filePath = path.join(this.jsonDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const records = JSON.parse(content);

      if (Array.isArray(records)) {
        for (const record of records) {
          const players = this.extractPlayersFromRecord(record);
          players.forEach(p => allPlayers.add(p));
        }
      }
    }

    return allPlayers;
  }

  /**
   * Map a JSON record to TournamentResult schema
   */
  mapRecordToTournamentResult(record: Record<string, any>, tournamentId: string): TournamentResultData {
    const playerNames = this.extractPlayersFromRecord(record);

    const roundRobinScores: RoundRobinScores = {
      round1: this.getNumericValue(record, 'Round-1'),
      round2: this.getNumericValue(record, 'Round-2'),
      round3: this.getNumericValue(record, 'Round-3'),
      rrWon: this.getNumericValue(record, 'RR Won'),
      rrLost: this.getNumericValue(record, 'RR Lost'),
      rrPlayed: this.getNumericValue(record, 'RR Played'),
      rrWinPercentage: this.getNumericValue(record, 'RR Win%') || this.getNumericValue(record, 'RR Win %'),
      rrRank: this.getNumericValue(record, 'RR Rank')
    };

    const bracketScores: BracketScores = {
      r16Won: this.getNumericValue(record, 'R16 Won'),
      r16Lost: this.getNumericValue(record, 'R16 Lost'),
      qfWon: this.getNumericValue(record, 'QF Won'),
      qfLost: this.getNumericValue(record, 'QF Lost'),
      sfWon: this.getNumericValue(record, 'SF Won'),
      sfLost: this.getNumericValue(record, 'SF Lost'),
      finalsWon: this.getNumericValue(record, 'Finals Won'),
      finalsLost: this.getNumericValue(record, 'Finals Lost'),
      bracketWon: this.getNumericValue(record, 'Bracket Won'),
      bracketLost: this.getNumericValue(record, 'Bracket Lost'),
      bracketPlayed: this.getNumericValue(record, 'Bracket Played')
    };

    const totalStats: TotalStats = {
      totalWon: this.getNumericValue(record, 'Total Won'),
      totalLost: this.getNumericValue(record, 'Total Lost'),
      totalPlayed: this.getNumericValue(record, 'Total Played'),
      winPercentage: this.getNumericValue(record, 'Win%') || this.getNumericValue(record, 'Win %'),
      finalRank: this.getNumericValue(record, 'Final Rank'),
      bodFinish: this.getNumericValue(record, 'BOD Finish')
    };

    return {
      tournamentId,
      playerNames,
      division: record['Division'] || record['Division.1'] || null,
      seed: this.getNumericValue(record, 'Seed') || this.getNumericValue(record, 'Div Seed'),
      roundRobinScores,
      bracketScores,
      totalStats
    };
  }

  /**
   * Load Champions.json data
   */
  async loadChampionsData(): Promise<ChampionRecord[]> {
    const filePath = path.join(this.jsonDir, 'Champions.json');
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Map champion record to Tournament schema
   */
  mapChampionToTournament(record: ChampionRecord): TournamentData {
    // Parse date string (format: "2009-10-18 00:00:00")
    const dateStr = record.Date.split(' ')[0];
    
    return {
      date: new Date(dateStr),
      bodNumber: record['BOD#'],
      format: record.Format,
      location: record.Location || '',
      advancementCriteria: record['Advancement Criteria'],
      notes: record.Notes,
      champions: record.Champions
    };
  }

  /**
   * Load All Players.json data
   */
  async loadAllPlayersData(): Promise<any[]> {
    const filePath = path.join(this.jsonDir, 'All Players.json');
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Helper to safely get numeric values
   */
  private getNumericValue(record: Record<string, any>, key: string): number | null {
    const value = record[key];
    if (value === null || value === undefined || value === '') {
      return null;
    }
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }
}

export default DataMigrationService;
