import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import UserManagement from '../UserManagement';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import apiClient from '../../services/api';

// Mock dependencies
vi.mock('../../contexts/AuthContext');
vi.mock('../../hooks/usePermissions');
vi.mock('../../services/api');

// Mock child components
vi.mock('../../components/users/CreateUserForm', () => ({
    default: ({ onCancel }: any) => <div data-testid="create-user-form"><button onClick={onCancel}>Cancel</button></div>
}));
vi.mock('../../components/users/UserList', () => ({
    default: ({ users, onDeleteUser }: any) => (
        <div data-testid="user-list">
            {users.map((u: any) => (
                <div key={u.id} data-testid={`user-${u.id}`}>
                    {u.username}
                    <button onClick={() => onDeleteUser(u)}>Delete</button>
                </div>
            ))}
        </div>
    )
}));
vi.mock('../../components/ui/LoadingSpinner', () => ({
    default: () => <div data-testid="loading">Loading...</div>
}));

describe('UserManagement Page', () => {
    const mockUsers = [
        { id: '1', username: 'admin', roles: ['admin'] },
        { id: '2', username: 'user1', roles: ['user'] }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        (useAuth as any).mockReturnValue({ user: { id: '1' } });
        (usePermissions as any).mockReturnValue({ canManageUsers: true });
        (apiClient.getUsers as any).mockResolvedValue({ success: true, data: mockUsers });
        (apiClient.deleteUser as any).mockResolvedValue({ success: true });
    });

    it('renders user list', async () => {
        render(
            <MemoryRouter>
                <UserManagement />
            </MemoryRouter>
        );

        expect(await screen.findByTestId('user-list')).toBeInTheDocument();
        expect(screen.getByText('admin')).toBeInTheDocument();
        expect(screen.getByText('user1')).toBeInTheDocument();
    });

    it('shows access denied if no permissions', () => {
        (usePermissions as any).mockReturnValue({ canManageUsers: false });

        render(
            <MemoryRouter>
                <UserManagement />
            </MemoryRouter>
        );

        expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });

    it('opens create user form', async () => {
        render(
            <MemoryRouter>
                <UserManagement />
            </MemoryRouter>
        );

        await screen.findByTestId('user-list');

        const createBtn = screen.getByText('Create User');
        fireEvent.click(createBtn);

        expect(screen.getByTestId('create-user-form')).toBeInTheDocument();
    });

    it('handles delete user', async () => {
        // Mock confirm
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

        render(
            <MemoryRouter>
                <UserManagement />
            </MemoryRouter>
        );

        await screen.findByTestId('user-list');

        const deleteBtns = screen.getAllByText('Delete');
        fireEvent.click(deleteBtns[1]); // Delete user1

        expect(confirmSpy).toHaveBeenCalled();
        await waitFor(() => {
            expect(apiClient.deleteUser).toHaveBeenCalledWith('2');
        });
    });
});
