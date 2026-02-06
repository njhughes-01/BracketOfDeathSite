import logger from "../../utils/logger";
import React, { useState } from "react";
import type { CreateUserInput } from "../../types/user";
import { useAuth } from "../../contexts/AuthContext";
import LoadingSpinner from "../ui/LoadingSpinner";

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
  const { user } = useAuth();
  const isSuperAdmin = user?.isSuperAdmin || false;
  const [formData, setFormData] = useState<CreateUserInput>({
    username: "",
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    temporary: true,
    roles: ["user"],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleRoleChange = (role: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      roles: checked
        ? [...(prev.roles || []), role]
        : (prev.roles || []).filter((r) => r !== role),
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
      newErrors.username =
        "Username can only contain letters, numbers, underscores, and hyphens";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (formData.password && formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (!formData.roles || formData.roles.length === 0) {
      newErrors.roles = "At least one role must be selected";
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
      logger.error("Failed to create user:", error);
    }
  };

  return (
    <div className="bg-[#1c2230] rounded-2xl border border-white/5 p-6 max-w-2xl mx-auto shadow-2xl relative overflow-hidden">
      {/* Glow effect */}
      <div className="absolute top-0 right-0 p-32 bg-primary/5 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="relative mb-6">
        <h2 className="text-2xl font-bold text-white">Create New User</h2>
        <p className="mt-1 text-slate-400 text-sm">
          Add a new user account to the system
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="username"
              className="block text-xs font-bold text-slate-500 uppercase mb-1"
            >
              Username *
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className={`w-full bg-background-dark border ${errors.username ? "border-red-500" : "border-white/10"} rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors`}
              placeholder="e.g. jdoe_99"
              disabled={loading}
            />
            {errors.username && (
              <p className="mt-1 text-xs text-red-500 font-bold">
                {errors.username}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-xs font-bold text-slate-500 uppercase mb-1"
            >
              Email *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full bg-background-dark border ${errors.email ? "border-red-500" : "border-white/10"} rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors`}
              placeholder="e.g. john@example.com"
              disabled={loading}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500 font-bold">
                {errors.email}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="firstName"
              className="block text-xs font-bold text-slate-500 uppercase mb-1"
            >
              First Name
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName || ""}
              onChange={handleChange}
              className="w-full bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
              placeholder="Enter first name"
              disabled={loading}
            />
          </div>

          <div>
            <label
              htmlFor="lastName"
              className="block text-xs font-bold text-slate-500 uppercase mb-1"
            >
              Last Name
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName || ""}
              onChange={handleChange}
              className="w-full bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
              placeholder="Enter last name"
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-bold text-slate-500 uppercase mb-1"
          >
            Initial Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password || ""}
            onChange={handleChange}
            className={`w-full bg-background-dark border ${errors.password ? "border-red-500" : "border-white/10"} rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors`}
            placeholder="Min 8 chars (Leave blank to auto-generate)"
            disabled={loading}
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-500 font-bold">
              {errors.password}
            </p>
          )}
          <p className="mt-1 text-[10px] text-slate-500">
            If left blank, the system will generate a temporary password.
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-3">
            Roles & Access *
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label
              className={`flex items-start p-3 rounded-xl border cursor-pointer transition-all ${
                (formData.roles || []).includes("user")
                  ? "bg-primary/10 border-primary"
                  : "bg-background-dark border-white/5 hover:bg-white/5"
              }`}
            >
              <input
                type="checkbox"
                checked={(formData.roles || []).includes("user")}
                onChange={(e) => handleRoleChange("user", e.target.checked)}
                className="mt-1 size-4 rounded border-slate-600 bg-transparent text-primary focus:ring-primary"
                disabled={loading}
              />
              <div className="ml-3">
                <span className="block text-sm font-bold text-white">
                  Standard User
                </span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  Can view tournaments, results, and player profiles.
                </span>
              </div>
            </label>

            <label
              className={`flex items-start p-3 rounded-xl border cursor-pointer transition-all ${
                (formData.roles || []).includes("admin")
                  ? "bg-red-500/10 border-red-500"
                  : "bg-background-dark border-white/5 hover:bg-white/5"
              }`}
            >
              <input
                type="checkbox"
                checked={(formData.roles || []).includes("admin")}
                onChange={(e) => handleRoleChange("admin", e.target.checked)}
                className="mt-1 size-4 rounded border-slate-600 bg-transparent text-red-500 focus:ring-red-500"
                disabled={loading}
              />
              <div className="ml-3">
                <span className="block text-sm font-bold text-white">
                  Administrator
                </span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  Full access to manage system configuration and users.
                </span>
              </div>
            </label>

            {/* Super Admin Role - Only visible to super admins */}
            {isSuperAdmin && (
              <label
                className={`flex items-start p-3 rounded-xl border cursor-pointer transition-all ${
                  (formData.roles || []).includes("superadmin")
                    ? "bg-yellow-500/10 border-yellow-500"
                    : "bg-background-dark border-white/5 hover:bg-white/5"
                }`}
              >
                <input
                  type="checkbox"
                  checked={(formData.roles || []).includes("superadmin")}
                  onChange={(e) =>
                    handleRoleChange("superadmin", e.target.checked)
                  }
                  className="mt-1 size-4 rounded border-slate-600 bg-transparent text-yellow-500 focus:ring-yellow-500"
                  disabled={loading}
                />
                <div className="ml-3">
                  <span className="block text-sm font-bold text-white">
                    Super Admin
                  </span>
                  <span className="block text-xs text-slate-500 mt-0.5">
                    Complete control including managing other admins.
                  </span>
                </div>
              </label>
            )}
          </div>
          {errors.roles && (
            <p className="mt-2 text-xs text-red-500 font-bold">
              {errors.roles}
            </p>
          )}
        </div>

        <div className="flex items-center p-3 bg-white/5 rounded-xl border border-white/5">
          <input
            type="checkbox"
            id="temporary"
            name="temporary"
            checked={formData.temporary || false}
            onChange={handleChange}
            className="size-4 rounded border-slate-600 bg-transparent text-primary focus:ring-primary"
            disabled={loading}
          />
          <label
            htmlFor="temporary"
            className="ml-3 block text-sm font-bold text-slate-300"
          >
            Require password change on first login
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2.5 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-all"
              disabled={loading}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="px-8 py-2.5 rounded-xl bg-primary text-black font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <LoadingSpinner size="sm" />
                <span>Creating...</span>
              </div>
            ) : (
              "Create User"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateUserForm;
