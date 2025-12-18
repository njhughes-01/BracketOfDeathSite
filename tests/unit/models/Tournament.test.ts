import mongoose from 'mongoose';
import { Tournament } from '../../../src/backend/models/Tournament';
import { ITournamentInput } from '../../../src/backend/types/tournament';

describe('Tournament Model', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Tournament.deleteMany({});
  });

  describe('Validation', () => {
    const validTournamentData: ITournamentInput = {
      date: new Date('2024-07-20'),
      bodNumber: 202407,
      format: 'Men\'s',
      location: 'Local Tennis Club',
      advancementCriteria: 'Top 2 from each group advance to knockout rounds',
      registrationType: 'open',
    };

    it('should create a valid tournament', async () => {
      const tournament = new Tournament(validTournamentData);
      const savedTournament = await tournament.save();

      expect(savedTournament.date).toBeInstanceOf(Date);
      expect(savedTournament.bodNumber).toBe(202407);
      expect(savedTournament.format).toBe('Men\'s');
      expect(savedTournament.location).toBe('Local Tennis Club');
      expect(savedTournament.advancementCriteria).toBe('Top 2 from each group advance to knockout rounds');
    });

    it('should require all mandatory fields', async () => {
      const incompleteData = {
        date: new Date('2024-07-20'),
        format: 'Men\'s',
      };

      const tournament = new Tournament(incompleteData);
      await expect(tournament.save()).rejects.toThrow('This field is required');
    });

    it('should enforce unique BOD number', async () => {
      await Tournament.create(validTournamentData);

      const duplicateTournament = new Tournament(validTournamentData);
      await expect(duplicateTournament.save()).rejects.toThrow();
    });

    it('should validate format enum', async () => {
      const invalidFormatData = {
        ...validTournamentData,
        format: 'Invalid Format',
      };

      const tournament = new Tournament(invalidFormatData);
      await expect(tournament.save()).rejects.toThrow('Format must be one of');
    });

    it('should validate date range', async () => {
      const futureTournament = new Tournament({
        ...validTournamentData,
        date: new Date('2040-01-01'),
        bodNumber: 204001,
      });

      await expect(futureTournament.save()).rejects.toThrow('Date must be between 2009 and 10 years in the future');

      const pastTournament = new Tournament({
        ...validTournamentData,
        date: new Date('2000-01-01'),
        bodNumber: 200001,
      });

      await expect(pastTournament.save()).rejects.toThrow('Date must be between 2009 and 10 years in the future');
    });

    it('should validate BOD number format', async () => {
      const invalidBodNumber = new Tournament({
        ...validTournamentData,
        bodNumber: 12345, // Invalid format
      });

      await expect(invalidBodNumber.save()).rejects.toThrow('BOD number must be in format YYYYMM');
    });

    it('should validate BOD number and date consistency', async () => {
      const inconsistentData = new Tournament({
        ...validTournamentData,
        date: new Date('2024-07-20'),
        bodNumber: 202408, // Different month
      });

      await expect(inconsistentData.save()).rejects.toThrow('Date must match BOD number year and month');
    });

    it('should validate location length', async () => {
      const shortLocation = new Tournament({
        ...validTournamentData,
        location: 'X',
      });

      await expect(shortLocation.save()).rejects.toThrow();

      const longLocation = new Tournament({
        ...validTournamentData,
        location: 'X'.repeat(101),
      });

      await expect(longLocation.save()).rejects.toThrow();
    });

    it('should validate advancement criteria length', async () => {
      const shortCriteria = new Tournament({
        ...validTournamentData,
        advancementCriteria: 'Top',
      });

      await expect(shortCriteria.save()).rejects.toThrow();

      const longCriteria = new Tournament({
        ...validTournamentData,
        advancementCriteria: 'X'.repeat(501),
      });

      await expect(longCriteria.save()).rejects.toThrow();
    });

    it('should validate photo albums URL format', async () => {
      const invalidUrl = new Tournament({
        ...validTournamentData,
        photoAlbums: 'not-a-url',
      });

      await expect(invalidUrl.save()).rejects.toThrow('Photo albums must be a valid URL');

      const validUrl = new Tournament({
        ...validTournamentData,
        photoAlbums: 'https://photos.example.com/tournament/2024-07',
      });

      const savedTournament = await validUrl.save();
      expect(savedTournament.photoAlbums).toBe('https://photos.example.com/tournament/2024-07');
    });
  });

  describe('Calculations', () => {
    it('should auto-generate BOD number from date if not provided', async () => {
      const tournamentData = {
        date: new Date('2024-07-20'),
        format: 'Men\'s',
        location: 'Local Tennis Club',
        advancementCriteria: 'Top 2 from each group advance to knockout rounds',
      };

      const tournament = new Tournament(tournamentData);
      const savedTournament = await tournament.save();

      expect(savedTournament.bodNumber).toBe(202407);
    });

    it('should trim whitespace from string fields', async () => {
      const tournamentData = {
        date: new Date('2024-07-20'),
        bodNumber: 202407,
        format: '  Men\'s  ',
        location: '  Local Tennis Club  ',
        advancementCriteria: '  Top 2 from each group advance to knockout rounds  ',
        notes: '  Some notes  ',
      };

      const tournament = new Tournament(tournamentData);
      const savedTournament = await tournament.save();

      expect(savedTournament.format).toBe('Men\'s');
      expect(savedTournament.location).toBe('Local Tennis Club');
      expect(savedTournament.advancementCriteria).toBe('Top 2 from each group advance to knockout rounds');
      expect(savedTournament.notes).toBe('Some notes');
    });
  });

  describe('Virtuals', () => {
    it('should provide formatted date virtual', async () => {
      const tournament = new Tournament({
        date: new Date('2024-07-20'),
        bodNumber: 202407,
        format: 'Men\'s',
        location: 'Local Tennis Club',
        advancementCriteria: 'Top 2 from each group advance to knockout rounds',
      });

      const savedTournament = await tournament.save();
      expect((savedTournament as any).formattedDate).toBe('July 20, 2024');
    });

    it('should provide year virtual', async () => {
      const tournament = new Tournament({
        date: new Date('2024-07-20'),
        bodNumber: 202407,
        format: 'Men\'s',
        location: 'Local Tennis Club',
        advancementCriteria: 'Top 2 from each group advance to knockout rounds',
      });

      const savedTournament = await tournament.save();
      expect((savedTournament as any).year).toBe(2024);
    });

    it('should provide month virtual', async () => {
      const tournament = new Tournament({
        date: new Date('2024-07-20'),
        bodNumber: 202407,
        format: 'Men\'s',
        location: 'Local Tennis Club',
        advancementCriteria: 'Top 2 from each group advance to knockout rounds',
      });

      const savedTournament = await tournament.save();
      expect((savedTournament as any).month).toBe(7);
    });

    it('should provide season virtual', async () => {
      const summerTournament = new Tournament({
        date: new Date('2024-07-20'),
        bodNumber: 202407,
        format: 'Men\'s',
        location: 'Local Tennis Club',
        advancementCriteria: 'Top 2 from each group advance to knockout rounds',
      });

      const saved = await summerTournament.save();
      expect((saved as any).season).toBe('Summer');
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      await Tournament.create([
        {
          date: new Date('2024-07-20'),
          bodNumber: 202407,
          format: 'Men\'s',
          location: 'Club A',
          advancementCriteria: 'Standard rules',
        },
        {
          date: new Date('2024-08-15'),
          bodNumber: 202408,
          format: 'Women\'s',
          location: 'Club B',
          advancementCriteria: 'Standard rules',
        },
        {
          date: new Date('2024-09-10'),
          bodNumber: 202409,
          format: 'Mixed',
          location: 'Club C',
          advancementCriteria: 'Standard rules',
        },
      ]);
    });

    it('should paginate tournaments', async () => {
      const result = await Tournament.paginate({}, { page: 1, limit: 2, sort: '-date' });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.pagination.current).toBe(1);
      expect(result.pagination.total).toBe(3);
      expect(result.pagination.pages).toBe(2);
    });

    it('should filter tournaments by format', async () => {
      const result = await Tournament.paginate({ format: 'Men\'s' }, { page: 1, limit: 10 });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].format).toBe('Men\'s');
    });
  });
});