"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const AuthContext_1 = require("../contexts/AuthContext");
const react_router_dom_1 = require("react-router-dom");
const Card_1 = __importDefault(require("../components/ui/Card"));
const LoadingSpinner_1 = __importDefault(require("../components/ui/LoadingSpinner"));
const Login = () => {
    const { isAuthenticated, initializeAuth, login, keycloak, loading, setDirectAuthTokens } = (0, AuthContext_1.useAuth)();
    const navigate = (0, react_router_dom_1.useNavigate)();
    const location = (0, react_router_dom_1.useLocation)();
    const [authInitialized, setAuthInitialized] = react_1.default.useState(false);
    const [isLoggingIn, setIsLoggingIn] = react_1.default.useState(false);
    const [email, setEmail] = react_1.default.useState('');
    const [password, setPassword] = react_1.default.useState('');
    const [loginError, setLoginError] = react_1.default.useState('');
    const [showAdminInfo, setShowAdminInfo] = react_1.default.useState(true);
    const initializationAttempted = (0, react_1.useRef)(false);
    const from = location.state?.from || '/';
    (0, react_1.useEffect)(() => {
        const hasLoggedInBefore = localStorage.getItem('hasLoggedInBefore');
        if (hasLoggedInBefore) {
            setShowAdminInfo(false);
        }
        const initAuth = async () => {
            if (!initializationAttempted.current) {
                console.log('Performing initial auth check...');
                initializationAttempted.current = true;
                try {
                    await initializeAuth();
                    setAuthInitialized(true);
                }
                catch (error) {
                    console.error('Initial auth check failed:', error);
                }
            }
        };
        initAuth();
    }, []);
    (0, react_1.useEffect)(() => {
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
                console.log('Initializing authentication...');
                await initializeAuth();
                setAuthInitialized(true);
            }
            console.log('Triggering Keycloak login...');
            login();
        }
        catch (error) {
            console.error('Keycloak login failed:', error);
            setLoginError('Authentication service unavailable. Please try again.');
        }
        finally {
            setIsLoggingIn(false);
        }
    };
    const handleDirectLogin = async (e) => {
        e.preventDefault();
        console.log('Form submitted with:', { email, password: password ? '[REDACTED]' : 'empty' });
        if (!email || !password) {
            setLoginError('Please enter both email and password');
            return;
        }
        if (isLoggingIn) {
            console.log('Login already in progress, ignoring duplicate submission');
            return;
        }
        try {
            setIsLoggingIn(true);
            setLoginError('');
            sessionStorage.setItem('redirectAfterLogin', from);
            console.log('Attempting direct login with credentials...');
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
                }
                catch {
                    errorData = { error_description: errorText || 'Invalid credentials' };
                }
                throw new Error(errorData.error_description || errorData.error || 'Invalid credentials');
            }
            const responseText = await response.text();
            console.log('Response text:', responseText);
            const tokenData = JSON.parse(responseText);
            console.log('Direct login successful, got tokens');
            if (!authInitialized) {
                console.log('Initializing authentication during login...');
                await initializeAuth();
                setAuthInitialized(true);
            }
            await setDirectAuthTokens({
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
                id_token: tokenData.id_token
            });
            console.log('Direct authentication complete, navigating...');
            localStorage.setItem('hasLoggedInBefore', 'true');
        }
        catch (error) {
            console.error('Direct login failed:', error);
            setLoginError(error.message || 'Login failed. Please check your credentials.');
        }
        finally {
            setIsLoggingIn(false);
        }
    };
    if (loading) {
        return (<div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner_1.default />
      </div>);
    }
    if (isAuthenticated) {
        return (<div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner_1.default />
        <p className="ml-4 text-gray-600">Redirecting...</p>
      </div>);
    }
    return (<div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Access tournament management and admin features
          </p>
        </div>
        
        <Card_1.default className="mt-8" padding="lg">
          <form onSubmit={handleDirectLogin} className="space-y-6">
            {loginError && (<div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{loginError}</div>
              </div>)}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Username or Email
              </label>
              <div className="mt-1">
                <input id="email" name="email" type="text" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="admin"/>
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="Enter your password"/>
              </div>
            </div>

            <div>
              <button type="submit" disabled={isLoggingIn} className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200">
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                  {isLoggingIn ? (<div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>) : (<svg className="h-5 w-5 text-blue-500 group-hover:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
                    </svg>)}
                </span>
                {isLoggingIn ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>

          {showAdminInfo && (<div className="mt-6 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Default Admin Login:</strong><br />
                Username: admin<br />
                Email: admin@bracketofdeathsite.com<br />
                Password: admin123
              </p>
            </div>)}
        </Card_1.default>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Need access?{' '}
            <span className="font-medium text-blue-600">
              Contact your tournament administrator
            </span>
          </p>
        </div>
      </div>
    </div>);
};
exports.default = Login;
//# sourceMappingURL=Login.js.map