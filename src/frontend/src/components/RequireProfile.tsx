import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/api';

const RequireProfile: React.FC = () => {
    const { isAuthenticated, user } = useAuth();
    const [isComplete, setIsComplete] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const location = useLocation();

    useEffect(() => {
        const checkProfile = async () => {
            if (!isAuthenticated) {
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
    }, [isAuthenticated]);

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    }

    if (isLoading) {
        // You might want a spinner here
        return <div className="flex h-screen items-center justify-center text-white">Loading profile...</div>;
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
