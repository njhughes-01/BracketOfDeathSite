import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Profile from '../Profile';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../services/api';
import { useApi } from '../../hooks/useApi';

// Mock dependencies
vi.mock('../../contexts/AuthContext');
vi.mock('../../services/api');
vi.mock('../../hooks/useApi');
vi.mock('../../components/auth/ChangePasswordModal', () => ({
    default: () => <div data-testid="change-password-modal">Mock Change Password Modal</div>
}));

describe('Profile Page', () => {
    const mockUser = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        emailVerified: true,
        firstName: 'Test',
        lastName: 'User',
        fullName: 'Test User',
        roles: ['user'],
        playerId: null
    };

    const mockLogout = vi.fn();
    const mockRefreshUser = vi.fn();

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();

        // Default auth mock
        (useAuth as any).mockReturnValue({
            user: mockUser,
            isAdmin: false,
            logout: mockLogout,
            refreshUser: mockRefreshUser
        });

        // Default api hook mock (player stats)
        (useApi as any).mockReturnValue({
            data: { matchesWithPoints: 0, totalPoints: 0 },
            loading: false,
            execute: vi.fn()
        });

        // Mock apiClient methods
        apiClient.sendVerificationEmail = vi.fn();
        apiClient.getPlayerScoring = vi.fn();
    });

    // Helper to render with Router (for Link components)
    const renderWithRouter = (ui: React.ReactElement) => {
        return render(<BrowserRouter>{ui}</BrowserRouter>);
    };

    it('renders user information correctly', () => {
        renderWithRouter(<Profile />);

        expect(screen.getByText('Test User')).toBeInTheDocument();
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
        expect(screen.getByText('user')).toBeInTheDocument();
        expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });

    it('shows "Not Signed In" state when no user', () => {
        (useAuth as any).mockReturnValue({
            user: null,
            isAdmin: false,
            logout: mockLogout
        });

        renderWithRouter(<Profile />);

        expect(screen.getByText('Not Signed In')).toBeInTheDocument();
        expect(screen.getByText('Sign In')).toBeInTheDocument();
    });

    it('displays email verification banner when email is NOT verified', () => {
        (useAuth as any).mockReturnValue({
            user: { ...mockUser, emailVerified: false },
            isAdmin: false,
            logout: mockLogout
        });

        renderWithRouter(<Profile />);

        expect(screen.getByText('Verify your email address')).toBeInTheDocument();
        expect(screen.getByText('Verify Now')).toBeInTheDocument();
    });

    it('does NOT display email verification banner when email IS verified', () => {
        renderWithRouter(<Profile />);

        expect(screen.queryByText('Verify your email address')).not.toBeInTheDocument();
    });

    it('calls sendVerificationEmail when "Verify Now" is clicked', async () => {
        (useAuth as any).mockReturnValue({
            user: { ...mockUser, emailVerified: false },
            isAdmin: false,
            logout: mockLogout
        });

        (apiClient.sendVerificationEmail as any).mockResolvedValue({ success: true });

        renderWithRouter(<Profile />);

        const verifyBtn = screen.getByText('Verify Now');
        fireEvent.click(verifyBtn);

        await waitFor(() => {
            expect(apiClient.sendVerificationEmail).toHaveBeenCalled();
            expect(screen.getByText('Sent')).toBeInTheDocument();
        });
    });

    it('opens Change Password modal when "Change" button is clicked', () => {
        renderWithRouter(<Profile />);

        // Find the "Change" button in the Account Settings section
        const changeBtn = screen.getByText('Change');
        fireEvent.click(changeBtn);

        expect(screen.getByTestId('change-password-modal')).toBeInTheDocument();
    });

    it('does not render "Notifications" section (feature flag check)', () => {
        renderWithRouter(<Profile />);

        expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
    });

    it('renders Admin Dashboard link for admin users', () => {
        (useAuth as any).mockReturnValue({
            user: { ...mockUser, roles: ['admin'] },
            isAdmin: true,
            logout: mockLogout
        });

        renderWithRouter(<Profile />);

        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });
});
