import mongoose from 'mongoose';
import { Player } from '../../../src/backend/models/Player';
import { IPlayer, IPlayerInput } from '../../../src/backend/types/player';

describe('Player Model', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Player.deleteMany({});
  });

  describe('Validation', () => {
    it('should create a valid player with minimal data', async () => {
      const playerData: IPlayerInput = {
        name: 'John Doe',
      };

      const player = new Player(playerData);
      const savedPlayer = await player.save();

      expect(savedPlayer.name).toBe('John Doe');
      expect(savedPlayer.bodsPlayed).toBe(0);
      expect(savedPlayer.gamesPlayed).toBe(0);
      expect(savedPlayer.gamesWon).toBe(0);
      expect(savedPlayer.winningPercentage).toBe(0);
      expect(savedPlayer.totalChampionships).toBe(0);
    });

    it('should create a valid player with complete data', async () => {
      const playerData: IPlayerInput = {
        name: 'Jane Smith',
        bodsPlayed: 5,
        bestResult: 1,
        avgFinish: 3.2,
        gamesPlayed: 50,
        gamesWon: 30,
        individualChampionships: 2,
        divisionChampionships: 1,
        drawingSequence: 15,
        pairing: 'John Doe',
      };

      const player = new Player(playerData);
      const savedPlayer = await player.save();

      expect(savedPlayer.name).toBe('Jane Smith');
      expect(savedPlayer.bodsPlayed).toBe(5);
      expect(savedPlayer.bestResult).toBe(1);
      expect(savedPlayer.avgFinish).toBe(3.2);
      expect(savedPlayer.gamesPlayed).toBe(50);
      expect(savedPlayer.gamesWon).toBe(30);
      expect(savedPlayer.winningPercentage).toBe(0.6);
      expect(savedPlayer.individualChampionships).toBe(2);
      expect(savedPlayer.divisionChampionships).toBe(1);
      expect(savedPlayer.totalChampionships).toBe(3);
    });

    it('should require name field', async () => {
      const player = new Player({});

      await expect(player.save()).rejects.toThrow('This field is required');
    });

    it('should enforce unique name constraint', async () => {
      await Player.create({ name: 'Duplicate Name' });

      const duplicatePlayer = new Player({ name: 'Duplicate Name' });
      await expect(duplicatePlayer.save()).rejects.toThrow();
    });

    it('should validate name length', async () => {
      const shortName = new Player({ name: 'X' });
      await expect(shortName.save()).rejects.toThrow();

      const longName = new Player({ name: 'X'.repeat(101) });
      await expect(longName.save()).rejects.toThrow();
    });

    it('should not allow negative values', async () => {
      const invalidPlayer = new Player({
        name: 'Test Player',
        bodsPlayed: -1,
      });

      await expect(invalidPlayer.save()).rejects.toThrow('cannot be negative');
    });

    it('should not allow games won to exceed games played', async () => {
      const invalidPlayer = new Player({
        name: 'Test Player',
        gamesPlayed: 10,
        gamesWon: 15,
      });

      await expect(invalidPlayer.save()).rejects.toThrow('Games won cannot exceed games played');
    });

    it('should not allow best result to be worse than average finish', async () => {
      const invalidPlayer = new Player({
        name: 'Test Player',
        bestResult: 5,
        avgFinish: 3,
      });

      await expect(invalidPlayer.save()).rejects.toThrow('Best result cannot be worse than average finish');
    });

    it('should validate winning percentage range', async () => {
      const invalidPlayer = new Player({
        name: 'Test Player',
        winningPercentage: 1.5,
      });

      await expect(invalidPlayer.save()).rejects.toThrow('Percentage must be between 0 and 1');
    });
  });

  describe('Calculations', () => {
    it('should calculate winning percentage automatically', async () => {
      const player = new Player({
        name: 'Test Player',
        gamesPlayed: 20,
        gamesWon: 12,
      });

      const savedPlayer = await player.save();
      expect(savedPlayer.winningPercentage).toBe(0.6);
    });

    it('should calculate total championships', async () => {
      const player = new Player({
        name: 'Test Player',
        individualChampionships: 3,
        divisionChampionships: 2,
      });

      const savedPlayer = await player.save();
      expect(savedPlayer.totalChampionships).toBe(5);
    });

    it('should adjust average finish if best result is better', async () => {
      const player = new Player({
        name: 'Test Player',
        bestResult: 2,
        avgFinish: 1,
      });

      const savedPlayer = await player.save();
      expect(savedPlayer.avgFinish).toBe(2);
    });
  });

  describe('Virtuals', () => {
    it('should calculate games lost virtual', async () => {
      const player = new Player({
        name: 'Test Player',
        gamesPlayed: 20,
        gamesWon: 12,
      });

      const savedPlayer = await player.save();
      expect((savedPlayer as any).gamesLost).toBe(8);
    });

    it('should calculate championship ratio virtual', async () => {
      const player = new Player({
        name: 'Test Player',
        bodsPlayed: 10,
        totalChampionships: 2,
      });

      const savedPlayer = await player.save();
      expect((savedPlayer as any).championshipRatio).toBe(0.2);
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      await Player.create([
        { name: 'Player 1', winningPercentage: 0.8, totalChampionships: 3 },
        { name: 'Player 2', winningPercentage: 0.6, totalChampionships: 1 },
        { name: 'Player 3', winningPercentage: 0.9, totalChampionships: 5 },
      ]);
    });

    it('should paginate results', async () => {
      const result = await Player.paginate({}, { page: 1, limit: 2 });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.pagination.current).toBe(1);
      expect(result.pagination.total).toBe(3);
      expect(result.pagination.pages).toBe(2);
    });

    it('should safely update by ID', async () => {
      const player = await Player.findOne({ name: 'Player 1' });

      const updated = await Player.findByIdAndUpdateSafe(
        player!._id.toString(),
        { bodsPlayed: 10 }
      );

      expect(updated?.bodsPlayed).toBe(10);
    });
  });
});