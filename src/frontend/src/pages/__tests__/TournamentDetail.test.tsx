import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import TournamentDetail from '../TournamentDetail';
import { useApi, useMutation } from '../../hooks/useApi';

// Mock child components
vi.mock('../../components/tournament/LiveStats', () => ({
    default: () => <div data-testid="live-stats">Live Stats Component</div>
}));
vi.mock('../../components/tournament/BracketView', () => ({
    default: () => <div data-testid="bracket-view">Bracket Component</div>
}));

// Mock hooks
vi.mock('../../hooks/useApi');
const mockUseAuth = vi.fn(() => ({ isAdmin: false }));
vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => mockUseAuth()
}));

const mockTournament = {
    id: '1',
    bodNumber: 101,
    location: 'Test Court',
    format: 'Singles',
    date: new Date().toISOString(),
    maxPlayers: 32,
    players: [{ _id: 'p1', name: 'Player 1', seed: 1 }],
    notes: 'Test Notes',
    advancementCriteria: 'Test Rules'
};

const mockMatches = [
    {
        id: 'm1',
        round: 'quarterfinal',
        matchNumber: 1,
        status: 'scheduled',
        team1: { teamName: 'Player 1', score: 0 },
        team2: { teamName: 'Player 2', score: 0 }
    }
];

describe('TournamentDetail Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderPage = (isAdmin = false) => {
        mockUseAuth.mockReturnValue({ isAdmin });

        render(
            <MemoryRouter initialEntries={['/tournaments/1']}>
                <Routes>
                    <Route path="/tournaments/:id" element={<TournamentDetail />} />
                    <Route path="/tournaments" element={<div>List Page</div>} />
                </Routes>
            </MemoryRouter>
        );
    };

    const setupApiMock = () => {
        let callCount = 0;
        (useApi as any).mockImplementation(() => {
            callCount++;
            // Odd calls = tournament, Even calls = matches
            if (callCount % 2 !== 0) return { data: { data: mockTournament }, loading: false };
            return { data: { data: mockMatches }, loading: false };
        });
    };

    it('renders loading state', () => {
        (useApi as any).mockReturnValue({ data: null, loading: true });
        (useMutation as any).mockReturnValue({ mutate: vi.fn(), loading: false });

        renderPage();

        const pulseElements = screen.getAllByText((_, element) => element?.className.includes('animate-pulse') ?? false);
        expect(pulseElements.length).toBeGreaterThan(0);
    });

    it('renders details and tabs', () => {
        setupApiMock();
        (useMutation as any).mockReturnValue({ mutate: vi.fn() });

        renderPage();

        expect(screen.getByText('BOD Tournament #101')).toBeInTheDocument();
        expect(screen.getByText('Test Court')).toBeInTheDocument();
        expect(screen.getByText('Overview')).toBeInTheDocument();

        // Players appears in stats grid label and tabs
        expect(screen.getAllByText('Players').length).toBeGreaterThan(0);

        expect(screen.getByText('Matches')).toBeInTheDocument();
        expect(screen.getByText('Bracket')).toBeInTheDocument();

        // Overview content by default
        expect(screen.getByText('Test Notes')).toBeInTheDocument();
    });

    it('navigates tabs', async () => {
        setupApiMock();
        (useMutation as any).mockReturnValue({ mutate: vi.fn() });

        renderPage();

        // Matches Tab
        fireEvent.click(screen.getByText('Matches'));
        expect(screen.getByText('Quarter Finals')).toBeInTheDocument();
        expect(screen.getByText('Player 1')).toBeInTheDocument();

        // Players Tab
        fireEvent.click(screen.getByText('Players', { selector: 'button' }));
        expect(screen.getAllByText('Player 1').length).toBeGreaterThan(0);

        // Bracket Tab
        fireEvent.click(screen.getByText('Bracket'));
        expect(screen.getByTestId('bracket-view')).toBeInTheDocument();
    });

    it('shows admin actions when admin', () => {
        let callCount = 0;
        (useApi as any).mockImplementation(() => {
            callCount++;
            if (callCount % 2 !== 0) return { data: { data: mockTournament }, loading: false };
            return { data: null, loading: false };
        });
        (useMutation as any).mockReturnValue({ mutate: vi.fn() });

        renderPage(true); // Admin

        expect(screen.getByTitle('Delete Tournament')).toBeInTheDocument();
    });

    it('handles delete action', async () => {
        let callCount = 0;
        (useApi as any).mockImplementation(() => {
            callCount++;
            if (callCount % 2 !== 0) return { data: { data: mockTournament }, loading: false };
            return { data: null, loading: false };
        });
        const mockDelete = vi.fn();
        (useMutation as any).mockReturnValue({ mutate: mockDelete });

        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

        renderPage(true);

        const deleteBtn = screen.getByTitle('Delete Tournament');
        fireEvent.click(deleteBtn);

        expect(confirmSpy).toHaveBeenCalled();
        expect(mockDelete).toHaveBeenCalled();
    });
});
