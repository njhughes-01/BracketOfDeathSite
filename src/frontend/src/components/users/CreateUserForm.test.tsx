
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import CreateUserForm from './CreateUserForm';
import { AuthProvider } from '../../contexts/AuthContext';
import * as AuthContext from '../../contexts/AuthContext';

// Mock the AuthContext
const mockUseAuth = vi.fn();

// Mock the useAuth hook
vi.mock('../../contexts/AuthContext', async () => {
    const actual = await vi.importActual('../../contexts/AuthContext');
    return {
        ...actual,
        useAuth: () => mockUseAuth(),
    };
});

describe('CreateUserForm', () => {
    const mockOnSubmit = vi.fn();
    const mockOnCancel = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should NOT show Super Admin checkbox for regular admin', () => {
        mockUseAuth.mockReturnValue({
            user: { isSuperAdmin: false },
        });

        render(
            <CreateUserForm
                onSubmit={mockOnSubmit}
                onCancel={mockOnCancel}
            />
        );

        // Check for Administrator checkbox (should exist)
        expect(screen.getByText('Administrator')).toBeInTheDocument();

        // Check for Super Admin checkbox (should NOT exist)
        expect(screen.queryByText('Super Admin')).not.toBeInTheDocument();
    });

    it('should show Super Admin checkbox for super admin', () => {
        mockUseAuth.mockReturnValue({
            user: { isSuperAdmin: true },
        });

        render(
            <CreateUserForm
                onSubmit={mockOnSubmit}
                onCancel={mockOnCancel}
            />
        );

        // Check for Administrator checkbox (should exist)
        expect(screen.getByText('Administrator')).toBeInTheDocument();

        // Check for Super Admin checkbox (should exist)
        expect(screen.getByText('Super Admin')).toBeInTheDocument();
    });
});
