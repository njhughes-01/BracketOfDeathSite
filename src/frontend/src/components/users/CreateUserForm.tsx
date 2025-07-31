import React, { useState } from 'react';
import type { CreateUserInput } from '../../types/user';
import Card from '../ui/Card';
import LoadingSpinner from '../ui/LoadingSpinner';

interface CreateUserFormProps {
  onSubmit: (userData: CreateUserInput) => Promise<void>;
  loading?: boolean;
  onCancel?: () => void;
}

const CreateUserForm: React.FC<CreateUserFormProps> = ({
  onSubmit,
  loading = false,
  onCancel,
}) => {
  const [formData, setFormData] = useState<CreateUserInput>({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    temporary: true,
    roles: ['user'],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleRoleChange = (role: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      roles: checked
        ? [...(prev.roles || []), role]
        : (prev.roles || []).filter(r => r !== role),
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, underscores, and hyphens';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (formData.password && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!formData.roles || formData.roles.length === 0) {
      newErrors.roles = 'At least one role must be selected';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto" padding="lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Create New User</h2>
        <p className="mt-2 text-gray-600">
          Add a new user account to the system
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Username *
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                errors.username ? 'border-red-300' : ''
              }`}
              placeholder="Enter username"
              disabled={loading}
            />
            {errors.username && (
              <p className="mt-1 text-sm text-red-600">{errors.username}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                errors.email ? 'border-red-300' : ''
              }`}
              placeholder="Enter email address"
              disabled={loading}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
              First Name
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName || ''}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="Enter first name"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
              Last Name
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName || ''}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="Enter last name"
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Initial Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password || ''}
            onChange={handleChange}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              errors.password ? 'border-red-300' : ''
            }`}
            placeholder="Leave blank to generate a temporary password"
            disabled={loading}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            If no password is provided, a temporary password will be generated and the user will be required to change it on first login.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            User Roles *
          </label>
          <div className="space-y-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="role-user"
                checked={(formData.roles || []).includes('user')}
                onChange={(e) => handleRoleChange('user', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={loading}
              />
              <label htmlFor="role-user" className="ml-2 block text-sm text-gray-900">
                User
                <span className="block text-xs text-gray-500">Basic access to view tournaments and players</span>
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="role-admin"
                checked={(formData.roles || []).includes('admin')}
                onChange={(e) => handleRoleChange('admin', e.target.checked)}
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                disabled={loading}
              />
              <label htmlFor="role-admin" className="ml-2 block text-sm text-gray-900">
                Administrator
                <span className="block text-xs text-gray-500">Full access to manage tournaments, players, and users</span>
              </label>
            </div>
          </div>
          {errors.roles && (
            <p className="mt-1 text-sm text-red-600">{errors.roles}</p>
          )}
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="temporary"
            name="temporary"
            checked={formData.temporary || false}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            disabled={loading}
          />
          <label htmlFor="temporary" className="ml-2 block text-sm text-gray-900">
            Require password change on first login
          </label>
        </div>

        <div className="flex justify-end space-x-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={loading}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <LoadingSpinner size="sm" />
                <span>Creating...</span>
              </div>
            ) : (
              'Create User'
            )}
          </button>
        </div>
      </form>
    </Card>
  );
};

export default CreateUserForm;