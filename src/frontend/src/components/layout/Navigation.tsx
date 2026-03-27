import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { usePermissions } from "../../hooks/usePermissions";
import { Container } from "../ui";

const Navigation: React.FC = () => {
  const { isAdmin } = useAuth();
  const { canViewAdmin, canManageUsers } = usePermissions();

  const navItems = [
    { path: "/dashboard", label: "Home", icon: "home" },
    { path: "/players", label: "Players", icon: "groups" },
    { path: "/rankings", label: "Rankings", icon: "leaderboard" },
    { path: "/tournaments", label: "Tournaments", icon: "emoji_events" },
    { path: "/results", label: "Results", icon: "assessment" },
    { path: "/rules", label: "Rules", icon: "gavel" },
    { path: "/faq", label: "FAQ", icon: "help" },
    { path: "/news", label: "News", icon: "newspaper" },
  ];

  if (canViewAdmin) {
    navItems.push({ path: "/admin", label: "Admin", icon: "settings" });
  }

  if (canManageUsers) {
    navItems.push({
      path: "/admin/users",
      label: "User Management",
      icon: "manage_accounts",
    });
  }

  navItems.push({ path: "/profile", label: "Profile", icon: "person" });

  return (
    <nav className="bg-white border-b border-gray-200">
      <Container maxWidth="xl" padding="md">
        <div className="flex space-x-8">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `inline-flex items-center px-1 pt-1 pb-4 border-b-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-primary-500 text-primary-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`
              }
            >
              <span className="material-symbols-outlined text-[18px] mr-2">
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
        </div>
      </Container>
    </nav>
  );
};

export default Navigation;
