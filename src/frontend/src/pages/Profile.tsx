import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";
import { apiClient } from "../services/api";
import { useApi } from "../hooks/useApi";
import type { Player } from "../types/api";
import ChangePasswordModal from "../components/auth/ChangePasswordModal";

const Profile: React.FC = () => {
  const { user, isAdmin, logout, refreshUser } = useAuth();
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Player[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  // Fetch player stats if linked
  const {
    data: playerStats,
    loading: statsLoading,
    execute: fetchStats,
  } = useApi<{ matchesWithPoints: number; totalPoints: number }>(() =>
    user?.playerId
      ? apiClient.getPlayerScoring(user.playerId)
      : Promise.resolve({
          success: true,
          data: { matchesWithPoints: 0, totalPoints: 0 },
        }),
  );

  useEffect(() => {
    if (user?.playerId) {
      fetchStats();
    }
  }, [user?.playerId]);

  // Search players debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearching(true);
        try {
          const response = await apiClient.searchPlayers(searchQuery, {
            limit: 5,
          });
          setSearchResults(response.data);
        } catch (error) {
          console.error("Search failed", error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSendVerification = async () => {
    try {
      await apiClient.sendVerificationEmail();
      setVerificationSent(true);
    } catch (err) {
      console.error("Failed to send verification email", err);
    }
  };

  const handleLinkPlayer = async (playerId: string) => {
    setIsLinking(true);
    try {
      await apiClient.linkPlayerToProfile(playerId);
      await refreshUser();
      setIsLinkModalOpen(false);
    } catch (error) {
      console.error("Failed to link profile", error);
      // Optionally show toast error
    } finally {
      setIsLinking(false);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 bg-background-dark">
        <div className="size-24 rounded-full bg-[#1c2230] border border-white/5 flex items-center justify-center mb-6 shadow-xl">
          <span className="material-symbols-outlined text-slate-600 text-5xl">
            person_off
          </span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Not Signed In</h2>
        <p className="text-slate-400 mb-8 max-w-sm mx-auto leading-relaxed">
          Please sign in to view your profile and manage your tournament
          settings.
        </p>
        <Link
          to="/login"
          className="px-8 py-3 bg-primary text-black font-bold rounded-xl shadow-[0_0_20px_rgba(204,255,0,0.3)] hover:shadow-[0_0_30px_rgba(204,255,0,0.5)] hover:bg-white transition-all transform hover:scale-105 active:scale-95"
        >
          Sign In
        </Link>
      </div>
    );
  }

  // Generate initials
  const displayName = user.fullName || user.username;
  const initials = displayName
    ? displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "??";

  return (
    <div className="min-h-screen bg-background-dark pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Verify Email Banner */}
        {user && user.emailVerified === false && (
          <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-yellow-500">
                warning
              </span>
              <div>
                <p className="font-bold text-yellow-500">
                  Verify your email address
                </p>
                <p className="text-xs text-yellow-500/80">
                  Please verify your email to ensure account security.
                </p>
              </div>
            </div>
            {verificationSent ? (
              <span className="text-xs font-bold text-green-500 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">
                  check_circle
                </span>
                Sent
              </span>
            ) : (
              <button
                onClick={handleSendVerification}
                className="text-xs font-bold bg-yellow-500 hover:bg-yellow-400 text-black px-3 py-1.5 rounded-lg transition-colors"
              >
                Verify Now
              </button>
            )}
          </div>
        )}

        {/* Profile Header Card */}
        <div className="relative overflow-hidden rounded-3xl bg-[#1c2230] border border-white/5 shadow-2xl">
          {/* Background Decorative */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none"></div>
          <div className="absolute -top-20 -right-20 size-64 bg-primary/10 blur-[80px] rounded-full pointer-events-none"></div>

          <div className="relative p-8 md:p-10 flex flex-col md:flex-row items-center md:items-start gap-8">
            {/* Avatar */}
            <div className="relative group">
              <div className="size-32 rounded-full bg-gradient-to-br from-gray-800 to-black border-4 border-[#1c2230] shadow-xl flex items-center justify-center text-4xl font-black text-white relative z-10">
                {initials}
              </div>
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-110 group-hover:scale-125 transition-transform duration-500"></div>
              {isAdmin && (
                <div className="absolute -bottom-2 -right-2 z-20 bg-neon-accent text-black text-[10px] font-black tracking-widest px-3 py-1 rounded-full border-4 border-[#1c2230] shadow-lg">
                  ADMIN
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left space-y-2 pt-2">
              <h1 className="text-4xl font-black text-white tracking-tight">
                {displayName}
              </h1>
              <p className="text-slate-400 font-bold font-mono text-sm bg-white/5 px-3 py-1 rounded-lg inline-block">
                {user.email}
              </p>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start mt-4">
                {user.roles.map((role) => (
                  <span
                    key={role}
                    className="px-3 py-1 rounded-lg bg-black/40 border border-white/10 text-xs font-bold text-primary uppercase tracking-wider"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 min-w-[140px]">
              <button
                onClick={logout}
                className="px-6 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold border border-red-500/20 hover:border-red-500/40 transition-all flex items-center justify-center gap-2 group"
              >
                <span className="material-symbols-outlined text-[20px] group-hover:-translate-x-1 transition-transform">
                  logout
                </span>
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Grid Layout for Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* My Player Stats */}
          <div className="bg-[#1c2230] rounded-3xl border border-white/5 p-6 space-y-4 hover:border-white/10 transition-colors flex flex-col h-full">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">
                  analytics
                </span>
                Player Stats
              </h3>
              {user.playerId && (
                <Link
                  to={`/players/${user.playerId}`}
                  className="text-xs bg-white/5 hover:bg-white/10 text-primary px-3 py-1 rounded-lg border border-primary/20 transition-colors"
                >
                  View Full Profile
                </Link>
              )}
            </div>

            <div className="flex-1 flex flex-col justify-center">
              {user.playerId ? (
                statsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                  </div>
                ) : (
                  <div className="text-center space-y-6 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                        <div className="text-2xl font-black text-white">
                          {playerStats?.matchesWithPoints || 0}
                        </div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider font-bold mt-1">
                          Matches
                        </div>
                      </div>
                      <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                        <div className="text-2xl font-black text-primary">
                          {playerStats?.totalPoints || 0}
                        </div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider font-bold mt-1">
                          Total Points
                        </div>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="py-8 text-center space-y-4">
                  <div className="size-16 rounded-full bg-white/5 mx-auto flex items-center justify-center">
                    <span className="material-symbols-outlined text-slate-600 text-3xl">
                      link_off
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm max-w-xs mx-auto">
                    Link your account to a player profile to see your personal
                    statistics here.
                  </p>
                  <button
                    onClick={() => setIsLinkModalOpen(true)}
                    className="inline-flex items-center gap-2 mt-2 px-5 py-2.5 bg-primary text-black hover:bg-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary/20"
                  >
                    <span className="material-symbols-outlined text-sm">
                      link
                    </span>
                    Link Player Profile
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Account Settings Placeholder */}
          <div className="bg-[#1c2230] rounded-3xl border border-white/5 p-6 space-y-4 hover:border-white/10 transition-colors">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-400">
                manage_accounts
              </span>
              Account Settings
            </h3>
            <div className="py-2 space-y-3">
              {/* Password Change */}
              <div className="p-4 rounded-xl bg-background-dark border border-white/5 flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">lock</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Password</p>
                    <p className="text-xs text-slate-500">
                      Update your account password
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowChangePassword(true)}
                  className="text-xs font-bold text-primary hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  Change
                </button>
              </div>

              {/* Notifications - Hidden for Alpha
                            <div className="p-4 rounded-xl bg-background-dark border border-white/5 flex items-center justify-between opacity-50 cursor-not-allowed">
                                <div className="flex items-center gap-4">
                                    <div className="size-10 rounded-lg bg-white/5 flex items-center justify-center text-slate-500">
                                        <span className="material-symbols-outlined">notifications</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">Notifications</p>
                                        <p className="text-xs text-slate-500">Email preferences</p>
                                    </div>
                                </div>
                                <button className="text-xs font-bold text-slate-500 px-3 py-1.5" disabled>
                                    Manage
                                </button>
                            </div>
                            */}
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-blue-600 rounded-2xl opacity-20 group-hover:opacity-40 blur transition duration-500"></div>
            <div className="relative bg-[#1c2230] rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border border-white/5">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-2xl">
                    shield
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">
                    Admin Dashboard
                  </h3>
                  <p className="text-slate-400 text-sm">
                    Access system management tools and user controls
                  </p>
                </div>
              </div>
              <Link
                to="/admin"
                className="w-full sm:w-auto px-6 py-3 bg-primary text-black font-bold rounded-xl hover:bg-white hover:scale-105 shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all"
              >
                <span className="material-symbols-outlined">dashboard</span>
                Open Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}

      {/* Link Player Modal */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#1c2230] border border-white/10 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                Link Player Profile
              </h3>
              <button
                onClick={() => setIsLinkModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-slate-400">
                Search for your player name to link it to your account. This
                allows you to track your stats.
              </p>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-500">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                  autoFocus
                />
              </div>

              <div className="min-h-[200px] max-h-[300px] overflow-y-auto bg-black/20 rounded-xl border border-white/5 p-2">
                {isSearching ? (
                  <div className="flex items-center justify-center h-20 text-slate-500">
                    <div className="animate-spin size-5 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
                    Searching...
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-1">
                    {searchResults.map((player) => (
                      <button
                        key={player.id}
                        onClick={() => handleLinkPlayer(player.id)}
                        disabled={isLinking}
                        className="w-full text-left p-3 rounded-lg hover:bg-white/5 flex items-center justify-between group transition-colors disabled:opacity-50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs ring-1 ring-primary/20">
                            {player.firstName[0]}
                            {player.lastName[0]}
                          </div>
                          <div>
                            <div className="font-bold text-white group-hover:text-primary transition-colors">
                              {player.firstName} {player.lastName}
                            </div>
                            {(player.nickname || player.email) && (
                              <div className="text-xs text-slate-500">
                                {player.nickname
                                  ? `"${player.nickname}"`
                                  : player.email}
                              </div>
                            )}
                          </div>
                        </div>
                        <span className="material-symbols-outlined text-slate-600 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all">
                          link
                        </span>
                      </button>
                    ))}
                  </div>
                ) : searchQuery.length >= 2 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-slate-500">
                    <span className="material-symbols-outlined text-3xl mb-2 opacity-50">
                      person_search
                    </span>
                    No players found
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-slate-500">
                    <span className="material-symbols-outlined text-3xl mb-2 opacity-50">
                      keyboard
                    </span>
                    Type to search...
                  </div>
                )}
              </div>
            </div>

            {isLinking && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10 flex-col gap-3">
                <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full"></div>
                <span className="text-white font-bold text-sm">
                  Linking Profile...
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
