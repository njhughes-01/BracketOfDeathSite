import React, { useState } from "react";
import apiClient from "../../services/api";
import LoadingSpinner from "../ui/LoadingSpinner";

interface ChangePasswordModalProps {
  onClose: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  onClose,
}) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }

    try {
      setLoading(true);
      const res = await apiClient.changePassword({
        currentPassword,
        newPassword,
      });
      // Check if res.success is true, or if it throws on error
      // The apiClient.post usually returns data, but Axios throws on 4xx/5xx if interceptors don't catch it fully or rethrow
      // Our interceptor rethrows.
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error("Change password failed:", err);
      // Error response is usually in err.response.data.error
      const errorMsg =
        err.response?.data?.error ||
        "Failed to update password. Please check your current password.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
        <div className="bg-[#1c2230] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col items-center text-center">
          <div className="size-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4 text-green-500">
            <span className="material-symbols-outlined text-3xl">
              check_circle
            </span>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            Password Updated
          </h3>
          <p className="text-slate-400">
            Your password has been changed successfully.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#1c2230] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">
            lock_reset
          </span>
          Change Password
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg flex items-start gap-2">
            <span className="material-symbols-outlined text-base mt-0.5">
              error
            </span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="currentPassword"
              className="text-sm font-bold text-slate-400 ml-1"
            >
              CURRENT PASSWORD
            </label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl h-11 px-4 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="newPassword"
              className="text-sm font-bold text-slate-400 ml-1"
            >
              NEW PASSWORD
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl h-11 px-4 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              required
              minLength={8}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="confirmPassword"
              className="text-sm font-bold text-slate-400 ml-1"
            >
              CONFIRM NEW PASSWORD
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl h-11 px-4 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              required
              minLength={8}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-primary hover:bg-primary-dark text-black font-bold rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <LoadingSpinner size="sm" color="black" />
              ) : (
                "Update Password"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
