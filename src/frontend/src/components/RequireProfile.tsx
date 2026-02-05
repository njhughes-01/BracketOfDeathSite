import React, { useEffect, useState, useRef } from "react";
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
  const location = useLocation();
  const isMountedRef = useRef(true);

  // Admin and superadmin users don't need player profiles - bypass the check
  const isAdmin = user?.isAdmin === true;

  // Cleanup ref on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Check system initialization status first - with timeout and cleanup
  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const checkSystemStatus = async () => {
      try {
        const status = await apiClient.getSystemStatus();
        if (isMountedRef.current) {
          setIsSystemInitialized(status.data?.initialized ?? true);
        }
      } catch (error) {
        console.error("Failed to check system status", error);
        // Assume initialized on error to prevent redirect loops
        if (isMountedRef.current) {
          setIsSystemInitialized(true);
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
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const checkProfile = async () => {
      if (!isAuthenticated) {
        if (isMountedRef.current) setIsLoading(false);
        return;
      }

      // Skip profile check for admin users
      if (isAdmin) {
        if (isMountedRef.current) {
          setIsComplete(true);
          setIsLoading(false);
        }
        return;
      }

      try {
        const response = await apiClient.getProfile();
        if (isMountedRef.current) {
          if (response.success && response.data) {
            setIsComplete(response.data.isComplete);
          } else {
            // Fallback or error handling?
            setIsComplete(false);
          }
        }
      } catch (error) {
        console.error("Failed to check profile status", error);
        // If checking fails, assume complete to avoid blocking
        if (isMountedRef.current) {
          setIsComplete(true);
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
  }, [isAuthenticated, isAdmin]);

  // Wait for auth to finish loading first
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background-dark">
        <LoadingSpinner size="lg" />
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

  // If on onboarding page, don't redirect to onboarding (prevent loop) via Outlet?
  // Wait, RequireProfile should WRAP other routes.
  // So if isComplete is false, redirect to /onboarding.

  if (isComplete === false) {
    return <Navigate to="/onboarding" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default RequireProfile;
