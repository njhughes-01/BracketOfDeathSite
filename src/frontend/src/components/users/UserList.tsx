import React, { useState } from "react";
import type { User } from "../../types/user";
import LoadingSpinner from "../ui/LoadingSpinner";

interface UserListProps {
  users: User[];
  loading?: boolean;
  onSelectUser: (user: User) => void;
}

const UserList: React.FC<UserListProps> = ({
  users,
  loading = false,
  onSelectUser,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.fullName &&
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole = !roleFilter || user.roles.includes(roleFilter);

    return matchesSearch && matchesRole;
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "superadmin":
        return "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30";
      case "admin":
        return "bg-red-500/20 text-red-400 border border-red-500/30";
      case "user":
        return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
      default:
        return "bg-slate-500/20 text-slate-400 border border-slate-500/30";
    }
  };

  if (loading) {
    return (
      <div className="bg-[#1c2230] rounded-2xl p-8 border border-white/5 flex items-center justify-center">
        <LoadingSpinner />
        <span className="ml-3 text-slate-500 font-bold">Loading users...</span>
      </div>
    );
  }

  return (
    <div className="bg-[#1c2230] rounded-2xl border border-white/5 overflow-hidden">
      <div className="p-6 border-b border-white/5">
        <h2 className="text-xl font-bold text-white mb-4">
          Users{" "}
          <span className="ml-2 text-sm text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
            {filteredUsers.length}
          </span>
        </h2>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 material-symbols-outlined text-[20px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search by name, email, username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full rounded-xl border border-white/10 bg-background-dark py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm outline-none transition-colors"
            />
          </div>
          <div className="relative min-w-[150px]">
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 material-symbols-outlined text-[20px] pointer-events-none">
              expand_more
            </span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="block w-full rounded-xl border border-white/10 bg-background-dark py-3 pl-4 pr-10 text-white focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm outline-none appearance-none transition-colors"
            >
              <option value="">All Roles</option>
              <option value="superadmin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
          </div>
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="text-center py-12 px-6">
          <div className="size-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-slate-600 text-3xl">
              group_off
            </span>
          </div>
          <p className="text-white font-bold mb-1">No users found</p>
          <p className="text-slate-500 text-sm">
            {users.length === 0
              ? "The user database is empty."
              : "No users match your current filters."}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3 p-4">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                onClick={() => onSelectUser(user)}
                className="bg-background-dark border border-white/10 rounded-xl p-4 active:scale-[0.98] transition-all cursor-pointer hover:border-white/20"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 border border-white/10 flex items-center justify-center text-white font-bold text-sm">
                      {(user.fullName || user.username).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">
                        {user.fullName || user.username}
                      </div>
                      <div className="text-xs text-slate-500">
                        @{user.username}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${user.enabled ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${user.enabled ? "bg-green-500" : "bg-red-500"}`}
                    ></span>
                    {user.enabled ? "Active" : "Disabled"}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mb-3">{user.email}</div>
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {user.roles.map((role) => (
                      <span
                        key={role}
                        className={`inline-flex px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${getRoleBadgeColor(role)}`}
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                  <button className="text-xs font-bold text-primary flex items-center gap-1">
                    Manage
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-white/5">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Roles
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-[#1c2230]">
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => onSelectUser(user)}
                    className="hover:bg-white/[0.02] transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="size-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 border border-white/10 flex items-center justify-center text-white font-bold text-sm shadow-lg group-hover:scale-105 transition-transform">
                          {(user.fullName || user.username)
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-white group-hover:text-primary transition-colors">
                            {user.fullName || user.username}
                          </div>
                          <div className="text-xs text-slate-500 font-mono">
                            @{user.username}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-300">{user.email}</div>
                      {user.emailVerified ? (
                        <div className="text-[10px] text-green-500 font-bold mt-0.5 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">
                            verified
                          </span>{" "}
                          Verified
                        </div>
                      ) : (
                        <div className="text-[10px] text-yellow-500 font-bold mt-0.5 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">
                            warning
                          </span>{" "}
                          Unverified
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((role) => (
                          <span
                            key={role}
                            className={`inline-flex px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${getRoleBadgeColor(role)}`}
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full ${user.enabled
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : "bg-red-500/20 text-red-400 border border-red-500/30"
                          }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${user.enabled ? "bg-green-500" : "bg-red-500"}`}
                        ></span>
                        {user.enabled ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                      <button className="text-xs font-bold text-slate-400 group-hover:text-white bg-white/5 group-hover:bg-white/10 px-3 py-1.5 rounded-lg transition-all">
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="p-4 border-t border-white/5 bg-white/[0.02] text-xs font-bold text-slate-500 text-center">
        Showing {filteredUsers.length} of {users.length} users
      </div>
    </div>
  );
};

export default UserList;

