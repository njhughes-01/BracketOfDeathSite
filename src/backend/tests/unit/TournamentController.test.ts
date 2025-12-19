import { Request, Response } from 'express';
import { TournamentController } from '../../controllers/TournamentController';
import { Tournament } from '../../models/Tournament';
import { TournamentResult } from '../../models/TournamentResult';
import { Player } from '../../models/Player';

// Mock models
jest.mock('../../models/Tournament');
jest.mock('../../models/TournamentResult');
jest.mock('../../models/Player');

describe('TournamentController', () => {
    let tournamentController: TournamentController;
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let nextMock: jest.Mock;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
        tournamentController = new TournamentController();
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        nextMock = jest.fn();
        mockRes = {
            status: statusMock,
            json: jsonMock,
        };
        jest.clearAllMocks();
    });

    describe('getUpcoming', () => {
        it('should return upcoming tournaments', async () => {
            mockReq = { query: { limit: '5' } };
            const mockTournaments = [{ id: '1', name: 'Upcoming' }];

            // Mock chain: find -> sort -> limit
            const limitMock = jest.fn().mockResolvedValue(mockTournaments);
            const sortMock = jest.fn().mockReturnValue({ limit: limitMock });
            (Tournament.find as jest.Mock).mockReturnValue({ sort: sortMock });

            await tournamentController.getUpcoming(mockReq as Request, mockRes as Response, nextMock);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: mockTournaments
            }));
        });
    });

    describe('create', () => {
        it('should fail with invalid BOD number', async () => {
            mockReq = {
                body: {
                    bodNumber: 123, // Invalid length
                    date: '2025-01-01'
                }
            };

            await tournamentController.create(mockReq as Request, mockRes as Response, nextMock);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                error: expect.stringContaining('BOD number must be 6 digits')
            }));
        });

        it('should call super.create if validation passes', async () => {
            mockReq = {
                body: {
                    bodNumber: 202501,
                    date: '2025-01-15', // Use mid-month date to avoid timezone issues
                    format: 'Mixed'
                }
            };

            // Mock Tournament.create used by BaseController
            (Tournament.create as jest.Mock).mockResolvedValue({ id: 'new' });

            await tournamentController.create(mockReq as Request, mockRes as Response, nextMock);

            // BaseController.create usually sends 201
            expect(statusMock).toHaveBeenCalledWith(201);
        });
    });

    describe('setupTournament', () => {
        it('should create tournament with valid data', async () => {
            const basicInfo = {
                date: '2025-01-01',
                bodNumber: 202501,
                format: 'Mixed',
                location: 'Test Loc',
                advancementCriteria: 'Wins'
            };

            mockReq = {
                body: {
                    basicInfo,
                    selectedPlayers: []
                }
            };

            (Tournament.create as jest.Mock).mockResolvedValue({ ...basicInfo, id: '123' });

            await tournamentController.setupTournament(mockReq as Request, mockRes as Response, nextMock);

            expect(statusMock).toHaveBeenCalledWith(201);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should fail if basicInfo missing', async () => {
            mockReq = { body: {} };
            await tournamentController.setupTournament(mockReq as Request, mockRes as Response, nextMock);
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                error: 'basicInfo is required'
            }));
        });
    });
});
