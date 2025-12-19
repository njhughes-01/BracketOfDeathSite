import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TournamentManage from '../TournamentManage';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../services/api';

// Mock dependencies
vi.mock('../../contexts/AuthContext');
vi.mock('../../services/api');
vi.mock('../../components/tournament/BracketView', () => ({ default: () => <div data-testid="bracket-view">Mock Bracket View</div> }));
vi.mock('../../components/tournament/LiveStats', () => ({ default: () => <div data-testid="live-stats">Mock Live Stats</div> }));
vi.mock('../../components/tournament/MatchScoring', () => ({ default: () => <div data-testid="match-scoring">Mock Match Scoring</div> }));
vi.mock('../../components/tournament/PlayerLeaderboard', () => ({ default: () => <div data-testid="player-leaderboard">Mock Leaderboard</div> }));

const mockNavigate = vi.fn();
const mockUseParams = vi.fn();
const mockUseLocation = vi.fn();

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useParams: () => mockUseParams(),
        useLocation: () => mockUseLocation()
    };
});

// Mock EventSource - needs to be a class or constructor function
class MockEventSource {
    constructor() { }
    addEventListener = vi.fn();
    close = vi.fn();
}

Object.defineProperty(window, 'EventSource', {
    writable: true,
    value: MockEventSource,
});

describe('TournamentManage Page', () => {
    const mockTournament = {
        tournamentId: 't1',
        bodNumber: 88,
        date: '2025-05-20',
        location: 'Test Location',
        bracketType: 'single_elimination',
        phase: {
            phase: 'setup',
            currentRound: null,
            totalMatches: 0,
            completedMatches: 0
        },
        teams: [],
        players: [],
        matches: [],
        checkInStatus: {}
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseParams.mockReturnValue({ id: 't1' });
        mockUseLocation.mockReturnValue({ search: '' });

        // Default auth: Admin
        (useAuth as any).mockReturnValue({
            isAdmin: true,
            user: { id: 'admin1' }
        });

        // Default API response
        apiClient.getLiveTournament = vi.fn().mockResolvedValue({ success: true, data: mockTournament });
        apiClient.getTournamentMatches = vi.fn().mockResolvedValue({ success: true, data: [] });
    });

    const renderWithRouter = (ui: React.ReactElement) => {
        return render(<BrowserRouter>{ui}</BrowserRouter>);
    };

    it('redirects/shows access denied if not admin', async () => {
        (useAuth as any).mockReturnValue({
            isAdmin: false,
            user: { id: 'user1' }
        });

        renderWithRouter(<TournamentManage />);

        expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });

    it('renders loading state initially', async () => {
        // Delay the resolution to catch the loading state
        apiClient.getLiveTournament = vi.fn().mockImplementation(() => new Promise(() => { }));

        renderWithRouter(<TournamentManage />);

        expect(screen.getByText('Loading tournament data...')).toBeInTheDocument();
    });

    it('renders tournament data when loaded', async () => {
        renderWithRouter(<TournamentManage />);

        await waitFor(() => {
            expect(screen.getByText('BOD #88')).toBeInTheDocument();
            expect(screen.getByText('Setup')).toBeInTheDocument();
        });
    });

    it('shows error when tournament not found', async () => {
        apiClient.getLiveTournament = vi.fn().mockResolvedValue({ success: false });

        renderWithRouter(<TournamentManage />);

        await waitFor(() => {
            expect(screen.getByText('Tournament Not Found')).toBeInTheDocument();
        });
    });

    it('shows "Open Registration" button in setup phase', async () => {
        renderWithRouter(<TournamentManage />);

        await waitFor(() => {
            expect(screen.getByText('Open Registration')).toBeInTheDocument();
        });
    });

    it('shows "Close Reg" and "Start Check-In" in registration phase', async () => {
        const regTournament = {
            ...mockTournament,
            phase: { ...mockTournament.phase, phase: 'registration' }
        };
        apiClient.getLiveTournament = vi.fn().mockResolvedValue({ success: true, data: regTournament });

        renderWithRouter(<TournamentManage />);

        await waitFor(() => {
            expect(screen.getByText('Close Reg')).toBeInTheDocument();
            expect(screen.getByText('Start Check-In')).toBeInTheDocument();
        });
    });

    it('calls executeTournamentAction when action button is clicked', async () => {
        apiClient.executeTournamentAction = vi.fn().mockResolvedValue({ success: true, data: mockTournament });

        renderWithRouter(<TournamentManage />);

        await waitFor(() => {
            expect(screen.getByText('Open Registration')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Open Registration'));

        expect(apiClient.executeTournamentAction).toHaveBeenCalledWith('t1', { action: 'start_registration' });
    });

    it('renders matches grid in bracket phase', async () => {
        const bracketTournament = {
            ...mockTournament,
            phase: { ...mockTournament.phase, phase: 'bracket', currentRound: 'quarterfinal' }
        };
        apiClient.getLiveTournament = vi.fn().mockResolvedValue({ success: true, data: bracketTournament });

        const mockMatches = [
            { id: 'm1', matchNumber: 1, round: 'quarterfinal', status: 'pending', players: [] }
        ];
        apiClient.getTournamentMatches = vi.fn().mockResolvedValue({ success: true, data: mockMatches });

        renderWithRouter(<TournamentManage />);

        await waitFor(() => {
            expect(screen.getByText('Match 1')).toBeInTheDocument();
        });
    });
});
