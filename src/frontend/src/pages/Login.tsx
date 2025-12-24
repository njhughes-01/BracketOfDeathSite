import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation, Link, useSearchParams } from 'react-router-dom';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ForgotPasswordModal from '../components/auth/ForgotPasswordModal';
import { apiClient } from '../services/api';

const Login: React.FC = () => {
  const { isAuthenticated, initializeAuth, login, keycloak, loading, setDirectAuthTokens } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [authInitialized, setAuthInitialized] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const initializationAttempted = useRef(false);

  // Robustly handle 'from' state: check query param first, then state
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get('returnUrl');
  const stateFrom = (location.state as any)?.from;

  const from = returnUrl || (typeof stateFrom === 'string'
    ? stateFrom
    : stateFrom?.pathname || '/');

  useEffect(() => {
    // Check for initialization status first
    const checkInit = async () => {
      try {
        const status = await apiClient.getSystemStatus();
        if (!status.data?.initialized) {
          // System uninitialized - redirect to setup page
          navigate('/setup', { replace: true });
          return;
        }
      } catch (e) {
        console.error('Failed to check system status', e);
      }
    };
    checkInit();

    const initAuth = async () => {
      if (!initializationAttempted.current) {
        initializationAttempted.current = true;
        try {
          await initializeAuth();
          setAuthInitialized(true);
        } catch (error) {
          console.error('Initial auth check failed:', error);
        }
      }
    };

    initAuth();
  }, [initializeAuth, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      const redirectPath = sessionStorage.getItem('redirectAfterLogin') || from;
      sessionStorage.removeItem('redirectAfterLogin');
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleKeycloakLogin = async () => {
    try {
      setIsLoggingIn(true);
      setLoginError('');
      sessionStorage.setItem('redirectAfterLogin', from);
      if (!authInitialized) {
        await initializeAuth();
        setAuthInitialized(true);
      }
      login();
    } catch (error) {
      console.error('Keycloak login failed:', error);
      setLoginError('Authentication service unavailable.');
    } finally {
      setIsLoggingIn(false);
    }
  };


  const handleDirectLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setLoginError('Please enter both email and password');
      return;
    }
    if (isLoggingIn) return;

    try {
      setIsLoggingIn(true);
      setLoginError('');
      sessionStorage.setItem('redirectAfterLogin', from);

      // Use Keycloak direct grant flow
      const tokenUrl = '/auth/realms/bracketofdeathsite/protocol/openid-connect/token';
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'password',
          client_id: 'bod-app',
          username: email,
          password: password,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error_description: 'Invalid credentials' };
        }
        throw new Error(errorData.error_description || 'Invalid credentials');
      }

      const tokenData = await response.json();

      if (!authInitialized) {
        await initializeAuth();
        setAuthInitialized(true);
      }

      await setDirectAuthTokens({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        id_token: tokenData.id_token
      });

      localStorage.setItem('hasLoggedInBefore', 'true');
    } catch (error: any) {
      console.error('Direct login failed:', error);
      setLoginError(error.message || 'Login failed.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-dark">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-dark">
        <LoadingSpinner size="lg" />
        <p className="ml-4 text-slate-400">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-background-dark font-display text-white">

      {/* Background/Decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] bg-primary/20 blur-[120px] rounded-full"></div>
        <div className="absolute top-[40%] -left-[10%] w-[40%] h-[40%] bg-accent/10 blur-[100px] rounded-full"></div>
      </div>

      <div className="relative flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8 max-w-md mx-auto w-full z-10">

        {/* Header */}
        <div className="text-center mb-10">
          {/* Logo Placeholder */}
          <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-primary to-green-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.4)] mb-6 rotate-3">
            <span className="material-symbols-outlined text-white" style={{ fontSize: '32px' }}>sports_tennis</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-2">
            Welcome Back
          </h2>
          <p className="text-slate-400">
            Sign in to manage your tournaments
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleDirectLogin} className="flex flex-col gap-5 w-full">
          {loginError && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium text-center flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-lg">error</span>
              {loginError}
            </div>
          )}

          {/* Email Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-slate-400 ml-1" htmlFor="email">EMAIL OR USERNAME</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-primary">
                <span className="material-symbols-outlined !text-[20px]">person</span>
              </div>
              <input
                id="email"
                name="email"
                type="text"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-14 bg-[#1c2230] border border-white/5 text-white text-base rounded-xl pl-12 pr-4 focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-slate-600 transition-all outline-none"
                placeholder="admin"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center ml-1">
              <label className="text-sm font-bold text-slate-400" htmlFor="password">PASSWORD</label>
            </div>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-primary">
                <span className="material-symbols-outlined !text-[20px]">lock</span>
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-14 bg-[#1c2230] border border-white/5 text-white text-base rounded-xl pl-12 pr-12 focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-slate-600 transition-all outline-none"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors focus:outline-none"
              >
                <span className="material-symbols-outlined !text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
            {/* Forgot Password Link */}
            <div className="flex justify-end mt-1">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-xs font-bold text-primary hover:text-primary-light transition-colors hover:underline"
              >
                Forgot Password?
              </button>
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoggingIn}
            className="mt-2 w-full h-14 bg-primary hover:bg-primary-dark active:scale-[0.98] text-black text-base font-bold rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoggingIn ? (
              <>
                <div className="size-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <span>Log In</span>
                <span className="material-symbols-outlined !text-[20px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </>
            )}
          </button>
        </form>


        {/* Divider */}
        <div className="relative py-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background-dark px-3 text-slate-500 font-bold tracking-wider">Or continue with</span>
          </div>
        </div>

        {/* Social Actions (Mock) */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleKeycloakLogin}
            className="flex h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#1c2230] text-white hover:bg-white/5 transition-colors"
          >
            <span className="material-symbols-outlined">verified_user</span>
            <span className="text-sm font-bold">Keycloak SSO</span>
          </button>
          <button className="flex h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#1c2230] text-white hover:bg-white/5 transition-colors">
            <span className="material-symbols-outlined">mail</span>
            <span className="text-sm font-bold">Google</span>
          </button>
        </div>

        {/* Sign Up Footer */}
        <div className="mt-10 text-center pb-8">
          <p className="text-slate-500 text-sm">
            Don't have an account?
            <Link to="/register" className="font-bold text-white hover:text-primary transition-colors ml-1">Sign Up</Link>
          </p>
        </div>
      </div>

      {showForgotPassword && (
        <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} />
      )}
    </div>
  );
};

export default Login;