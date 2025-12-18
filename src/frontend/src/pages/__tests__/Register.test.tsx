import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import Register from '../Register';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

// Mock AuthContext - completely to avoid side effects from api.ts
const mockUseAuth = {
    isAuthenticated: false,
    login: vi.fn(),
};
vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => mockUseAuth,
    AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

describe('Register Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseAuth.isAuthenticated = false;
    });

    it('renders registration form', async () => {
        render(
            <BrowserRouter>
                <Register />
            </BrowserRouter>
        );

        expect(screen.getByPlaceholderText('jdoe')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
    });

    it('validates password match', async () => {
        const user = userEvent.setup();
        render(
            <BrowserRouter>
                <Register />
            </BrowserRouter>
        );

        await user.type(screen.getByPlaceholderText('jdoe'), 'testuser');
        await user.type(screen.getByPlaceholderText('john@example.com'), 'test@example.com');
        await user.type(screen.getAllByPlaceholderText('••••••••')[0], 'password123');
        await user.type(screen.getAllByPlaceholderText('••••••••')[1], 'mismatch');

        await user.click(screen.getByRole('button', { name: /sign up/i }));

        expect(await screen.findByText(/Passwords don't match/i)).toBeInTheDocument();
        expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('submits form successfully', async () => {
        const user = userEvent.setup();
        mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });

        render(
            <BrowserRouter>
                <Register />
            </BrowserRouter>
        );

        await user.type(screen.getByPlaceholderText('jdoe'), 'testuser');
        await user.type(screen.getByPlaceholderText('john@example.com'), 'test@example.com');
        await user.type(screen.getAllByPlaceholderText('••••••••')[0], 'password123');
        await user.type(screen.getAllByPlaceholderText('••••••••')[1], 'password123');

        await user.click(screen.getByRole('button', { name: /sign up/i }));

        await waitFor(() => {
            expect(mockedAxios.post).toHaveBeenCalledWith('/api/auth/register', {
                username: 'testuser',
                email: 'test@example.com',
                firstName: '',
                lastName: '',
                password: 'password123',
            });
            expect(mockNavigate).toHaveBeenCalledWith('/login', expect.objectContaining({ state: { message: 'Registration successful! Please log in.' } }));
        });
    });

    it('displays error message on registration failure', async () => {
        const user = userEvent.setup();
        mockedAxios.post.mockRejectedValueOnce({
            response: { data: { error: 'Username taken' } }
        });

        render(
            <BrowserRouter>
                <Register />
            </BrowserRouter>
        );

        await user.type(screen.getByPlaceholderText('jdoe'), 'testuser');
        await user.type(screen.getByPlaceholderText('john@example.com'), 'test@example.com');
        await user.type(screen.getAllByPlaceholderText('••••••••')[0], 'password123');
        await user.type(screen.getAllByPlaceholderText('••••••••')[1], 'password123');

        await user.click(screen.getByRole('button', { name: /sign up/i }));

        expect(await screen.findByText(/Username taken/i)).toBeInTheDocument();
    });
});
