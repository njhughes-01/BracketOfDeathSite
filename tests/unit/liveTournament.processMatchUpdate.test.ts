import { jest } from '@jest/globals';
import { LiveTournamentController } from '../../src/backend/controllers/LiveTournamentController';

describe('LiveTournamentController.processMatchUpdate', () => {
  it('computes team totals from per-player scores and sets winner when totals provided', () => {
    const ctl: any = new LiveTournamentController();
    const input = {
      team1PlayerScores: [
        { playerId: 'p1', playerName: 'A', score: 8 },
        { playerId: 'p2', playerName: 'B', score: 7 },
      ],
      team2PlayerScores: [
        { playerId: 'p3', playerName: 'C', score: 3 },
        { playerId: 'p4', playerName: 'D', score: 2 },
      ],
    };
    const out = ctl.processMatchUpdate(input);
    expect(out['team1.playerScores']).toHaveLength(2);
    expect(out['team1.score']).toBe(15);
    expect(out['team2.playerScores']).toHaveLength(2);
    expect(out['team2.score']).toBe(5);

    // When explicit team totals are present, it sets winner
    const out2 = ctl.processMatchUpdate({ team1Score: 10, team2Score: 8 });
    expect(out2['team1.score']).toBe(10);
    expect(out2['team2.score']).toBe(8);
    expect(out2.winner).toBe('team1');
  });
});

