import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import type { User, CreateUserInput, UpdateUserInput, ResetPasswordInput } from '../types/user';
import apiClient from '../services/api';
import CreateUserForm from '../components/users/CreateUserForm';
import UserList from '../components/users/UserList';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const UserManagement: React.FC = () => {
  const { user } = useAuth();
  const { canManageUsers } = usePermissions();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    if (canManageUsers) {
      loadUsers();
    }
  }, [canManageUsers]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.getUsers();
      
      if (response.success && response.data) {
        setUsers(response.data);
      } else {
        setError(response.error || 'Failed to load users');
      }
    } catch (err: any) {
      console.error('Failed to load users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (userData: CreateUserInput) => {
    try {
      setLoading(true);
      const response = await apiClient.createUser(userData);
      
      if (response.success && response.data) {
        setUsers(prev => [...prev, response.data!]);
        setShowCreateForm(false);
        setError('');
      } else {
        setError(response.error || 'Failed to create user');
        throw new Error(response.error || 'Failed to create user');
      }
    } catch (err: any) {
      console.error('Failed to create user:', err);
      throw err; // Re-throw to let the form handle it
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userToDelete: User) => {
    if (!confirm(`Are you sure you want to delete user "${userToDelete.username}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.deleteUser(userToDelete.id);
      
      if (response.success) {
        setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
        setError('');
      } else {
        setError(response.error || 'Failed to delete user');
      }
    } catch (err: any) {
      console.error('Failed to delete user:', err);
      setError('Failed to delete user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (userToReset: User) => {
    const newPassword = prompt(`Enter new password for ${userToReset.username}:`);
    if (!newPassword) return;

    try {
      setLoading(true);
      const response = await apiClient.resetUserPassword(userToReset.id, {
        newPassword,
        temporary: true,
      });
      
      if (response.success) {
        alert(`Password reset successfully for ${userToReset.username}. The user will be required to change their password on next login.`);
        setError('');
      } else {
        setError(response.error || 'Failed to reset password');
      }
    } catch (err: any) {
      console.error('Failed to reset password:', err);
      setError('Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userToToggle: User) => {
    const newStatus = !userToToggle.enabled;
    const action = newStatus ? 'enable' : 'disable';
    
    if (!confirm(`Are you sure you want to ${action} user "${userToToggle.username}"?`)) {
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.updateUser(userToToggle.id, {
        enabled: newStatus,
      });
      
      if (response.success && response.data) {
        setUsers(prev => prev.map(u => u.id === userToToggle.id ? response.data! : u));
        setError('');
      } else {
        setError(response.error || `Failed to ${action} user`);
      }
    } catch (err: any) {
      console.error(`Failed to ${action} user:`, err);
      setError(`Failed to ${action} user. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdminRole = async (userToToggle: User) => {
    const willBeAdmin = !userToToggle.isAdmin;
    const action = willBeAdmin ? 'grant admin privileges to' : 'remove admin privileges from';
    
    // Prevent removing admin role from yourself
    if (!willBeAdmin && user?.id === userToToggle.id) {
      setError('You cannot remove admin privileges from your own account.');
      return;
    }

    // Check if this is the last admin user
    if (!willBeAdmin) {
      const adminUsers = users.filter(u => u.isAdmin && u.id !== userToToggle.id);
      if (adminUsers.length === 0) {
        setError('Cannot remove admin privileges - there must be at least one admin user.');
        return;
      }
    }
    
    if (!confirm(`Are you sure you want to ${action} "${userToToggle.username}"?`)) {
      return;
    }

    try {
      setLoading(true);
      const newRoles = willBeAdmin ? ['admin', 'user'] : ['user'];
      const response = await apiClient.updateUserRoles(userToToggle.id, newRoles);
      
      if (response.success) {
        // Refresh the user list to get updated roles
        await loadUsers();
        setError('');
      } else {
        setError(response.error || `Failed to ${action} user`);
      }
    } catch (err: any) {
      console.error(`Failed to ${action} user:`, err);
      setError(`Failed to ${action} user. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  if (!canManageUsers) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to manage users.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="mt-2 text-gray-600">
            Manage user accounts and permissions
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {showCreateForm ? 'Cancel' : 'Create User'}
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {showCreateForm && (
        <div className="mb-8">
          <CreateUserForm
            onSubmit={handleCreateUser}
            loading={loading}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      )}

      <UserList
        users={users}
        loading={loading}
        onDeleteUser={handleDeleteUser}
        onResetPassword={handleResetPassword}
        onToggleStatus={handleToggleStatus}
        onToggleAdminRole={handleToggleAdminRole}
      />

      {user && (
        <div className="mt-8">
          <Card padding="lg">
            <h2 className="text-xl font-semibold mb-4">Current User Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Username</dt>
                <dd className="mt-1 text-sm text-gray-900">{user.username}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{user.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Roles</dt>
                <dd className="mt-1">
                  {user.roles.map((role) => (
                    <span
                      key={role}
                      className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-2"
                    >
                      {role}
                    </span>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Admin Status</dt>
                <dd className="mt-1">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.isAdmin
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {user.isAdmin ? 'Administrator' : 'Regular User'}
                  </span>
                </dd>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default UserManagement;