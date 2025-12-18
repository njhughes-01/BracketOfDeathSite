"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_router_dom_1 = require("react-router-dom");
const AuthContext_1 = require("../../contexts/AuthContext");
const Header = () => {
    const { isAuthenticated, user, logout, loading } = (0, AuthContext_1.useAuth)();
    return (<header className="bg-white shadow">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gradient">
              Bracket of Death
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              Tennis Tournament Score Tracking
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {loading ? (<div className="text-sm text-gray-500">Loading...</div>) : isAuthenticated && user ? (<div className="flex items-center space-x-4">
                <div className="text-sm">
                  <span className="text-gray-600">Welcome, </span>
                  <span className="font-medium text-gray-900">{user.name}</span>
                  {user.isAdmin && (<span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                      Admin
                    </span>)}
                </div>
                <button onClick={logout} className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                  Sign Out
                </button>
              </div>) : (<react_router_dom_1.Link to="/login" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors">
                Sign In
              </react_router_dom_1.Link>)}
          </div>
        </div>
      </div>
    </header>);
};
exports.default = Header;
//# sourceMappingURL=Header.js.map