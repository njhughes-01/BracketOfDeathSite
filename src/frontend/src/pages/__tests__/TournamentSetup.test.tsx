import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import TournamentSetupPage from '../TournamentSetup';
import apiClient from '../../services/api';

// Mock apiClient
vi.mock('../../services/api', () => ({
    default: {
        getNextBodNumber: vi.fn(),
        getPlayers: vi.fn(),
        generatePlayerSeeds: vi.fn(),
        generateTeams: vi.fn(),
        setupTournament: vi.fn(),
    }
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

const mockPlayers = [
    { id: 'p1', name: 'Player One', winningPercentage: 0.8, totalChampionships: 2, gamesPlayed: 10 },
    { id: 'p2', name: 'Player Two', winningPercentage: 0.5, totalChampionships: 0, gamesPlayed: 5 }
];

describe('TournamentSetup Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Default success responses
        (apiClient.getNextBodNumber as any).mockResolvedValue({ success: true, data: { nextBodNumber: 42 } });
        (apiClient.getPlayers as any).mockResolvedValue({ success: true, data: mockPlayers });
        (apiClient.generatePlayerSeeds as any).mockResolvedValue({ success: true, data: [] });
        (apiClient.generateTeams as any).mockResolvedValue({ success: true, data: [] });
        (apiClient.setupTournament as any).mockResolvedValue({ success: true, data: { id: 'new-tournament-id' } });
    });

    const renderPage = () => {
        render(
            <MemoryRouter>
                <TournamentSetupPage />
            </MemoryRouter>
        );
    };

    it('initializes with fetched data', async () => {
        renderPage();

        await waitFor(() => {
            expect(apiClient.getNextBodNumber).toHaveBeenCalled();
            expect(apiClient.getPlayers).toHaveBeenCalled();
        });

        // Wait for loading to finish
        await waitFor(() => {
            expect(screen.queryByText(/Initializing Setup/i)).not.toBeInTheDocument();
        });

        // Check if BOD number is set (looking inside the input)
        // placeholder says "e.g. 42", but value should be 42
        const bodInput = screen.getByDisplayValue('42');
        expect(bodInput).toBeInTheDocument();
    });

    it('validates basic info step', async () => {
        renderPage();
        await waitFor(() => expect(apiClient.getNextBodNumber).toHaveBeenCalled());

        // Wait for loading to finish
        await waitFor(() => {
            expect(screen.queryByText(/Initializing Setup/i)).not.toBeInTheDocument();
        });

        const nextBtn = screen.getByText('Next Step');

        // Empty date initially
        fireEvent.click(nextBtn);

        expect(screen.getByText('Date is required')).toBeInTheDocument();

        // Fill date
        const dateInput = screen.getByTestId('date-input');
        fireEvent.change(dateInput, { target: { value: '2025-12-25' } });

        // Fill location
        const locationInput = screen.getByPlaceholderText('Tournament location');
        fireEvent.change(locationInput, { target: { value: 'Test Arena' } });

        // Next should work now
        fireEvent.click(nextBtn);

        // Should be on Step 2 (Select Tournament Players)
        await waitFor(() => {
            expect(screen.getByText('Select Tournament Players')).toBeInTheDocument();
        });
    });

    it('completes the full flow and creates tournament', async () => {
        renderPage();
        await waitFor(() => expect(apiClient.getNextBodNumber).toHaveBeenCalled());

        // Wait for loading to finish
        await waitFor(() => {
            expect(screen.queryByText(/Initializing Setup/i)).not.toBeInTheDocument();
        });

        const nextBtn = screen.getByText('Next Step');

        // Step 1: Basic Info
        const dateInput = screen.getByTestId('date-input');
        fireEvent.change(dateInput, { target: { value: '2025-12-25' } });
        fireEvent.change(screen.getByPlaceholderText('Tournament location'), { target: { value: 'Test Arena' } });
        fireEvent.click(nextBtn);

        // Step 2: Players
        await waitFor(() => screen.getByText('Select Tournament Players'));

        // Select a player
        const playerCard1 = screen.getByText('Player One').closest('div[class*="border rounded-xl cursor-pointer"]');
        fireEvent.click(playerCard1!);

        fireEvent.click(nextBtn);

        // Step 3: Seeding (Optional)
        await waitFor(() => screen.getByText('Seeding Configuration'));
        fireEvent.click(nextBtn);

        // Step 4: Settings
        await waitFor(() => screen.getByText('Tournament Settings'));
        fireEvent.click(nextBtn);

        // Step 5: Review
        await waitFor(() => screen.getByText('Tournament Summary'));
        expect(screen.getByText('Ready to Create')).toBeInTheDocument();

        const createBtn = screen.getByText('Create Tournament');
        fireEvent.click(createBtn);

        await waitFor(() => {
            expect(apiClient.setupTournament).toHaveBeenCalledWith(expect.objectContaining({
                basicInfo: expect.objectContaining({
                    date: '2025-12-25',
                }),
                selectedPlayers: expect.arrayContaining(['p1'])
            }));
        });

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/tournaments/new-tournament-id');
        });
    });
});
