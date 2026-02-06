import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import ProfileEditForm from '../ProfileEditForm';
import { apiClient } from '../../../services/api';

// Mock the API client
vi.mock('../../../services/api', () => ({
  apiClient: {
    updateProfile: vi.fn()
  }
}));

const mockUser = {
  id: 'user123',
  email: 'test@example.com',
  username: 'testuser',
  firstName: 'John',
  lastName: 'Doe',
  fullName: 'John Doe',
  roles: ['user'],
  isAdmin: false,
  isSuperAdmin: false
};

describe('ProfileEditForm', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with current user data', () => {
    render(
      <ProfileEditForm 
        user={mockUser} 
        onSave={mockOnSave} 
        onCancel={mockOnCancel} 
      />
    );

    expect(screen.getByLabelText(/first name/i)).toHaveValue('John');
    expect(screen.getByLabelText(/last name/i)).toHaveValue('Doe');
  });

  it('allows editing first name', async () => {
    render(
      <ProfileEditForm 
        user={mockUser} 
        onSave={mockOnSave} 
        onCancel={mockOnCancel} 
      />
    );

    const firstNameInput = screen.getByLabelText(/first name/i);
    await userEvent.clear(firstNameInput);
    await userEvent.type(firstNameInput, 'Jane');

    expect(firstNameInput).toHaveValue('Jane');
  });

  it('allows editing last name', async () => {
    render(
      <ProfileEditForm 
        user={mockUser} 
        onSave={mockOnSave} 
        onCancel={mockOnCancel} 
      />
    );

    const lastNameInput = screen.getByLabelText(/last name/i);
    await userEvent.clear(lastNameInput);
    await userEvent.type(lastNameInput, 'Smith');

    expect(lastNameInput).toHaveValue('Smith');
  });

  it('calls onCancel when cancel button is clicked', async () => {
    render(
      <ProfileEditForm 
        user={mockUser} 
        onSave={mockOnSave} 
        onCancel={mockOnCancel} 
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await userEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('submits updated data when save button is clicked', async () => {
    (apiClient.updateProfile as Mock).mockResolvedValue({ success: true });

    render(
      <ProfileEditForm 
        user={mockUser} 
        onSave={mockOnSave} 
        onCancel={mockOnCancel} 
      />
    );

    const firstNameInput = screen.getByLabelText(/first name/i);
    await userEvent.clear(firstNameInput);
    await userEvent.type(firstNameInput, 'Jane');

    const saveButton = screen.getByRole('button', { name: /save/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(apiClient.updateProfile).toHaveBeenCalledWith({
        firstName: 'Jane',
        lastName: 'Doe'
      });
    });
  });

  it('calls onSave after successful submission', async () => {
    (apiClient.updateProfile as Mock).mockResolvedValue({ success: true });

    render(
      <ProfileEditForm 
        user={mockUser} 
        onSave={mockOnSave} 
        onCancel={mockOnCancel} 
      />
    );

    const saveButton = screen.getByRole('button', { name: /save/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });
  });

  it('shows error message on API failure', async () => {
    (apiClient.updateProfile as Mock).mockRejectedValue(new Error('Update failed'));

    render(
      <ProfileEditForm 
        user={mockUser} 
        onSave={mockOnSave} 
        onCancel={mockOnCancel} 
      />
    );

    const saveButton = screen.getByRole('button', { name: /save/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/failed to update/i)).toBeInTheDocument();
    });
  });

  it('disables save button while submitting', async () => {
    (apiClient.updateProfile as Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
    );

    render(
      <ProfileEditForm 
        user={mockUser} 
        onSave={mockOnSave} 
        onCancel={mockOnCancel} 
      />
    );

    const saveButton = screen.getByRole('button', { name: /save/i });
    await userEvent.click(saveButton);

    expect(saveButton).toBeDisabled();
  });

  it('validates that first name is not empty', async () => {
    render(
      <ProfileEditForm 
        user={mockUser} 
        onSave={mockOnSave} 
        onCancel={mockOnCancel} 
      />
    );

    const firstNameInput = screen.getByLabelText(/first name/i);
    await userEvent.clear(firstNameInput);

    const saveButton = screen.getByRole('button', { name: /save/i });
    await userEvent.click(saveButton);

    expect(apiClient.updateProfile).not.toHaveBeenCalled();
  });
});
