import { DataMigrationService } from '../DataMigrationService';
import path from 'path';

describe('DataMigrationService', () => {
  let service: DataMigrationService;
  const jsonDir = path.join(__dirname, '../../../../json');

  beforeEach(() => {
    service = new DataMigrationService(jsonDir);
  });

  describe('parseFileName', () => {
    it('should parse tournament filename into date and format', () => {
      const result = service.parseFileName('2009-10-18 Men.json');
      expect(result).toEqual({
        date: new Date('2009-10-18'),
        format: 'Men',
        bodNumber: null
      });
    });

    it('should handle Mixed format', () => {
      const result = service.parseFileName('2016-10-16 Mixed.json');
      expect(result).toEqual({
        date: new Date('2016-10-16'),
        format: 'Mixed',
        bodNumber: null
      });
    });

    it('should handle Women format', () => {
      const result = service.parseFileName('2014-10-11 Women.json');
      expect(result).toEqual({
        date: new Date('2014-10-11'),
        format: 'Women',
        bodNumber: null
      });
    });

    it('should handle abbreviated formats (M, W)', () => {
      expect(service.parseFileName('2025-07-12 M.json')).toEqual({
        date: new Date('2025-07-12'),
        format: 'M',
        bodNumber: null
      });
    });

    it('should return null for non-tournament files', () => {
      expect(service.parseFileName('All Players.json')).toBeNull();
      expect(service.parseFileName('Champions.json')).toBeNull();
    });
  });

  describe('listTournamentFiles', () => {
    it('should list only tournament JSON files', async () => {
      const files = await service.listTournamentFiles();
      expect(files.length).toBeGreaterThan(0);
      expect(files.every(f => /^\d{4}-\d{2}-\d{2}/.test(f))).toBe(true);
      expect(files).not.toContain('All Players.json');
      expect(files).not.toContain('Champions.json');
    });
  });

  describe('extractPlayersFromRecord', () => {
    it('should extract player names from tournament record', () => {
      const record = {
        'Player 1': 'John Smith',
        'Player 2': 'Jane Doe',
        'Teams (Round Robin)': 'John Smith & Jane Doe'
      };
      const players = service.extractPlayersFromRecord(record);
      expect(players).toContain('John Smith');
      expect(players).toContain('Jane Doe');
    });

    it('should handle records with only team string', () => {
      const record = {
        'Teams (Round Robin)': 'Bob Jones & Alice Brown'
      };
      const players = service.extractPlayersFromRecord(record);
      expect(players).toContain('Bob Jones');
      expect(players).toContain('Alice Brown');
    });

    it('should deduplicate player names', () => {
      const record = {
        'Player 1': 'John Smith',
        'Player 2': 'Jane Doe',
        'Teams (Round Robin)': 'John Smith & Jane Doe',
        'Teams (Summary)': 'John Smith & Jane Doe'
      };
      const players = service.extractPlayersFromRecord(record);
      expect(players.filter(p => p === 'John Smith').length).toBe(1);
    });

    it('should handle null/empty values', () => {
      const record = {
        'Player 1': null,
        'Player 2': '',
        'Teams (Round Robin)': 'Solo Player'
      };
      const players = service.extractPlayersFromRecord(record);
      expect(players).toEqual(['Solo Player']);
    });
  });

  describe('extractAllPlayers', () => {
    it('should extract unique players from all tournament files', async () => {
      const players = await service.extractAllPlayers();
      expect(players.size).toBeGreaterThan(0);
      // Should be unique names
      expect(Array.from(players).every(p => typeof p === 'string' && p.length > 0)).toBe(true);
    });
  });

  describe('mapRecordToTournamentResult', () => {
    it('should map JSON record to TournamentResult schema', () => {
      const record = {
        'Player 1': 'John Smith',
        'Player 2': 'Jane Doe',
        'Round-1': 10,
        'Round-2': 8,
        'Round-3': 12,
        'RR Won': 30,
        'RR Lost': 20,
        'RR Played': 50,
        'QF Won': 11,
        'QF Lost': 5,
        'SF Won': 11,
        'SF Lost': 7,
        'Finals Won': 11,
        'Finals Lost': 9,
        'Bracket Won': 33,
        'Bracket Lost': 21,
        'Total Won': 63,
        'Total Lost': 41,
        'BOD Finish': 1
      };

      const result = service.mapRecordToTournamentResult(record, 'tournament123');
      
      expect(result.tournamentId).toBe('tournament123');
      expect(result.playerNames).toEqual(['John Smith', 'Jane Doe']);
      expect(result.roundRobinScores).toEqual({
        round1: 10,
        round2: 8,
        round3: 12,
        rrWon: 30,
        rrLost: 20,
        rrPlayed: 50,
        rrWinPercentage: null,
        rrRank: null
      });
      expect(result.bracketScores.qfWon).toBe(11);
      expect(result.bracketScores.finalsWon).toBe(11);
      expect(result.totalStats.totalWon).toBe(63);
      expect(result.totalStats.bodFinish).toBe(1);
    });

    it('should handle null bracket scores', () => {
      const record = {
        'Player 1': 'Solo',
        'QF Won': null,
        'QF Lost': null,
        'SF Won': null,
        'SF Lost': null
      };

      const result = service.mapRecordToTournamentResult(record, 'tournament123');
      expect(result.bracketScores.qfWon).toBeNull();
      expect(result.bracketScores.sfWon).toBeNull();
    });
  });

  describe('loadChampionsData', () => {
    it('should load and parse Champions.json', async () => {
      const champions = await service.loadChampionsData();
      expect(champions.length).toBeGreaterThan(0);
      expect(champions[0]).toHaveProperty('Date');
      expect(champions[0]).toHaveProperty('BOD#');
      expect(champions[0]).toHaveProperty('Format');
    });
  });

  describe('mapChampionToTournament', () => {
    it('should map champion record to Tournament schema', () => {
      const record = {
        'Date': '2009-10-18 00:00:00',
        'BOD#': 3,
        'Format': "Men's Doubles",
        'Location': 'PTC',
        'Champions': 'John & Jane',
        'Advancement Criteria': 'round robin + bracket'
      };

      const tournament = service.mapChampionToTournament(record);
      
      expect(tournament.date).toEqual(new Date('2009-10-18'));
      expect(tournament.bodNumber).toBe(3);
      expect(tournament.format).toBe("Men's Doubles");
      expect(tournament.location).toBe('PTC');
    });
  });
});
