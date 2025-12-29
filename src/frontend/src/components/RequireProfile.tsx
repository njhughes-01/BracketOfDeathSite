import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { apiClient } from "../services/api";

const RequireProfile: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const [isComplete, setIsComplete] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSystemInitialized, setIsSystemInitialized] = useState<
    boolean | null
  >(null);
  const location = useLocation();

  // Admin and superadmin users don't need player profiles - bypass the check
  const isAdmin = user?.isAdmin === true;

  // Check system initialization status first
  useEffect(() => {
    const checkSystemStatus = async () => {
      try {
        const status = await apiClient.getSystemStatus();
        setIsSystemInitialized(status.data?.initialized ?? true);
      } catch (error) {
        console.error("Failed to check system status", error);
        // Assume initialized on error to prevent redirect loops
        setIsSystemInitialized(true);
      }
    };
    checkSystemStatus();
  }, []);

  useEffect(() => {
    const checkProfile = async () => {
      if (!isAuthenticated) {
        setIsLoading(false);
        return;
      }

      // Skip profile check for admin users
      if (isAdmin) {
        setIsComplete(true);
        setIsLoading(false);
        return;
      }

      try {
        const response = await apiClient.getProfile();
        if (response.success && response.data) {
          setIsComplete(response.data.isComplete);
        } else {
          // Fallback or error handling?
          setIsComplete(false);
        }
      } catch (error) {
        console.error("Failed to check profile status", error);
        // If checking fails, maybe assume incomplete or let them pass?
        // Safest is to assume incomplete if we want to enforce it,
        // but might block loop.
        // For now, assume false.
        setIsComplete(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkProfile();
  }, [isAuthenticated, isAdmin]);

  // Wait for system status check
  if (isSystemInitialized === null) {
    return (
      <div className="flex h-screen items-center justify-center text-white">
        Checking system status...
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
    // You might want a spinner here
    return (
      <div className="flex h-screen items-center justify-center text-white">
        Loading profile...
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
