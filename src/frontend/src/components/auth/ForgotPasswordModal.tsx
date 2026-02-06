import logger from "../../utils/logger";
import React, { useState } from "react";
import apiClient from "../../services/api";
import LoadingSpinner from "../ui/LoadingSpinner";

interface ForgotPasswordModalProps {
  onClose: () => void;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  onClose,
}) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      setLoading(true);
      setError("");

      const res = await apiClient.requestPasswordReset(email);

      // We always show success to prevent enumeration, unless there's a network error
      setSuccess(true);
    } catch (err: any) {
      logger.error(err);
      setError("Failed to process request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
        <div className="bg-[#1c2230] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-blue-500 text-3xl">
                mail
              </span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Check your email
            </h3>
            <p className="text-slate-400 mb-6">
              If an account exists for <strong>{email}</strong>, you will
              receive password reset instructions.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-primary text-black font-bold rounded-xl hover:bg-white transition-all"
            >
              Return to Login
            </button>
          </div>
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

        <h2 className="text-2xl font-bold text-white mb-1">Reset Password</h2>
        <p className="text-slate-400 mb-6 text-sm">
          Enter your email to receive reset instructions.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg flex items-start gap-2">
            <span className="material-symbols-outlined text-base mt-0.5">
              error
            </span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-slate-400 ml-1">
              EMAIL ADDRESS
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-slate-600"
              placeholder="user@example.com"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !email}
            className="mt-4 w-full h-12 bg-primary hover:bg-primary-dark text-black font-bold rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <LoadingSpinner size="sm" color="black" />
            ) : (
              <>
                <span className="material-symbols-outlined">lock_reset</span>{" "}
                Send Reset Link
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
