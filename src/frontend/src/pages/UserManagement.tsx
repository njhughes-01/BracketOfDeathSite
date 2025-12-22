import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import type { User, CreateUserInput } from "../types/user";
import apiClient from "../services/api";
import CreateUserForm from "../components/users/CreateUserForm";
import UserList from "../components/users/UserList";
import UserDetailModal from "../components/users/UserDetailModal";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ClaimUserModal from "../components/users/ClaimUserModal";

const UserManagement: React.FC = () => {
  const { user } = useAuth();
  const { canManageUsers } = usePermissions();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    if (canManageUsers) {
      loadUsers();
    }
  }, [canManageUsers]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await apiClient.getUsers();

      if (response.success && response.data) {
        setUsers(response.data);
      } else {
        setError(response.error || "Failed to load users");
      }
    } catch (err: any) {
      console.error("Failed to load users:", err);
      setError("Failed to load users. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (userData: CreateUserInput) => {
    try {
      setLoading(true);
      const response = await apiClient.createUser(userData);

      if (response.success && response.data) {
        setUsers((prev) => [...prev, response.data!]);
        setShowCreateForm(false);
        setError("");
      } else {
        setError(response.error || "Failed to create user");
        throw new Error(response.error || "Failed to create user");
      }
    } catch (err: any) {
      console.error("Failed to create user:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userToDelete: User) => {
    if (
      !confirm(
        `Are you sure you want to delete user "${userToDelete.username}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.deleteUser(userToDelete.id);

      if (response.success) {
        setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
        setSelectedUser(null);
        setError("");
      } else {
        setError(response.error || "Failed to delete user");
      }
    } catch (err: any) {
      console.error("Failed to delete user:", err);
      setError("Failed to delete user. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (userToReset: User) => {
    const newPassword = prompt(
      `Enter new password for ${userToReset.username}:`,
    );
    if (!newPassword) return;

    try {
      setLoading(true);
      const response = await apiClient.resetUserPassword(userToReset.id, {
        newPassword,
        temporary: true,
      });

      if (response.success) {
        alert(
          `Password reset successfully for ${userToReset.username}. The user will be required to change their password on next login.`,
        );
        setError("");
      } else {
        setError(response.error || "Failed to reset password");
      }
    } catch (err: any) {
      console.error("Failed to reset password:", err);
      setError("Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userToToggle: User) => {
    const newStatus = !userToToggle.enabled;
    const action = newStatus ? "enable" : "disable";

    if (
      !confirm(
        `Are you sure you want to ${action} user "${userToToggle.username}"?`,
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.updateUser(userToToggle.id, {
        enabled: newStatus,
      });

      if (response.success && response.data) {
        const updatedUser = response.data!;
        setUsers((prev) =>
          prev.map((u) => (u.id === userToToggle.id ? updatedUser : u)),
        );
        // Update selected user if it's the same one
        if (selectedUser?.id === userToToggle.id) {
          setSelectedUser(updatedUser);
        }
        setError("");
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
    const action = willBeAdmin
      ? "grant admin privileges to"
      : "remove admin privileges from";

    // Prevent removing admin role from yourself
    if (!willBeAdmin && user?.id === userToToggle.id) {
      setError("You cannot remove admin privileges from your own account.");
      return;
    }

    // Check if this is the last admin user
    if (!willBeAdmin) {
      const adminUsers = users.filter(
        (u) => u.isAdmin && u.id !== userToToggle.id,
      );
      if (adminUsers.length === 0) {
        setError(
          "Cannot remove admin privileges - there must be at least one admin user.",
        );
        return;
      }
    }

    if (
      !confirm(`Are you sure you want to ${action} "${userToToggle.username}"?`)
    ) {
      return;
    }

    try {
      setLoading(true);
      const newRoles = willBeAdmin ? ["admin", "user"] : ["user"];
      const response = await apiClient.updateUserRoles(
        userToToggle.id,
        newRoles,
      );

      if (response.success) {
        // Refresh the user list to get updated roles
        await loadUsers();
        // Close modal or update it - we'll re-fetch which updates 'users'
        // But we need to update 'selectedUser' too from the new list
        // Since loadUsers is async state update, we might just clear selection or rely on effect?
        // Simpler: just clear selection or re-find in new list.
        // For smoother UX, let's keep modal open if possible, but loadUsers sets users async.
        // Let's just create a quick updated object for the modal
        const updatedUser = { ...userToToggle, roles: newRoles, isAdmin: willBeAdmin };
        setSelectedUser(updatedUser);

        setError("");
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

  const handleToggleSuperAdminRole = async (userToToggle: User) => {
    const willBeSuperAdmin = !userToToggle.isSuperAdmin;
    const action = willBeSuperAdmin
      ? "grant super admin privileges to"
      : "remove super admin privileges from";

    // Prevent removing superadmin role from yourself
    if (!willBeSuperAdmin && user?.id === userToToggle.id) {
      setError(
        "You cannot remove super admin privileges from your own account.",
      );
      return;
    }

    // Check if this is the last superadmin user
    if (!willBeSuperAdmin) {
      const superAdminUsers = users.filter(
        (u) => u.isSuperAdmin && u.id !== userToToggle.id,
      );
      if (superAdminUsers.length === 0) {
        setError(
          "Cannot remove super admin privileges - there must be at least one super admin user.",
        );
        return;
      }
    }

    if (
      !confirm(`Are you sure you want to ${action} "${userToToggle.username}"?`)
    ) {
      return;
    }

    try {
      setLoading(true);
      const newRoles = willBeSuperAdmin
        ? ["superadmin", "admin", "user"]
        : userToToggle.isAdmin
          ? ["admin", "user"]
          : ["user"];
      const response = await apiClient.updateUserRoles(
        userToToggle.id,
        newRoles,
      );

      if (response.success) {
        // Refresh the user list to get updated roles
        await loadUsers();
        const updatedUser = { ...userToToggle, roles: newRoles, isSuperAdmin: willBeSuperAdmin };
        setSelectedUser(updatedUser);
        setError("");
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

  const handleUpdateUser = async (userToUpdate: User, data: { firstName: string; lastName: string; email: string; gender: string }) => {
    try {
      setLoading(true);
      const response = await apiClient.updateUser(userToUpdate.id, data);

      if (response.success && response.data) {
        const updatedUser = response.data!;
        setUsers((prev) =>
          prev.map((u) => (u.id === userToUpdate.id ? updatedUser : u)),
        );
        setSelectedUser(updatedUser);
        setError("");
      } else {
        setError(response.error || "Failed to update user");
      }
    } catch (err: any) {
      console.error("Failed to update user:", err);
      setError("Failed to update user. Please try again.");
      throw err; // Re-throw so modal knows it failed
    } finally {
      setLoading(false);
    }
  };


  if (!canManageUsers) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background-dark p-4">
        <span className="material-symbols-outlined text-red-500 text-5xl mb-4">
          lock
        </span>
        <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-slate-400">
          You don't have permission to manage users.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark pb-20">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              User Management
            </h1>
            <p className="text-slate-400 mt-1">
              Manage system access, roles, and user accounts
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${showCreateForm
              ? "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20"
              : "bg-primary text-black hover:bg-white hover:scale-105 shadow-lg shadow-primary/20"
              }`}
          >
            {showCreateForm ? (
              <>
                <span className="material-symbols-outlined">close</span> Cancel
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">person_add</span>{" "}
                Create User
              </>
            )}
          </button>

          <button
            onClick={() => setShowClaimModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 ml-2"
          >
            <span className="material-symbols-outlined">mark_email_unread</span>{" "}
            Invite User
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <span className="material-symbols-outlined text-red-500">
              error
            </span>
            <p className="text-red-400 text-sm font-bold">{error}</p>
          </div>
        )}

        <div
          className={`transition-all duration-300 ${showCreateForm ? "opacity-100 max-h-[1000px] mb-8" : "opacity-0 max-h-0 overflow-hidden"}`}
        >
          <CreateUserForm
            onSubmit={handleCreateUser}
            loading={loading}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>

        <UserList
          users={users}
          loading={loading}
          onSelectUser={setSelectedUser}
        />
      </div>

      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onDeleteUser={handleDeleteUser}
          onResetPassword={handleResetPassword}
          onToggleStatus={handleToggleStatus}
          onToggleAdminRole={handleToggleAdminRole}
          onToggleSuperAdminRole={handleToggleSuperAdminRole}
          onUpdateUser={handleUpdateUser}
        />

      )}

      {showClaimModal && (
        <ClaimUserModal
          onClose={() => setShowClaimModal(false)}
          onSuccess={() => {
            // Optional: refresh users if we want to show pending claims?
            // Currently claim just sends email, they aren't users yet.
          }}
        />
      )}
    </div>
  );
};

export default UserManagement;

