import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { usePermissions } from "../../hooks/usePermissions";

const Navigation: React.FC = () => {
  const { isAdmin } = useAuth();
  const { canViewAdmin, canManageUsers } = usePermissions();

  const navItems = [
    { path: "/", label: "Home", icon: "🏠" },
    { path: "/players", label: "Players", icon: "👥" },
    { path: "/rankings", label: "Rankings", icon: "📈" },
    { path: "/tournaments", label: "Tournaments", icon: "🏆" },
    { path: "/results", label: "Results", icon: "📊" },
    { path: "/news", label: "News", icon: "📰" },
  ];

  // Add admin link for admin users
  if (canViewAdmin) {
    navItems.push({ path: "/admin", label: "Admin", icon: "⚙️" });
  }

  // Add user management for users with permissions
  if (canManageUsers) {
    navItems.push({
      path: "/admin/users",
      label: "User Management",
      icon: "👤",
    });
  }

  // Add profile link for authenticated users
  navItems.push({ path: "/profile", label: "Profile", icon: "👤" });

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `inline-flex items-center px-1 pt-1 pb-4 border-b-2 text-sm font-medium transition-colors ${isActive
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`
              }
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
