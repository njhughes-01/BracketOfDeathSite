import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const Register: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const claimToken = searchParams.get('claimToken');
    const { isAuthenticated } = useAuth();

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        firstName: '',
        lastName: '',
        password: '',
        confirmPassword: '',
    });
    const [isClaiming, setIsClaiming] = useState(false);

    useEffect(() => {
        if (claimToken) {
            try {
                const decoded: any = jwtDecode(claimToken);
                if (decoded && decoded.email) {
                    setFormData(prev => ({ ...prev, email: decoded.email }));
                    setIsClaiming(true);
                }
            } catch (e) {
                console.error("Invalid claim token", e);
                setError("Invalid or expired invitation link.");
            }
        }
    }, [claimToken]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords don't match");
            return;
        }

        if (formData.password.length < 8) {
            setError("Password must be at least 8 characters long");
            return;
        }

        try {
            setIsLoading(true);
            await axios.post('/api/auth/register', {
                username: formData.username,
                email: formData.email,
                firstName: formData.firstName,
                lastName: formData.lastName,
                password: formData.password,
                claimToken: claimToken || undefined,
            });

            // Navigate to login with success message
            navigate('/login', { state: { message: 'Registration successful! Please log in.' } });
        } catch (err: any) {
            console.error('Registration failed:', err);
            setError(err.response?.data?.error || 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isAuthenticated) {
        navigate('/');
        return null; // Or a redirect component
    }

    return (
        <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-background-dark font-display text-white">

            {/* Background/Decoration */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] bg-primary/20 blur-[120px] rounded-full"></div>
                <div className="absolute top-[40%] -left-[10%] w-[40%] h-[40%] bg-accent/10 blur-[100px] rounded-full"></div>
            </div>

            <div className="relative flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8 max-w-md mx-auto w-full z-10 py-10">

                {/* Header */}
                <div className="text-center mb-10">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-primary to-green-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.4)] mb-6 rotate-3">
                        <span className="material-symbols-outlined text-white" style={{ fontSize: '32px' }}>person_add</span>
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight text-white mb-2">
                        {isClaiming ? 'Claim Profile' : 'Create Account'}
                    </h2>
                    <p className="text-slate-400">
                        {isClaiming ? 'Complete your registration to link your player profile.' : 'Join the Bracket of Death'}
                    </p>
                </div>

                {/* Registration Form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full">
                    {error && (
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium text-center flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-lg">error</span>
                            {error}
                        </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-bold text-slate-400 ml-1" htmlFor="username">USERNAME</label>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-primary">
                                <span className="material-symbols-outlined !text-[20px]">account_circle</span>
                            </div>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                required
                                value={formData.username}
                                onChange={handleChange}
                                className="w-full h-14 bg-[#1c2230] border border-white/5 text-white text-base rounded-xl pl-12 pr-4 focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-slate-600 transition-all outline-none"
                                placeholder="jdoe"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-bold text-slate-400 ml-1" htmlFor="email">EMAIL</label>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-primary">
                                <span className="material-symbols-outlined !text-[20px]">mail</span>
                            </div>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                disabled={isClaiming}
                                className={`w-full h-14 bg-[#1c2230] border border-white/5 text-white text-base rounded-xl pl-12 pr-4 focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-slate-600 transition-all outline-none ${isClaiming ? 'opacity-50 cursor-not-allowed' : ''}`}
                                placeholder="john@example.com"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex flex-col gap-1.5 w-1/2">
                            <label className="text-sm font-bold text-slate-400 ml-1" htmlFor="firstName">FIRST NAME</label>
                            <div className="relative group">
                                <input
                                    id="firstName"
                                    name="firstName"
                                    type="text"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    className="w-full h-14 bg-[#1c2230] border border-white/5 text-white text-base rounded-xl px-4 focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-slate-600 transition-all outline-none"
                                    placeholder="John"
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5 w-1/2">
                            <label className="text-sm font-bold text-slate-400 ml-1" htmlFor="lastName">LAST NAME</label>
                            <div className="relative group">
                                <input
                                    id="lastName"
                                    name="lastName"
                                    type="text"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    className="w-full h-14 bg-[#1c2230] border border-white/5 text-white text-base rounded-xl px-4 focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-slate-600 transition-all outline-none"
                                    placeholder="Doe"
                                />
                            </div>
                        </div>
                    </div>


                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-bold text-slate-400 ml-1" htmlFor="password">PASSWORD</label>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-primary">
                                <span className="material-symbols-outlined !text-[20px]">lock</span>
                            </div>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                value={formData.password}
                                onChange={handleChange}
                                className="w-full h-14 bg-[#1c2230] border border-white/5 text-white text-base rounded-xl pl-12 pr-4 focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-slate-600 transition-all outline-none"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-bold text-slate-400 ml-1" htmlFor="confirmPassword">CONFIRM PASSWORD</label>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-primary">
                                <span className="material-symbols-outlined !text-[20px]">lock_reset</span>
                            </div>
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                required
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className="w-full h-14 bg-[#1c2230] border border-white/5 text-white text-base rounded-xl pl-12 pr-4 focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-slate-600 transition-all outline-none"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>


                    <button
                        type="submit"
                        disabled={isLoading}
                        className="mt-2 w-full h-14 bg-primary hover:bg-primary-dark active:scale-[0.98] text-black text-base font-bold rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <div className="size-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                                <span>Creating Account...</span>
                            </>
                        ) : (
                            <>
                                <span>Sign Up</span>
                                <span className="material-symbols-outlined !text-[20px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-10 text-center pb-8">
                    <p className="text-slate-500 text-sm">
                        Already have an account?
                        <Link to="/login" className="font-bold text-white hover:text-primary transition-colors ml-1">Log In</Link>
                    </p>
                </div>

            </div>
        </div>
    );
};

export default Register;
