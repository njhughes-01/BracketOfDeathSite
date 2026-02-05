import React, { useEffect, useState, useRef, useCallback } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { apiClient } from "../services/api";
import LoadingSpinner from "./ui/LoadingSpinner";

const RequireProfile: React.FC = () => {
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const [isComplete, setIsComplete] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSystemInitialized, setIsSystemInitialized] = useState<
    boolean | null
  >(null);
  const [systemError, setSystemError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const location = useLocation();
  const isMountedRef = useRef(true);

  // Admin and superadmin users don't need player profiles - bypass the check
  const isAdmin = user?.isAdmin === true;

  // Cleanup ref on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Check system initialization status - wait for auth to finish first
  useEffect(() => {
    // Don't check system status until auth has finished loading
    if (authLoading) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const checkSystemStatus = async () => {
      try {
        setSystemError(null);
        const status = await apiClient.getSystemStatus({ signal: controller.signal });
        if (isMountedRef.current) {
          setIsSystemInitialized(status.data?.initialized ?? true);
        }
      } catch (error: any) {
        // Don't show error if request was intentionally aborted
        if (error?.name === 'CanceledError' || error?.name === 'AbortError') {
          return;
        }
        console.error("Failed to check system status", error);
        // Fail closed - show error to user instead of assuming state
        if (isMountedRef.current) {
          setSystemError("Unable to connect to server. Please check your connection.");
        }
      } finally {
        clearTimeout(timeoutId);
      }
    };
    checkSystemStatus();

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [retryCount, authLoading]);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const checkProfile = async () => {
      if (!isAuthenticated) {
        if (isMountedRef.current) setIsLoading(false);
        clearTimeout(timeoutId);
        return;
      }

      // Skip profile check for admin users
      if (isAdmin) {
        if (isMountedRef.current) {
          setIsComplete(true);
          setIsLoading(false);
        }
        clearTimeout(timeoutId);
        return;
      }

      try {
        setProfileError(null);
        const response = await apiClient.getProfile({ signal: controller.signal });
        if (isMountedRef.current) {
          if (response.success && response.data) {
            setIsComplete(response.data.isComplete);
          } else {
            // Explicit failure from API
            setIsComplete(false);
          }
        }
      } catch (error: any) {
        // Don't show error if request was intentionally aborted
        if (error?.name === 'CanceledError' || error?.name === 'AbortError') {
          return;
        }
        console.error("Failed to check profile status", error);
        // Fail closed - show error to user instead of assuming state
        if (isMountedRef.current) {
          setProfileError("Unable to load profile. Please try again.");
        }
      } finally {
        clearTimeout(timeoutId);
        if (isMountedRef.current) setIsLoading(false);
      }
    };

    checkProfile();

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [isAuthenticated, isAdmin, retryCount]);

  // Retry handler
  const handleRetry = useCallback(() => {
    setSystemError(null);
    setProfileError(null);
    setRetryCount(prev => prev + 1);
  }, []);

  // Wait for auth to finish loading first
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background-dark">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Show error state for system check failure
  if (systemError) {
    return (
      <div className="flex h-screen items-center justify-center bg-background-dark">
        <div className="flex flex-col items-center gap-4 max-w-md text-center px-4">
          <span className="material-symbols-outlined text-red-500 text-5xl">error</span>
          <h2 className="text-white text-xl font-bold">Connection Error</h2>
          <p className="text-slate-400 text-sm">{systemError}</p>
          <button
            onClick={handleRetry}
            className="mt-2 px-6 py-2 bg-primary text-black font-bold rounded-xl hover:bg-primary-dark transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Wait for system status check (with visual feedback)
  if (isSystemInitialized === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-background-dark">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" />
          <span className="text-slate-400 text-sm">Checking system status...</span>
        </div>
      </div>
    );
  }

  // If system is not initialized, redirect to setup
  if (!isSystemInitialized) {
    return <Navigate to="/setup" replace />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Show error state for profile check failure
  if (profileError) {
    return (
      <div className="flex h-screen items-center justify-center bg-background-dark">
        <div className="flex flex-col items-center gap-4 max-w-md text-center px-4">
          <span className="material-symbols-outlined text-red-500 text-5xl">error</span>
          <h2 className="text-white text-xl font-bold">Profile Error</h2>
          <p className="text-slate-400 text-sm">{profileError}</p>
          <button
            onClick={handleRetry}
            className="mt-2 px-6 py-2 bg-primary text-black font-bold rounded-xl hover:bg-primary-dark transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background-dark">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" />
          <span className="text-slate-400 text-sm">Loading profile...</span>
        </div>
      </div>
    );
  }

  // If profile check completed with isComplete as false, redirect to onboarding
  if (isComplete === false) {
    return <Navigate to="/onboarding" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default RequireProfile;
