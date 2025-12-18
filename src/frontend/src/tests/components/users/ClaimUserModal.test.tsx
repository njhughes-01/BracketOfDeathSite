import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ClaimUserModal from '../../../components/users/ClaimUserModal';
import apiClient from '../../../services/api';
import type { PaginatedResponse, Player } from '../../../types/api';

// Mock apiClient
vi.mock('../../../services/api', () => ({
    default: {
        searchPlayers: vi.fn(),
        claimUser: vi.fn(),
    },
}));

describe('ClaimUserModal', () => {
    const mockOnClose = vi.fn();
    const mockOnSuccess = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders correctly', () => {
        render(<ClaimUserModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);
        expect(screen.getByText('Claim Profile')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('user@example.com')).toBeInTheDocument();
    });

    it('searches for players', async () => {
        const mockPlayers: Player[] = [
            { id: '1', name: 'John Doe', _id: '1' } as any,
            { id: '2', name: 'Jane Doe', _id: '2' } as any,
        ];

        const mockResponse: PaginatedResponse<Player> = {
            success: true,
            data: mockPlayers,
            pagination: { current: 1, pages: 1, count: 2, total: 2 },
        };

        (apiClient.searchPlayers as any).mockResolvedValue(mockResponse);

        render(<ClaimUserModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

        const searchInput = screen.getByPlaceholderText('Search player name...');
        fireEvent.change(searchInput, { target: { value: 'Doe' } });

        await waitFor(() => {
            expect(apiClient.searchPlayers).toHaveBeenCalledWith('Doe');
        });

        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    it('selects a player and sends invitation', async () => {
        const mockPlayers: Player[] = [
            { id: '1', name: 'John Doe', _id: '1' } as any,
        ];

        const mockSearchResponse: PaginatedResponse<Player> = {
            success: true,
            data: mockPlayers,
            pagination: { current: 1, pages: 1, count: 1, total: 1 },
        };

        (apiClient.searchPlayers as any).mockResolvedValue(mockSearchResponse);
        (apiClient.claimUser as any).mockResolvedValue({ success: true });

        render(<ClaimUserModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

        // Enter email
        const emailInput = screen.getByPlaceholderText('user@example.com');
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

        // Search and select player
        const searchInput = screen.getByPlaceholderText('Search player name...');
        fireEvent.change(searchInput, { target: { value: 'John' } });

        await waitFor(() => {
            expect(screen.getByText('John Doe')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('John Doe'));

        // Submit
        const submitButton = screen.getByText('Send Invitation');
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(apiClient.claimUser).toHaveBeenCalledWith('test@example.com', '1');
        });

        expect(screen.getByText('Invitation Sent!')).toBeInTheDocument();
    });

    it('handles API errors correctly', async () => {
        const mockPlayers: Player[] = [
            { id: '1', name: 'John Doe', _id: '1' } as any,
        ];

        (apiClient.searchPlayers as any).mockResolvedValue({
            success: true,
            data: mockPlayers
        });

        (apiClient.claimUser as any).mockResolvedValue({
            success: false,
            error: 'User already claimed',
        });

        render(<ClaimUserModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

        // Set up form
        fireEvent.change(screen.getByPlaceholderText('user@example.com'), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByPlaceholderText('Search player name...'), { target: { value: 'John' } });

        await waitFor(() => {
            fireEvent.click(screen.getByText('John Doe'));
        });

        fireEvent.click(screen.getByText('Send Invitation'));

        await waitFor(() => {
            expect(screen.getByText('User already claimed')).toBeInTheDocument();
        });
    });
});
