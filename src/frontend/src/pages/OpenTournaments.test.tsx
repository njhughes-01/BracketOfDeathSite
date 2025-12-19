import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import axios from 'axios';
import OpenTournaments from './OpenTournaments';
import { useAuth } from '../contexts/AuthContext';

// Mock dependencies
vi.mock('axios', () => {
    const mockInstance = {
        get: vi.fn(),
        post: vi.fn(),
        interceptors: {
            request: { use: vi.fn(), eject: vi.fn() },
            response: { use: vi.fn(), eject: vi.fn() }
        }
    };
    return {
        default: {
            ...mockInstance,
            create: vi.fn(() => mockInstance),
        }
    };
});
vi.mock('../contexts/AuthContext');
vi.mock('../components/ui/LoadingSpinner', () => ({
    default: () => <div data-testid="loading">Loading...</div>
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('OpenTournaments Page', () => {
    const mockTournaments = [
        {
            _id: '1',
            bodNumber: 202401,
            date: '2024-05-15T00:00:00.000Z',
            location: 'Test Location',
            format: 'Format A',
            status: 'scheduled',
            maxPlayers: 10,
            registeredPlayers: new Array(5).fill('p'),
            waitlistPlayers: [],
        },
        {
            _id: '2',
            bodNumber: 202402,
            date: '2024-06-15T00:00:00.000Z',
            location: 'Full Tournament',
            format: 'Format B',
            status: 'scheduled',
            maxPlayers: 2,
            registeredPlayers: ['p1', 'p2'],
            waitlistPlayers: [],
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        (axios.get as any).mockResolvedValue({ data: { data: mockTournaments } });

        (useAuth as any).mockReturnValue({
            isAuthenticated: true,
            user: { id: 'u1', name: 'User', playerId: 'p1' }, // Added playerId for hasProfile=true
            hasProfile: true
        });
    });

    it('renders loading state initially', () => {
        // Make promise not resolve immediately
        (axios.get as any).mockReturnValue(new Promise(() => { }));

        render(
            <MemoryRouter>
                <OpenTournaments />
            </MemoryRouter>
        );
        expect(screen.getByTestId('loading')).toBeInTheDocument();
    });

    it('renders tournaments list after fetch', async () => {
        render(
            <MemoryRouter>
                <OpenTournaments />
            </MemoryRouter>
        );

        expect(await screen.findByText(/Test Location/i)).toBeInTheDocument();

        // Debug if needed
        // screen.debug();

        expect(screen.getByText('Open Tournaments')).toBeInTheDocument();
        expect(screen.getByText(/Full Tournament/i)).toBeInTheDocument();
        expect(screen.getByText(/Format A/i)).toBeInTheDocument();
    });

    it('displays correct registration status', async () => {
        render(
            <MemoryRouter>
                <OpenTournaments />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('5 / 10')).toBeInTheDocument();
        });

        // Check Full tournament button and label
        // Note: The text might be split or styled
        const joinButtons = screen.getAllByRole('button');
        expect(joinButtons[0]).toHaveTextContent(/Register Now/i);
        expect(joinButtons[1]).toHaveTextContent(/Join Waitlist/i);
        expect(screen.getByText('WAITLIST')).toBeInTheDocument();
    });

    it('redirects to login if not authenticated', async () => {
        (useAuth as any).mockReturnValue({ isAuthenticated: false });

        render(
            <MemoryRouter>
                <OpenTournaments />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByText('Test Location')).toBeInTheDocument());

        const registerBtn = screen.getAllByRole('button')[0];
        fireEvent.click(registerBtn);

        expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('/login?returnUrl='));
    });

    it('redirects to onboarding if no profile', async () => {
        (useAuth as any).mockReturnValue({ isAuthenticated: true, hasProfile: false });

        render(
            <MemoryRouter>
                <OpenTournaments />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByText('Test Location')).toBeInTheDocument());

        const registerBtn = screen.getAllByRole('button')[0];
        fireEvent.click(registerBtn);

        expect(mockNavigate).toHaveBeenCalledWith('/onboarding');
    });

    it('calls join api when clicking register (happy path)', async () => {
        (axios.get as any).mockImplementation((url: string) => {
            if (url === '/api/players/me') return Promise.resolve({ data: { data: { _id: 'p1' } } });
            if (url === '/api/tournaments/open') return Promise.resolve({ data: { data: mockTournaments } });
            return Promise.reject(new Error('Unknown url ' + url));
        });
        (axios.post as any).mockResolvedValue({ data: { success: true } });

        render(
            <MemoryRouter>
                <OpenTournaments />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByText('Test Location')).toBeInTheDocument());

        const registerBtn = screen.getAllByRole('button')[0];
        fireEvent.click(registerBtn); // Click first tournament (not full)

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith('/api/players/me');
            expect(axios.post).toHaveBeenCalledWith('/api/tournaments/1/join', { playerId: 'p1' });
        });
    });
});
