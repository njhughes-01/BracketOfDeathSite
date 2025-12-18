import React, { type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  const isActive = (path: string) => {
    // Exact match for home, startsWith for others to handle sub-routes
    if (path === '/') {
      return location.pathname === '/' ? "text-primary scale-110" : "text-slate-400 group-hover:text-white";
    }
    return location.pathname.startsWith(path) ? "text-primary scale-110" : "text-slate-400 group-hover:text-white";
  };

  const getTextClass = (path: string) => {
    if (path === '/') {
      return location.pathname === '/' ? "text-primary" : "text-slate-400 group-hover:text-white";
    }
    return location.pathname.startsWith(path) ? "text-primary" : "text-slate-400 group-hover:text-white";
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display antialiased min-h-screen flex flex-col md:flex-row">

      {/* Desktop Sidebar - Hidden on Mobile */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-200 dark:border-white/10 bg-background-dark h-screen sticky top-0 z-50">
        <div className="p-6">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">MatchPoint</h1>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {[{ path: '/', icon: 'dashboard', label: 'Home' },
          { path: '/tournaments', icon: 'emoji_events', label: 'Tournaments' },
          { path: '/players', icon: 'groups', label: 'Players' },
          { path: '/profile', icon: 'person', label: 'Profile' }
          ].map(item => (
            <Link key={item.path} to={item.path} className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all group ${(item.path === '/' && location.pathname === '/') || (item.path !== '/' && location.pathname.startsWith(item.path))
              ? "bg-primary/10 text-primary border border-primary/20"
              : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}>
              <span className={`material-symbols-outlined text-[24px] ${(item.path === '/' && location.pathname === '/') || (item.path !== '/' && location.pathname.startsWith(item.path))
                ? "text-primary" : "text-slate-400 group-hover:text-white"
                }`}>{item.icon}</span>
              <span className="font-bold text-sm">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <Link to="/tournaments/create" className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-accent text-background-dark font-bold hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-accent/20">
            <span className="material-symbols-outlined text-[20px]">add</span>
            Create Tournament
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 w-full pb-24 md:pb-0 relative overflow-x-hidden md:h-screen md:overflow-y-auto bg-background-dark">
        <div className="md:max-w-7xl md:mx-auto md:p-6 w-full">
          {children}
        </div>
      </main>

      {/* Bottom Navigation - Fixed Mobile Tab Bar - Hidden on Desktop */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0f1115]/90 backdrop-blur-lg border-t border-white/5 w-full pb-6 pt-2 px-6">
        <div className="flex items-center justify-between max-w-md mx-auto">

          {/* Home Tab */}
          <Link to="/" className="flex flex-col items-center justify-center gap-1 group">
            <span className={`material-symbols-outlined text-2xl transition-all duration-300 group-hover:scale-110 ${isActive('/').includes('text-primary') ? 'text-primary' : 'text-slate-500'}`}>
              home
            </span>
            <span className={`text-[10px] font-medium transition-colors ${getTextClass('/')}`}>
              Home
            </span>
          </Link>

          {/* Tournaments Tab */}
          <Link to="/tournaments" className="flex flex-col items-center justify-center gap-1 group">
            <span className={`material-symbols-outlined text-2xl transition-all duration-300 group-hover:scale-110 ${isActive('/tournaments').includes('text-primary') ? 'text-primary' : 'text-slate-500'}`}>
              emoji_events
            </span>
            <span className={`text-[10px] font-medium transition-colors ${getTextClass('/tournaments')}`}>
              Tourneys
            </span>
          </Link>

          {/* FAB - Center Action - Match Design's "Tennis Ball" or "Add" */}
          <div className="relative -mt-8">
            <Link to="/tournaments/create" className="flex items-center justify-center size-14 rounded-full bg-accent text-background-dark shadow-[0_0_15px_rgba(204,255,0,0.4)] border-4 border-background-dark hover:scale-105 active:scale-95 transition-transform z-50">
              <span className="material-symbols-outlined text-3xl font-bold">add</span>
            </Link>
          </div>

          {/* Players Tab */}
          <Link to="/players" className="flex flex-col items-center justify-center gap-1 group">
            <span className={`material-symbols-outlined text-2xl transition-all duration-300 group-hover:scale-110 ${isActive('/players').includes('text-primary') ? 'text-primary' : 'text-slate-500'}`}>
              groups
            </span>
            <span className={`text-[10px] font-medium transition-colors ${getTextClass('/players')}`}>
              Players
            </span>
          </Link>

          {/* Profile/Admin Tab */}
          <Link to="/profile" className="flex flex-col items-center justify-center gap-1 group">
            <span className={`material-symbols-outlined text-2xl transition-all duration-300 group-hover:scale-110 ${isActive('/profile').includes('text-primary') ? 'text-primary' : 'text-slate-500'}`}>
              person
            </span>
            <span className={`text-[10px] font-medium transition-colors ${getTextClass('/profile')}`}>
              Profile
            </span>
          </Link>

        </div>
      </nav>
    </div>
  );
};

export default Layout;