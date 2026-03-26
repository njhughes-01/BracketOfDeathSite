import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const Header: React.FC = () => {
  const { isAuthenticated, user, logout, loading } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center space-x-3 group">
              <img 
                src="/bod-logo.jpg" 
                alt="Bracket of Death Logo" 
                className="h-20 w-20 object-contain transition-transform group-hover:scale-105"
              />
              <div>
                <h1 className="text-2xl font-bold text-bod-black tracking-tight">
                  Bracket of Death
                </h1>
                <p className="text-bod-gray text-sm italic">
                  Because Tennis
                </p>
              </div>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {loading ? (
              <div className="text-sm text-gray-500">Loading...</div>
            ) : isAuthenticated && user ? (
              <div className="flex items-center space-x-4">
                <div className="text-sm">
                  <span className="text-gray-600">Welcome, </span>
                  <Link
                    to="/profile"
                    className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                  >
                    {user.fullName || user.username}
                  </Link>
                  {user.isAdmin && (
                    <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                      Admin
                    </span>
                  )}
                </div>
                <button
                  onClick={logout}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
