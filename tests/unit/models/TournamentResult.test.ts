import mongoose, { Types } from 'mongoose';
import { TournamentResult } from '../../../src/backend/models/TournamentResult';
import { Tournament } from '../../../src/backend/models/Tournament';
import { Player } from '../../../src/backend/models/Player';
import { ITournamentResultInput } from '../../../src/backend/types/tournamentResult';

describe('TournamentResult Model', () => {
  let tournamentId: Types.ObjectId;
  let player1Id: Types.ObjectId;
  let player2Id: Types.ObjectId;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await TournamentResult.deleteMany({});
    await Tournament.deleteMany({});
    await Player.deleteMany({});

    // Create test data
    const tournament = await Tournament.create({
      date: new Date('2024-07-20'),
      bodNumber: 202407,
      format: 'Men\'s',
      location: 'Test Club',
      advancementCriteria: 'Standard rules',
    });
    tournamentId = tournament._id;

    const player1 = await Player.create({ name: 'John Doe' });
    player1Id = player1._id;

    const player2 = await Player.create({ name: 'Jane Smith' });
    player2Id = player2._id;
  });

  describe('Validation', () => {
    const validResultData: ITournamentResultInput = {
      tournamentId: '',
      players: [],
      division: '1A',
      seed: 1,
      totalStats: {
        totalWon: 15,
        totalLost: 5,
        totalPlayed: 20,
        winPercentage: 0.75,
        finalRank: 2,
        bodFinish: 2,
        home: true,
      },
    };

    beforeEach(() => {
      validResultData.tournamentId = tournamentId.toString();
      validResultData.players = [player1Id.toString(), player2Id.toString()];
    });

    it('should create a valid tournament result', async () => {
      const result = new TournamentResult(validResultData);
      const savedResult = await result.save();

      expect(savedResult.tournamentId).toEqual(tournamentId);
      expect(savedResult.players).toHaveLength(2);
      expect(savedResult.division).toBe('1A');
      expect(savedResult.seed).toBe(1);
      expect(savedResult.totalStats.totalWon).toBe(15);
      expect(savedResult.totalStats.totalLost).toBe(5);
      expect(savedResult.totalStats.totalPlayed).toBe(20);
      expect(savedResult.totalStats.winPercentage).toBe(0.75);
    });

    it('should require tournamentId and players', async () => {
      const incompleteData = {
        totalStats: {
          totalWon: 10,
          totalLost: 5,
          totalPlayed: 15,
          winPercentage: 0.67,
        },
      };

      const result = new TournamentResult(incompleteData);
      await expect(result.save()).rejects.toThrow('This field is required');
    });

    it('should validate player count (1-2 players)', async () => {
      const noPlayersData = {
        ...validResultData,
        players: [],
      };

      const noPlayersResult = new TournamentResult(noPlayersData);
      await expect(noPlayersResult.save()).rejects.toThrow('A team must have 1 or 2 players');

      const tooManyPlayersData = {
        ...validResultData,
        players: [player1Id, player2Id, new Types.ObjectId()],
      };

      const tooManyPlayersResult = new TournamentResult(tooManyPlayersData);
      await expect(tooManyPlayersResult.save()).rejects.toThrow('A team must have 1 or 2 players');
    });

    it('should validate total stats consistency', async () => {
      const inconsistentData = {
        ...validResultData,
        totalStats: {
          totalWon: 15,
          totalLost: 5,
          totalPlayed: 15, // Should be 20
          winPercentage: 0.75,
        },
      };

      const result = new TournamentResult(inconsistentData);
      await expect(result.save()).rejects.toThrow('Total games played must equal total won plus total lost');
    });

    it('should not allow games won to exceed total played', async () => {
      const invalidData = {
        ...validResultData,
        totalStats: {
          totalWon: 25,
          totalLost: 5,
          totalPlayed: 20,
          winPercentage: 0.75,
        },
      };

      const result = new TournamentResult(invalidData);
      await expect(result.save()).rejects.toThrow('Total games won cannot exceed total games played');
    });

    it('should validate win percentage range', async () => {
      const invalidData = {
        ...validResultData,
        totalStats: {
          totalWon: 15,
          totalLost: 5,
          totalPlayed: 20,
          winPercentage: 1.5, // Invalid
        },
      };

      const result = new TournamentResult(invalidData);
      await expect(result.save()).rejects.toThrow('Percentage must be between 0 and 1');
    });

    it('should validate positive values for ranks and finishes', async () => {
      const invalidRank = new TournamentResult({
        ...validResultData,
        totalStats: {
          ...validResultData.totalStats,
          finalRank: 0, // Invalid
        },
      });

      await expect(invalidRank.save()).rejects.toThrow('Final rank must be positive');

      const invalidFinish = new TournamentResult({
        ...validResultData,
        totalStats: {
          ...validResultData.totalStats,
          bodFinish: -1, // Invalid
        },
      });

      await expect(invalidFinish.save()).rejects.toThrow('BOD finish must be positive');
    });

    it('should enforce unique tournament-players combination', async () => {
      await TournamentResult.create(validResultData);

      const duplicateResult = new TournamentResult(validResultData);
      await expect(duplicateResult.save()).rejects.toThrow();
    });
  });

  describe('Round Robin and Bracket Scores', () => {
    it('should accept round robin scores', async () => {
      const resultData: ITournamentResultInput = {
        tournamentId: tournamentId.toString(),
        players: [player1Id.toString()],
        roundRobinScores: {
          round1: 11,
          round2: 9,
          round3: 12,
          rrWon: 25,
          rrLost: 7,
          rrPlayed: 32,
          rrWinPercentage: 0.78,
          rrRank: 2,
        },
        totalStats: {
          totalWon: 25,
          totalLost: 7,
          totalPlayed: 32,
          winPercentage: 0.78,
        },
      };

      const result = new TournamentResult(resultData);
      const savedResult = await result.save();

      expect(savedResult.roundRobinScores?.round1).toBe(11);
      expect(savedResult.roundRobinScores?.rrWon).toBe(25);
      expect(savedResult.roundRobinScores?.rrWinPercentage).toBe(0.78);
    });

    it('should accept bracket scores', async () => {
      const resultData: ITournamentResultInput = {
        tournamentId: tournamentId.toString(),
        players: [player1Id.toString()],
        bracketScores: {
          r16Won: 11,
          r16Lost: 3,
          qfWon: 11,
          qfLost: 8,
          sfWon: 9,
          sfLost: 11,
          bracketWon: 31,
          bracketLost: 22,
          bracketPlayed: 53,
        },
        totalStats: {
          totalWon: 31,
          totalLost: 22,
          totalPlayed: 53,
          winPercentage: 0.58,
        },
      };

      const result = new TournamentResult(resultData);
      const savedResult = await result.save();

      expect(savedResult.bracketScores?.r16Won).toBe(11);
      expect(savedResult.bracketScores?.bracketWon).toBe(31);
      expect(savedResult.bracketScores?.bracketPlayed).toBe(53);
    });
  });

  describe('Calculations', () => {
    it('should calculate win percentage automatically', async () => {
      const resultData: ITournamentResultInput = {
        tournamentId: tournamentId.toString(),
        players: [player1Id.toString()],
        totalStats: {
          totalWon: 12,
          totalLost: 8,
          totalPlayed: 20,
          winPercentage: 0, // Will be calculated
        },
      };

      const result = new TournamentResult(resultData);
      const savedResult = await result.save();

      expect(savedResult.totalStats.winPercentage).toBe(0.6);
    });

    it('should calculate round robin win percentage', async () => {
      const resultData: ITournamentResultInput = {
        tournamentId: tournamentId.toString(),
        players: [player1Id.toString()],
        roundRobinScores: {
          rrWon: 15,
          rrLost: 10,
          rrPlayed: 25,
        },
        totalStats: {
          totalWon: 15,
          totalLost: 10,
          totalPlayed: 25,
          winPercentage: 0.6,
        },
      };

      const result = new TournamentResult(resultData);
      const savedResult = await result.save();

      expect(savedResult.roundRobinScores?.rrWinPercentage).toBe(0.6);
    });

    it('should calculate bracket totals from individual rounds', async () => {
      const resultData: ITournamentResultInput = {
        tournamentId: tournamentId.toString(),
        players: [player1Id.toString()],
        bracketScores: {
          r16Won: 11,
          r16Lost: 3,
          qfWon: 11,
          qfLost: 8,
          sfWon: 9,
          sfLost: 11,
          // bracketWon, bracketLost, bracketPlayed will be calculated
        },
        totalStats: {
          totalWon: 31,
          totalLost: 22,
          totalPlayed: 53,
          winPercentage: 0.58,
        },
      };

      const result = new TournamentResult(resultData);
      const savedResult = await result.save();

      expect(savedResult.bracketScores?.bracketWon).toBe(31);
      expect(savedResult.bracketScores?.bracketLost).toBe(22);
      expect(savedResult.bracketScores?.bracketPlayed).toBe(53);
    });
  });

  describe('Virtuals', () => {
    it('should provide performance grade virtual', async () => {
      const highPerformance = new TournamentResult({
        tournamentId: tournamentId.toString(),
        players: [player1Id.toString()],
        totalStats: {
          totalWon: 18,
          totalLost: 2,
          totalPlayed: 20,
          winPercentage: 0.9,
        },
      });

      const saved = await highPerformance.save();
      expect((saved as any).performanceGrade).toBe('A');

      const lowPerformance = new TournamentResult({
        tournamentId: tournamentId.toString(),
        players: [player2Id.toString()],
        totalStats: {
          totalWon: 8,
          totalLost: 12,
          totalPlayed: 20,
          winPercentage: 0.4,
        },
      });

      const savedLow = await lowPerformance.save();
      expect((savedLow as any).performanceGrade).toBe('F');
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      await TournamentResult.create([
        {
          tournamentId,
          players: [player1Id],
          totalStats: {
            totalWon: 15,
            totalLost: 5,
            totalPlayed: 20,
            winPercentage: 0.75,
            finalRank: 1,
          },
        },
        {
          tournamentId,
          players: [player2Id],
          totalStats: {
            totalWon: 10,
            totalLost: 10,
            totalPlayed: 20,
            winPercentage: 0.5,
            finalRank: 3,
          },
        },
      ]);
    });

    it('should paginate results', async () => {
      const result = await TournamentResult.paginate({}, {
        page: 1,
        limit: 1,
        sort: '-totalStats.winPercentage'
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].totalStats.winPercentage).toBe(0.75);
    });

    it('should filter by tournament', async () => {
      const result = await TournamentResult.paginate({ tournamentId }, { page: 1, limit: 10 });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });
  });
});