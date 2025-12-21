import { Request, Response } from 'express';
import { LiveTournamentController } from '../../src/backend/controllers/LiveTournamentController';
import { eventBus } from '../../src/backend/services/EventBus';
import { Tournament } from '../../src/backend/models/Tournament';
import { Match } from '../../src/backend/models/Match';
import { TournamentResult } from '../../src/backend/models/TournamentResult';

// Mock Mongoose models
jest.mock('../../src/backend/models/Tournament');
jest.mock('../../src/backend/models/Match');
jest.mock('../../src/backend/models/TournamentResult');

describe('LiveTournamentController SSE', () => {
  let controller: LiveTournamentController;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let writeMock: any;

  beforeEach(() => {
    controller = new LiveTournamentController();
    writeMock = jest.fn();
    req = {
      params: { id: 't1' },
      on: jest.fn()
    };
    res = {
      status: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      write: writeMock,
      end: jest.fn()
    };
    jest.clearAllMocks();
  });

  it('streamTournamentEvents sets correct headers and sends initial snapshot', async () => {
    // Mock data for snapshot
    (Tournament.findById as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        _id: 't1',
        toObject: () => ({ _id: 't1', status: 'active', players: [] })
      })
    });
    (Match.find as jest.Mock).mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([])
      })
    });
    (TournamentResult.find as jest.Mock).mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([])
      })
    });

    await controller.streamTournamentEvents(req as Request, res as Response, jest.fn());

    // Verify headers
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
    expect(res.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');

    // Verify initial snapshot sent
    expect(writeMock).toHaveBeenCalledWith(expect.stringContaining('event: snapshot'));
    expect(writeMock).toHaveBeenCalledWith(expect.stringContaining('"success":true'));
  });

  it('streamTournamentEvents sends updates when eventBus emits', async () => {
    // Setup snapshot mocks again
    (Tournament.findById as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        _id: 't1',
        toObject: () => ({ _id: 't1', status: 'active' })
      })
    });
    (Match.find as jest.Mock).mockReturnValue({ populate: jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue([]) }) });
    (TournamentResult.find as jest.Mock).mockReturnValue({ populate: jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue([]) }) });

    await controller.streamTournamentEvents(req as Request, res as Response, jest.fn());

    // Emit an event
    const testUpdate = { type: 'match:update', data: { id: 'm1' } };
    eventBus.emitTournament('t1', 'match:update', testUpdate);

    // Verify update sent
    expect(writeMock).toHaveBeenCalledWith(expect.stringContaining('event: update'));
    expect(writeMock).toHaveBeenCalledWith(expect.stringContaining('match:update'));
  });
});
