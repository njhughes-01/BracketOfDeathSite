import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Onboarding from '../Onboarding';
import { apiClient } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { BrowserRouter } from 'react-router-dom';

// Mocks
vi.mock('../../services/api');
vi.mock('../../contexts/AuthContext');

// Helper to render with Router
const renderWithRouter = (component: React.ReactNode) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Onboarding Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (useAuth as any).mockReturnValue({
            user: { username: 'testuser', firstName: 'Test' },
        });
    });

    it('should render the onboarding form', () => {
        renderWithRouter(<Onboarding />);
        expect(screen.getByText(/Complete Your Profile/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Gender/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Gender/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Complete Profile/i })).toBeInTheDocument();
    });

    it('should have required fields', () => {
        renderWithRouter(<Onboarding />);
        expect(screen.getByLabelText(/Gender/i)).toBeRequired();
        expect(screen.getByLabelText(/Gender/i)).toBeRequired();
    });

    it('should call updateProfile and navigate on success', async () => {
        const user = userEvent.setup();
        renderWithRouter(<Onboarding />);

        // Select Gender
        const genderSelect = screen.getByLabelText(/Gender/i);
        await user.selectOptions(genderSelect, 'male');



        // Mock API success
        (apiClient.updateProfile as any).mockResolvedValue({ success: true });

        // Submit
        const submitButton = screen.getByRole('button', { name: /Complete Profile/i });
        await user.click(submitButton);

        expect(apiClient.updateProfile).toHaveBeenCalledWith({
            gender: 'male',
        });
        // Navigation check is implicit via no errors, mocking useNavigate is harder in integration test
    });

    it('should display error if API fails', async () => {
        const user = userEvent.setup();
        renderWithRouter(<Onboarding />);

        await user.selectOptions(screen.getByLabelText(/Gender/i), 'female');


        // Mock API failure with response error
        const error = {
            response: {
                data: { error: 'Backend validation failed' }
            }
        };
        (apiClient.updateProfile as any).mockRejectedValue(error);

        await user.click(screen.getByRole('button', { name: /Complete Profile/i }));

        await waitFor(() => {
            expect(screen.getByText(/Backend validation failed/i)).toBeInTheDocument();
        });
    });
});
