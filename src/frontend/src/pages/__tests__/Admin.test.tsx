import { render, screen, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Admin from '../Admin';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import apiClient from '../../services/api';

// Mock dependencies
vi.mock('../../contexts/AuthContext');
vi.mock('../../hooks/usePermissions');
vi.mock('../../services/api');

describe('Admin Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default: Authenticated Admin
    (useAuth as any).mockReturnValue({
      isAuthenticated: true,
      isAdmin: true,
    });

    // Default permissions (full access)
    (usePermissions as any).mockReturnValue({
      canViewAdmin: true,
      canCreateTournaments: true,
      canManageUsers: true,
    });

    // Mock API
    (apiClient.getTournaments as any).mockResolvedValue({
      data: [
        { id: '1', bodNumber: 100, date: '2025-01-01', location: 'Test', status: 'scheduled' }
      ]
    });
  });

  it('renders admin dashboard when permitted', async () => {
    render(
      <MemoryRouter>
        <Admin />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });
    expect(screen.getByText('Manage Players')).toBeInTheDocument();
  });

  it('renders access denied message when permission missing', async () => {
    (usePermissions as any).mockReturnValue({
      canViewAdmin: false,
      canCreateTournaments: false,
      canManageUsers: false,
    });

    render(
      <MemoryRouter>
        <Admin />
      </MemoryRouter>
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
  });

  it('hides "Start Setup" button if cannot create tournaments', async () => {
    (usePermissions as any).mockReturnValue({
      canViewAdmin: true,
      canCreateTournaments: false, // Denied
      canManageUsers: true,
    });

    render(
      <MemoryRouter>
        <Admin />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });

    // "New Tournament" card exists, but link shouldn't
    expect(screen.getByText('New Tournament')).toBeInTheDocument();
    expect(screen.queryByText('Start Setup')).not.toBeInTheDocument();
    
    // Scope assertion to the card
    const tournamentCard = screen.getByText('New Tournament').closest('.group') as HTMLElement;
    expect(within(tournamentCard).getByText('Permission Denied')).toBeInTheDocument();
  });

  it('hides "Manage Users" button if cannot manage users', async () => {
    (usePermissions as any).mockReturnValue({
      canViewAdmin: true,
      canCreateTournaments: true,
      canManageUsers: false, // Denied
    });

    render(
      <MemoryRouter>
        <Admin />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.queryByText('Manage Users')).not.toBeInTheDocument();
    
    // Scope assertion to the card
    const userManagementCard = screen.getByText('User Management').closest('.group') as HTMLElement;
    expect(within(userManagementCard).getByText('Permission Denied')).toBeInTheDocument();
  });
});