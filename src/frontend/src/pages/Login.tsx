import React, { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const Login: React.FC = () => {
  const { isAuthenticated, initializeAuth, login, keycloak, loading, setDirectAuthTokens } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [authInitialized, setAuthInitialized] = React.useState(false);
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loginError, setLoginError] = React.useState('');
  const [showAdminInfo, setShowAdminInfo] = React.useState(true);
  const initializationAttempted = useRef(false);

  // Get the redirect path from location state or default to home
  const from = (location.state as any)?.from || '/';

  // Check if user has logged in before and initialize auth
  useEffect(() => {
    const hasLoggedInBefore = localStorage.getItem('hasLoggedInBefore');
    if (hasLoggedInBefore) {
      setShowAdminInfo(false);
    }

    // Initialize auth on component mount to prevent double login issues
    const initAuth = async () => {
      if (!initializationAttempted.current) {
        console.log('Performing initial auth check...');
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
  }, []); // Empty dependency array - only run once on mount

  useEffect(() => {
    // If already authenticated, redirect to intended destination
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

      // Store the intended destination before login
      sessionStorage.setItem('redirectAfterLogin', from);

      // Initialize Keycloak if not already done
      if (!authInitialized) {
        console.log('Initializing authentication...');
        await initializeAuth();
        setAuthInitialized(true);
      }

      // Trigger Keycloak hosted login
      console.log('Triggering Keycloak login...');
      login();
    } catch (error) {
      console.error('Keycloak login failed:', error);
      setLoginError('Authentication service unavailable. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDirectLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted with:', { email, password: password ? '[REDACTED]' : 'empty' });

    if (!email || !password) {
      setLoginError('Please enter both email and password');
      return;
    }

    // Prevent double submission
    if (isLoggingIn) {
      console.log('Login already in progress, ignoring duplicate submission');
      return;
    }

    try {
      setIsLoggingIn(true);
      setLoginError('');

      // Store the intended destination before login
      sessionStorage.setItem('redirectAfterLogin', from);

      console.log('Attempting direct login with credentials...');

      // Use Keycloak direct grant flow (Resource Owner Password Credentials)
      // The /auth proxy strips the /auth prefix, so we need the full path
      const tokenUrl = '/auth/realms/bracketofdeathsite/protocol/openid-connect/token';

      console.log('Making fetch request to:', tokenUrl);

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'password',
          client_id: 'bod-app',
          username: email,
          password: password,
        }),
      });

      console.log('Response status:', response.status, response.statusText);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Login error response:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error_description: errorText || 'Invalid credentials' };
        }
        throw new Error(errorData.error_description || errorData.error || 'Invalid credentials');
      }

      const responseText = await response.text();
      console.log('Response text:', responseText);

      const tokenData = JSON.parse(responseText);
      console.log('Direct login successful, got tokens');

      // Initialize Keycloak if not already done (should usually be done by now)
      if (!authInitialized) {
        console.log('Initializing authentication during login...');
        await initializeAuth();
        setAuthInitialized(true);
      }

      // Use the new direct auth method
      await setDirectAuthTokens({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        id_token: tokenData.id_token
      });

      console.log('Direct authentication complete, navigating...');

      // Mark that user has logged in before
      localStorage.setItem('hasLoggedInBefore', 'true');

      // Navigate to intended destination - will be handled by useEffect when isAuthenticated changes
    } catch (error: any) {
      console.error('Direct login failed:', error);
      setLoginError(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
        <p className="ml-4 text-gray-600">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Access tournament management and admin features
          </p>
        </div>

        <Card className="mt-8" padding="lg">
          <form onSubmit={handleDirectLogin} className="space-y-6">
            {loginError && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{loginError}</div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Username or Email
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="text"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="admin"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoggingIn}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                  {isLoggingIn ? (
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg className="h-5 w-5 text-blue-500 group-hover:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                  )}
                </span>
                {isLoggingIn ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>

          {showAdminInfo && (
            <div className="mt-6 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Default Admin Login:</strong><br />
                Username: admin<br />
                Email: admin@bracketofdeathsite.com<br />
                Password: admin123
              </p>
            </div>
          )}
        </Card>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Need access?{' '}
            <span className="text-gray-600">
              Contact your tournament administrator
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;