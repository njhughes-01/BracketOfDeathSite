"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_router_dom_1 = require("react-router-dom");
const AuthContext_1 = require("../../contexts/AuthContext");
const usePermissions_1 = require("../../hooks/usePermissions");
const Navigation = () => {
    const { isAdmin } = (0, AuthContext_1.useAuth)();
    const { canViewAdmin, canManageUsers } = (0, usePermissions_1.usePermissions)();
    const navItems = [
        { path: '/', label: 'Home', icon: '🏠' },
        { path: '/players', label: 'Players', icon: '👥' },
        { path: '/tournaments', label: 'Tournaments', icon: '🏆' },
        { path: '/results', label: 'Results', icon: '📊' },
    ];
    if (canViewAdmin) {
        navItems.push({ path: '/admin', label: 'Admin', icon: '⚙️' });
    }
    if (canManageUsers) {
        navItems.push({ path: '/admin/users', label: 'User Management', icon: '👤' });
    }
    return (<nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8">
          {navItems.map((item) => (<react_router_dom_1.NavLink key={item.path} to={item.path} className={({ isActive }) => `inline-flex items-center px-1 pt-1 pb-4 border-b-2 text-sm font-medium transition-colors ${isActive
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </react_router_dom_1.NavLink>))}
        </div>
      </div>
    </nav>);
};
exports.default = Navigation;
//# sourceMappingURL=Navigation.js.map