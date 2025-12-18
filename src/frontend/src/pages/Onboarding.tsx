import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiClient } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const Onboarding: React.FC = () => {
    const [formData, setFormData] = useState({
        gender: '',
    });
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    // Get redirect path from location state or default to dashboard
    // The RequireProfile component (to be implemented) will likely pass this state
    const from = (location.state as any)?.from?.pathname || '/';

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (error) setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.gender) {
            setError('Please select a gender.');
            return;
        }

        setIsLoading(true);
        try {
            await apiClient.updateProfile(formData as any);
            // Determine where to go next. 
            // If we came from a redirect, go back there.
            // Otherwise, go to dashboard.
            navigate(from, { replace: true });
        } catch (err: any) {
            console.error('Onboarding update failed', err);
            setError(err.response?.data?.error || 'Failed to update profile. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-white">
                    Complete Your Profile
                </h2>
                <p className="mt-2 text-center text-sm text-gray-400">
                    Welcome, {user?.firstName || user?.username}! We need a few more details to get you started.
                </p>
            </div>

            <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
                <form className="space-y-6" onSubmit={handleSubmit}>
                    {error && (
                        <div className="rounded-md bg-red-50 p-4">
                            <div className="flex">
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <label htmlFor="gender" className="block text-sm font-medium leading-6 text-white">
                            Gender
                        </label>
                        <div className="mt-2">
                            <select
                                id="gender"
                                name="gender"
                                value={formData.gender}
                                onChange={handleChange}
                                required
                                className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6 [&_option]:text-black"
                            >
                                <option value="" disabled>Select Gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>

                    {/* Bracket Preference removed as per requirements */}

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex w-full justify-center rounded-md bg-indigo-500 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:opacity-50"
                        >
                            {isLoading ? 'Saving...' : 'Complete Profile'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Onboarding;
