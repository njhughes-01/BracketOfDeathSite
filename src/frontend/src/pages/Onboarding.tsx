import React, { useState, useEffect } from "react";
import logger from "../utils/logger";
import { useNavigate, useLocation } from "react-router-dom";
import { apiClient } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import LoadingSpinner from "../components/ui/LoadingSpinner";

const Onboarding: React.FC = () => {
  const [step, setStep] = useState<"loading" | "claim-admin" | "profile">(
    "loading",
  );
  const [formData, setFormData] = useState({
    gender: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refreshUser, forceTokenRefresh } = useAuth();

  // Get redirect path from location state or default to dashboard
  const from = (location.state as any)?.from?.pathname || "/dashboard";

  useEffect(() => {
    const checkSystemStatus = async () => {
      try {
        // If user is already superadmin, skip to profile
        if (user?.roles?.includes("superadmin")) {
          setStep("profile");
          return;
        }

        // Check if system is initialized
        const status = await apiClient.getSystemStatus();
        if (!status.data?.initialized) {
          setStep("claim-admin");
        } else {
          setStep("profile");
        }
      } catch (err) {
        logger.error("Failed to check system status:", err);
        // Fallback to profile step on error
        setStep("profile");
      }
    };

    checkSystemStatus();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleClaimAdmin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await apiClient.claimSuperAdmin();
      await forceTokenRefresh(); // Force refresh to get new roles from server
      setStep("profile"); // Move to profile step
    } catch (err: any) {
      logger.error("Failed to claim admin:", err);
      setError(
        err.response?.data?.error || "Failed to claim superadmin access.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.gender) {
      setError("Please select a gender.");
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.updateProfile(formData as any);
      await refreshUser(); // Refresh user state
      navigate(from, { replace: true });
    } catch (err: any) {
      logger.error("Onboarding update failed", err);
      setError(
        err.response?.data?.error ||
        "Failed to update profile. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (step === "loading") {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex min-h-screen w-full flex-col overflow-hidden bg-background-dark font-display text-white">
      {/* Background Decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[20%] right-[10%] w-[50%] h-[50%] bg-primary/10 blur-[100px] rounded-full"></div>
        <div className="absolute bottom-[20%] left-[10%] w-[40%] h-[40%] bg-accent/5 blur-[80px] rounded-full"></div>
      </div>

      <div className="relative flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8 max-w-md mx-auto w-full z-10 py-10">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-primary to-green-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.4)] mb-6 rotate-3">
            <span
              className="material-symbols-outlined text-white"
              style={{ fontSize: "32px" }}
            >
              {step === "claim-admin" ? "admin_panel_settings" : "badge"}
            </span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-2">
            {step === "claim-admin" ? "System Setup" : "Complete Profile"}
          </h2>
          <p className="text-slate-400">
            {step === "claim-admin"
              ? "Welcome! You are the first user. Let's set up your Super Admin account."
              : `Welcome, ${user?.firstName || user?.username}! Let's finish setting you up.`}
          </p>
        </div>

        {/* Form Container */}
        <div className="w-full">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium text-center flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-lg">error</span>
              {error}
            </div>
          )}

          {step === "claim-admin" ? (
            <div className="flex flex-col gap-6">
              {/* Special System Init Card */}
              <div className="relative overflow-hidden bg-[#0f1115] border border-amber-500/30 rounded-xl p-8 shadow-[0_0_50px_rgba(245,158,11,0.1)]">
                {/* Decorative "Terminal" Header */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-600 to-amber-300 opacity-50"></div>
                <div className="absolute top-4 right-4 flex gap-2">
                  <div className="size-2 rounded-full bg-red-500/20"></div>
                  <div className="size-2 rounded-full bg-amber-500/50 animate-pulse"></div>
                  <div className="size-2 rounded-full bg-green-500/20"></div>
                </div>

                <div className="flex flex-col items-center text-center mb-8">
                  <div className="size-20 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4 border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                    <span className="material-symbols-outlined text-amber-500 !text-[40px]">
                      shield_person
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    System Initialization
                  </h3>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-mono font-bold tracking-wider uppercase">
                    <span className="size-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    Root Access Detected
                  </div>
                </div>

                <p className="text-slate-400 text-sm leading-relaxed text-center mb-8 max-w-sm mx-auto">
                  The system has detected that no Super Administrator exists. As
                  the first user, you can claim this role to verify your
                  identity and gain full control.
                </p>

                <button
                  onClick={handleClaimAdmin}
                  disabled={isLoading}
                  className="w-full h-14 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black text-base font-bold rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-[0.99]"
                >
                  {isLoading ? (
                    <>
                      <div className="size-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                      <span>Initializing Core...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">
                        terminal
                      </span>
                      <span>Initialize System</span>
                    </>
                  )}
                </button>

                <p className="text-center mt-4 text-xs text-slate-600 font-mono">
                  SECURE_BOOT_SEQUENCE_INITIATED
                </p>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleProfileSubmit}
              className="flex flex-col gap-6"
            >
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="gender"
                  className="text-sm font-bold text-slate-400 ml-1"
                >
                  GENDER
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-primary z-10 pointer-events-none">
                    <span className="material-symbols-outlined !text-[20px]">
                      wc
                    </span>
                  </div>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    required
                    className="w-full h-14 bg-[#1c2230] border border-white/5 text-white text-base rounded-xl pl-12 pr-10 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none appearance-none cursor-pointer"
                  >
                    <option value="" disabled>
                      Select Gender
                    </option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                    <span className="material-symbols-outlined">
                      expand_more
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 ml-1">
                  Required for tournament bracket generation.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 w-full h-14 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-base font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Saving Profile...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Setup</span>
                    <span className="material-symbols-outlined !text-[20px] group-hover:translate-x-1 transition-transform">
                      check
                    </span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
