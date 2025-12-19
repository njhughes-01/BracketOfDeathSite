import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Tournaments from '../Tournaments';
import { usePaginatedApi } from '../../hooks/useApi';

// Mock hook and context
vi.mock('../../hooks/useApi');
vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({
        isAdmin: false,
        user: { id: 'u1', username: 'testuser' },
    }),
}));

const mockTournaments = [
    {
        id: '1',
        bodNumber: 101,
        location: 'Court 1',
        format: 'Singles',
        date: new Date().toISOString(), // Today
        maxPlayers: 32,
        players: [],
        status: 'scheduled'
    },
    {
        id: '2',
        bodNumber: 102,
        location: 'Court 2',
        format: 'Doubles',
        date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        maxPlayers: 16,
        players: [],
        status: 'scheduled'
    }
];

describe('Tournaments Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders loading state', () => {
        (usePaginatedApi as any).mockReturnValue({
            data: null,
            loading: true,
            refresh: vi.fn(),
        });

        render(
            <MemoryRouter>
                <Tournaments />
            </MemoryRouter>
        );

        // Check for pulse animation blocks
        const pulseElements = screen.getAllByText((content, element) => {
            return element?.className.includes('animate-pulse') ?? false;
        });
        expect(pulseElements.length).toBeGreaterThan(0);
    });

    it('renders tournament list', () => {
        (usePaginatedApi as any).mockReturnValue({
            data: mockTournaments,
            loading: false,
            refresh: vi.fn(),
        });

        render(
            <MemoryRouter>
                <Tournaments />
            </MemoryRouter>
        );

        // BOD #101 appears twice: once in Featured Live Card, once in List
        const elements101 = screen.getAllByText('BOD #101');
        expect(elements101.length).toBeGreaterThanOrEqual(1);

        expect(screen.getByText('BOD #102')).toBeInTheDocument();
        expect(screen.getAllByText('Court 1').length).toBeGreaterThan(0);
    });

    it('renders empty state', () => {
        (usePaginatedApi as any).mockReturnValue({
            data: [],
            loading: false,
            refresh: vi.fn(),
        });

        render(
            <MemoryRouter>
                <Tournaments />
            </MemoryRouter>
        );

        expect(screen.getByText('No tournaments found')).toBeInTheDocument();
    });

    it('filters by search term', () => {
        // Use data where none are live to avoid Featured Card interference
        const futureTournaments = mockTournaments.map(t => ({
            ...t,
            date: new Date(Date.now() + 86400000 * 10).toISOString() // 10 days in future
        }));

        (usePaginatedApi as any).mockReturnValue({
            data: futureTournaments,
            loading: false,
            refresh: vi.fn(),
        });

        render(
            <MemoryRouter>
                <Tournaments />
            </MemoryRouter>
        );

        const searchInput = screen.getByPlaceholderText('Search tournaments...');
        fireEvent.change(searchInput, { target: { value: 'Doubles' } });

        expect(screen.queryByText('BOD #101')).not.toBeInTheDocument(); // Singles
        expect(screen.getByText('BOD #102')).toBeInTheDocument(); // Doubles
    });

    it('filters by tab', () => {
        const pastTournament = { ...mockTournaments[0], id: '3', bodNumber: 99, date: '2020-01-01' };
        const futureTournament = { ...mockTournaments[1], id: '4', bodNumber: 103, date: new Date(Date.now() + 100000000).toISOString() };

        (usePaginatedApi as any).mockReturnValue({
            data: [pastTournament, futureTournament],
            loading: false,
            refresh: vi.fn(),
        });

        render(
            <MemoryRouter>
                <Tournaments />
            </MemoryRouter>
        );

        // Default 'All'
        expect(screen.getByText('BOD #99')).toBeInTheDocument();
        expect(screen.getByText('BOD #103')).toBeInTheDocument();

        // Click 'Upcoming'
        fireEvent.click(screen.getByText('Upcoming'));

        expect(screen.queryByText('BOD #99')).not.toBeInTheDocument();
        expect(screen.getByText('BOD #103')).toBeInTheDocument();
    });
});
