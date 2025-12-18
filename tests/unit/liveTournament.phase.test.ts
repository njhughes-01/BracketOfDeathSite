import { jest, describe, it, expect } from '@jest/globals';
import { LiveTournamentController } from '../../src/backend/controllers/LiveTournamentController';

describe('LiveTournamentController.calculateTournamentPhase', () => {
    // Access private method via any cast
    const ctl: any = new LiveTournamentController();

    it('defaults to Round Robin phase for legacy tournaments (no bracketType) with teams', () => {
        const tournament = {
            status: 'active',
            bracketType: undefined, // Legacy/Default
            generatedTeams: [{ teamId: 't1' }, { teamId: 't2' }],
            players: ['p1', 'p2']
        };
        const matches: any[] = []; // No matches yet

        const phase = ctl.calculateTournamentPhase(tournament, matches);

        expect(phase.phase).toBe('round_robin');
        expect(phase.currentRound).toBe('RR_R1');
    });

    it('sets phase to bracket (quarterfinal) for Single Elimination with teams', () => {
        const tournament = {
            status: 'active',
            bracketType: 'single_elimination',
            generatedTeams: [{ teamId: 't1' }, { teamId: 't2' }],
            players: ['p1', 'p2']
        };
        const matches: any[] = [];

        const phase = ctl.calculateTournamentPhase(tournament, matches);

        // Skip check-in -> Start Bracket
        expect(phase.phase).toBe('bracket');
        expect(phase.currentRound).toBe('quarterfinal');
    });

    it('sets phase to bracket (quarterfinal) for Double Elimination with teams', () => {
        const tournament = {
            status: 'active',
            bracketType: 'double_elimination',
            generatedTeams: [{ teamId: 't1' }, { teamId: 't2' }],
            players: ['p1', 'p2']
        };
        const matches: any[] = [];

        const phase = ctl.calculateTournamentPhase(tournament, matches);

        expect(phase.phase).toBe('bracket');
        expect(phase.currentRound).toBe('quarterfinal');
    });

    it('sets phase to round_robin for Round Robin Playoff type', () => {
        const tournament = {
            status: 'active',
            bracketType: 'round_robin_playoff',
            generatedTeams: [{ teamId: 't1' }, { teamId: 't2' }],
            players: ['p1', 'p2']
        };
        const matches: any[] = [];

        const phase = ctl.calculateTournamentPhase(tournament, matches);

        expect(phase.phase).toBe('round_robin');
    });

    it('detects Bracket phase when matches exist', () => {
        const tournament = {
            status: 'active',
            bracketType: 'single_elimination',
            generatedTeams: [],
            players: []
        };
        const matches: any[] = [
            { round: 'quarterfinal', status: 'scheduled' }
        ];

        const phase = ctl.calculateTournamentPhase(tournament, matches);

        expect(phase.phase).toBe('bracket');
        expect(phase.currentRound).toBe('quarterfinal');
    });
});
