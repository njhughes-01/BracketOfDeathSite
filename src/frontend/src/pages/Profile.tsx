import React, { useState, useEffect } from "react";
import logger from "../utils/logger";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";
import { apiClient } from "../services/api";
import { useApi } from "../hooks/useApi";
import type { Player } from "../types/api";
import { Modal, Button, Input, Heading, Text, Stack, Container } from "../components/ui";
import ChangePasswordModal from "../components/auth/ChangePasswordModal";
import ProfileEditForm from "../components/profile/ProfileEditForm";
import MyTicketsSection from "./profile/MyTicketsSection";

const Profile: React.FC = () => {
  const { user, isAdmin, logout, refreshUser } = useAuth();
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Player[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
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
          logger.error("Search failed", error);
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
      logger.error("Failed to send verification email", err);
    }
  };

  const handleLinkPlayer = async (playerId: string) => {
    setIsLinking(true);
    try {
      await apiClient.linkPlayerToProfile(playerId);
      await refreshUser();
      setIsLinkModalOpen(false);
    } catch (error) {
      logger.error("Failed to link profile", error);
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
        <Heading level={2} className="mb-3">Not Signed In</Heading>
        <Text color="muted" className="mb-8 max-w-sm mx-auto leading-relaxed">
          Please sign in to view your profile and manage your tournament
          settings.
        </Text>
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
      <Container maxWidth="md" padding="md" className="space-y-8">
        {/* Verify Email Banner */}
        {user && user.emailVerified === false && (
          <Stack direction="responsive" align="center" justify="between" className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-yellow-500">
                warning
              </span>
              <div>
                <Text size="sm" color="white" className="font-bold text-yellow-500">
                  Verify your email address
                </Text>
                <Text size="xs" className="text-yellow-500/80">
                  Please verify your email to ensure account security.
                </Text>
              </div>
            </div>
            {verificationSent ? (
              <Text size="xs" color="success" className="font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">
                  check_circle
                </span>
                Sent
              </Text>
            ) : (
              <Button
                onClick={handleSendVerification}
                size="sm"
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
              >
                Verify Now
              </Button>
            )}
          </Stack>
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
              <Heading level={1} className="text-4xl font-black tracking-tight">
                {displayName}
              </Heading>
              <Text size="sm" className="font-bold font-mono bg-white/5 px-3 py-1 rounded-lg inline-block">
                {user.email}
              </Text>
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
              <Button
                onClick={logout}
                variant="danger"
                icon="logout"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        {/* Grid Layout for Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* My Player Stats */}
          <div className="bg-[#1c2230] rounded-3xl border border-white/5 p-6 space-y-4 hover:border-white/10 transition-colors flex flex-col h-full">
            <div className="flex items-center justify-between">
              <Heading level={4} className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">
                  analytics
                </span>
                Player Stats
              </Heading>
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
                        <Text size="xs" color="muted" className="uppercase tracking-wider font-bold mt-1">
                          Matches
                        </Text>
                      </div>
                      <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                        <div className="text-2xl font-black text-primary">
                          {playerStats?.totalPoints || 0}
                        </div>
                        <Text size="xs" color="muted" className="uppercase tracking-wider font-bold mt-1">
                          Total Points
                        </Text>
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
                  <Text size="sm" color="muted" className="max-w-xs mx-auto">
                    Link your account to a player profile to see your personal
                    statistics here.
                  </Text>
                  <Button
                    onClick={() => setIsLinkModalOpen(true)}
                    icon="link"
                    size="sm"
                    className="mt-2 shadow-lg shadow-primary/20"
                  >
                    Link Player Profile
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* My Tickets */}
          <MyTicketsSection />

          {/* Account Settings */}
          <div className="bg-[#1c2230] rounded-3xl border border-white/5 p-6 space-y-4 hover:border-white/10 transition-colors">
            <Heading level={4} className="flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-400">
                manage_accounts
              </span>
              Account Settings
            </Heading>
            <div className="py-2 space-y-3">
              {/* Edit Profile */}
              <div className="p-4 rounded-xl bg-background-dark border border-white/5 flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">person</span>
                  </div>
                  <div>
                    <Text size="sm" color="white" className="font-bold">Profile</Text>
                    <Text size="xs" color="muted">
                      Update your name and details
                    </Text>
                  </div>
                </div>
                <Button
                  onClick={() => setShowEditProfile(true)}
                  variant="ghost"
                  size="sm"
                  className="text-primary hover:text-white"
                >
                  Edit
                </Button>
              </div>

              {/* Password Change */}
              <div className="p-4 rounded-xl bg-background-dark border border-white/5 flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">lock</span>
                  </div>
                  <div>
                    <Text size="sm" color="white" className="font-bold">Password</Text>
                    <Text size="xs" color="muted">
                      Update your account password
                    </Text>
                  </div>
                </div>
                <Button
                  onClick={() => setShowChangePassword(true)}
                  variant="ghost"
                  size="sm"
                  className="text-primary hover:text-white"
                >
                  Change
                </Button>
              </div>

              {/* Transaction History */}
              <Link
                to="/profile/transactions"
                className="p-4 rounded-xl bg-background-dark border border-white/5 flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">receipt_long</span>
                  </div>
                  <div>
                    <Text size="sm" color="white" className="font-bold">Transaction History</Text>
                    <Text size="xs" color="muted">
                      View your ticket purchases and receipts
                    </Text>
                  </div>
                </div>
                <span className="text-xs font-bold text-primary hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
                  View
                </span>
              </Link>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-blue-600 rounded-2xl opacity-20 group-hover:opacity-40 blur transition duration-500"></div>
            <Stack direction="responsive" align="center" justify="between" className="relative bg-[#1c2230] rounded-xl p-6 border border-white/5">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-2xl">
                    shield
                  </span>
                </div>
                <div>
                  <Heading level={4} className="mb-1">
                    Admin Dashboard
                  </Heading>
                  <Text size="sm" color="muted">
                    Access system management tools and user controls
                  </Text>
                </div>
              </div>
              <Link
                to="/admin"
                className="w-full sm:w-auto px-6 py-3 bg-primary text-black font-bold rounded-xl hover:bg-white hover:scale-105 shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all"
              >
                <span className="material-symbols-outlined">dashboard</span>
                Open Dashboard
              </Link>
            </Stack>
          </div>
        )}
      </Container>

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}

      {/* Link Player Modal */}
      <Modal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        title="Link Player Profile"
        size="md"
      >
        <div className="space-y-4 relative">
              <Text size="sm" color="muted">
                Search for your player name to link it to your account. This
                allows you to track your stats.
              </Text>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-500">
                  search
                </span>
                <Input
                  type="text"
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-black/20 border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
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
                              <Text size="xs" color="muted">
                                {player.nickname
                                  ? `"${player.nickname}"`
                                  : player.email}
                              </Text>
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

          {isLinking && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10 flex-col gap-3">
              <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full"></div>
              <Text size="sm" color="white" className="font-bold">
                Linking Profile...
              </Text>
            </div>
          )}
        </div>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={showEditProfile && !!user}
        onClose={() => setShowEditProfile(false)}
        title="Edit Profile"
        size="md"
      >
        {user && (
          <ProfileEditForm
            user={user}
            onSave={async () => {
              await refreshUser();
              setShowEditProfile(false);
            }}
            onCancel={() => setShowEditProfile(false)}
          />
        )}
      </Modal>
    </div>
  );
};

export default Profile;
