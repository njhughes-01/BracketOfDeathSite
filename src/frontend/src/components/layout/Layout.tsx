import React, { type ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

import { useAuth } from "../../contexts/AuthContext";
import apiClient from "../../services/api";

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { isAdmin, user, isAuthenticated } = useAuth();
  const [showEmailBanner, setShowEmailBanner] = useState(false);

  // Pages that should not show navigation
  const noNavPages = ["/login", "/register", "/setup", "/onboarding"];
  const showNav =
    isAuthenticated &&
    !noNavPages.some((page) => location.pathname.startsWith(page));

  // Check if superadmin and email not configured
  useEffect(() => {
    const checkEmailConfig = async () => {
      // Only check for superadmin (username === 'admin')
      if (isAuthenticated && isAdmin && user?.username === "admin") {
        try {
          const { configured } = await apiClient.isEmailConfigured();
          setShowEmailBanner(!configured);
        } catch {
          // Silently fail - don't show banner if check fails
        }
      }
    };
    checkEmailConfig();
  }, [isAuthenticated, isAdmin, user?.username]);

  const isActive = (path: string) => {
    // Exact match for home, startsWith for others to handle sub-routes
    if (path === "/") {
      return location.pathname === "/"
        ? "text-primary scale-110"
        : "text-slate-400 group-hover:text-white";
    }
    return location.pathname.startsWith(path)
      ? "text-primary scale-110"
      : "text-slate-400 group-hover:text-white";
  };

  const getTextClass = (path: string) => {
    if (path === "/") {
      return location.pathname === "/"
        ? "text-primary"
        : "text-slate-400 group-hover:text-white";
    }
    return location.pathname.startsWith(path)
      ? "text-primary"
      : "text-slate-400 group-hover:text-white";
  };

  const navItems = [
    { path: "/", icon: "dashboard", label: "Home" },
    { path: "/tournaments", icon: "emoji_events", label: "Tournaments" },
    { path: "/open-tournaments", icon: "public", label: "Open Events" },
    { path: "/players", icon: "groups", label: "Players" },
    { path: "/profile", icon: "person", label: "Profile" },
  ];

  if (isAdmin) {
    navItems.push({
      path: "/admin",
      icon: "admin_panel_settings",
      label: "Admin",
    });
  }

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display antialiased min-h-screen flex flex-col md:flex-row">
      {/* Email Configuration Banner for Superadmin */}
      {showEmailBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500/90 text-black py-2 px-4 flex items-center justify-center gap-4">
          <span className="material-symbols-outlined">warning</span>
          <span className="font-bold text-sm">Email is not configured.</span>
          <Link
            to="/admin/settings"
            className="bg-black/20 hover:bg-black/30 px-3 py-1 rounded-lg text-sm font-bold transition-colors"
          >
            Configure Now
          </Link>
          <button
            onClick={() => setShowEmailBanner(false)}
            className="ml-2 hover:bg-black/20 p-1 rounded transition-colors"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Desktop Sidebar - Hidden on Mobile and when not authenticated */}
      {showNav && (
        <aside
          className={`hidden md:flex flex-col w-64 border-r border-slate-200 dark:border-white/10 bg-background-dark h-screen sticky top-0 z-50 ${showEmailBanner ? "mt-10" : ""}`}
        >
          <div className="p-6">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
              MatchPoint
            </h1>
          </div>

          <nav className="flex-1 px-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all group ${
                  (item.path === "/" && location.pathname === "/") ||
                  (item.path !== "/" && location.pathname.startsWith(item.path))
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[24px] ${
                    (item.path === "/" && location.pathname === "/") ||
                    (item.path !== "/" &&
                      location.pathname.startsWith(item.path))
                      ? "text-primary"
                      : "text-slate-400 group-hover:text-white"
                  }`}
                >
                  {item.icon}
                </span>
                <span className="font-bold text-sm">{item.label}</span>
              </Link>
            ))}
          </nav>

          {isAdmin && (
            <div className="p-4 border-t border-white/5">
              <Link
                to="/tournaments/create"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-accent text-background-dark font-bold hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-accent/20"
              >
                <span className="material-symbols-outlined text-[20px]">
                  add
                </span>
                Create Tournament
              </Link>
            </div>
          )}
        </aside>
      )}

      {/* Main Content Area */}
      <main
        className={`flex-1 w-full pb-24 md:pb-0 relative overflow-x-hidden md:h-screen md:overflow-y-auto bg-background-dark ${showEmailBanner ? "mt-10" : ""}`}
      >
        <div className="md:max-w-7xl md:mx-auto md:p-6 w-full">{children}</div>
      </main>

      {/* Bottom Navigation - Fixed Mobile Tab Bar - Hidden on Desktop and when not authenticated */}
      {showNav && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0f1115]/90 backdrop-blur-lg border-t border-white/5 w-full pb-6 pt-2 px-6">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {/* Home Tab */}
            <Link
              to="/"
              className="flex flex-col items-center justify-center gap-1 group"
            >
              <span
                className={`material-symbols-outlined text-2xl transition-all duration-300 group-hover:scale-110 ${isActive("/").includes("text-primary") ? "text-primary" : "text-slate-500"}`}
              >
                home
              </span>
              <span
                className={`text-[10px] font-medium transition-colors ${getTextClass("/")}`}
              >
                Home
              </span>
            </Link>

            {/* Tournaments Tab */}
            <Link
              to="/tournaments"
              className="flex flex-col items-center justify-center gap-1 group"
            >
              <span
                className={`material-symbols-outlined text-2xl transition-all duration-300 group-hover:scale-110 ${isActive("/tournaments").includes("text-primary") ? "text-primary" : "text-slate-500"}`}
              >
                emoji_events
              </span>
              <span
                className={`text-[10px] font-medium transition-colors ${getTextClass("/tournaments")}`}
              >
                Tourneys
              </span>
            </Link>

            {/* FAB - Center Action - Only show for admins */}
            {isAdmin && (
              <div className="relative -mt-8">
                <Link
                  to="/tournaments/create"
                  className="flex items-center justify-center size-14 rounded-full bg-accent text-background-dark shadow-[0_0_15px_rgba(204,255,0,0.4)] border-4 border-background-dark hover:scale-105 active:scale-95 transition-transform z-50"
                >
                  <span className="material-symbols-outlined text-3xl font-bold">
                    add
                  </span>
                </Link>
              </div>
            )}

            {/* Players Tab */}
            <Link
              to="/players"
              className="flex flex-col items-center justify-center gap-1 group"
            >
              <span
                className={`material-symbols-outlined text-2xl transition-all duration-300 group-hover:scale-110 ${isActive("/players").includes("text-primary") ? "text-primary" : "text-slate-500"}`}
              >
                groups
              </span>
              <span
                className={`text-[10px] font-medium transition-colors ${getTextClass("/players")}`}
              >
                Players
              </span>
            </Link>

            {/* Profile Tab */}
            <Link
              to="/profile"
              className="flex flex-col items-center justify-center gap-1 group"
            >
              <span
                className={`material-symbols-outlined text-2xl transition-all duration-300 group-hover:scale-110 ${isActive("/profile").includes("text-primary") ? "text-primary" : "text-slate-500"}`}
              >
                person
              </span>
              <span
                className={`text-[10px] font-medium transition-colors ${getTextClass("/profile")}`}
              >
                Profile
              </span>
            </Link>

            {/* Admin Tab (Mobile) - Only if Admin */}
            {isAdmin && (
              <Link
                to="/admin"
                className="flex flex-col items-center justify-center gap-1 group"
              >
                <span
                  className={`material-symbols-outlined text-2xl transition-all duration-300 group-hover:scale-110 ${isActive("/admin").includes("text-primary") ? "text-primary" : "text-slate-500"}`}
                >
                  admin_panel_settings
                </span>
                <span
                  className={`text-[10px] font-medium transition-colors ${getTextClass("/admin")}`}
                >
                  Admin
                </span>
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
};

export default Layout;
