import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useBranding } from "../hooks/useBranding";
import { apiClient } from "../services/api";
import type { Tournament } from "../types/api";
import logger from "../utils/logger";

const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const branding = useBranding();

  const [openTournaments, setOpenTournaments] = useState<Tournament[]>([]);
  const [upcomingTournaments, setUpcomingTournaments] = useState<Tournament[]>(
    [],
  );
  const [recentTournaments, setRecentTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [openRes, upcomingRes, recentRes] = await Promise.all([
          apiClient.getOpenTournaments(),
          apiClient.getUpcomingTournaments(10),
          apiClient.getRecentTournaments(12),
        ]);
        setOpenTournaments(openRes.data || []);
        setUpcomingTournaments(upcomingRes.data || []);

        // Filter recent to only completed tournaments
        // Show past tournaments (date in the past OR status completed)
        const now = new Date();
        const past = (recentRes.data || []).filter(
          (t) => t.status === "completed" || new Date(t.date) < now,
        );
        setRecentTournaments(past.slice(0, 12));
      } catch (err) {
        logger.error("Failed to load landing page data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Merge open + upcoming, deduplicate by id, sort by date
  const futureTournaments = (() => {
    const map = new Map<string, Tournament>();
    for (const t of openTournaments) map.set(t.id || t._id, t);
    for (const t of upcomingTournaments) map.set(t.id || t._id, t);
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  })();

  const handleRegister = (tournamentId: string) => {
    if (!isAuthenticated) {
      navigate(
        `/login?returnUrl=${encodeURIComponent(`/tournaments/${tournamentId}`)}`,
      );
      return;
    }
    navigate(`/tournaments/${tournamentId}`);
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const formatShortDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const logoSrc = branding.siteLogo || branding.siteLogoUrl || null;

  return (
    <div className="min-h-screen bg-background-dark font-display text-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-10 blur-3xl"
            style={{ backgroundColor: branding.brandPrimaryColor }}
          />
          <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-accent opacity-5 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div className="text-center">
            {/* Logo */}
            {logoSrc && (
              <div className="flex justify-center mb-6">
                <img
                  src={logoSrc}
                  alt={branding.brandName}
                  className="h-20 sm:h-24 w-auto object-contain"
                />
              </div>
            )}

            {/* Brand Name */}
            <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-4">
              <span
                className="bg-clip-text text-transparent bg-gradient-to-r"
                style={{
                  backgroundImage: `linear-gradient(to right, ${branding.brandPrimaryColor}, #DFFF00)`,
                }}
              >
                {branding.brandName}
              </span>
            </h1>

            {/* Tagline */}
            <p className="text-xl sm:text-2xl text-slate-400 font-medium mb-10">
              Because Tennis
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg text-background-dark bg-accent hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-accent/20"
                >
                  <span className="material-symbols-outlined">dashboard</span>
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg text-background-dark bg-accent hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-accent/20"
                  >
                    <span className="material-symbols-outlined">
                      person_add
                    </span>
                    Register
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg border border-white/20 text-white hover:bg-white/5 active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined">login</span>
                    Login
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Open / Upcoming Tournaments */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center gap-3 mb-8">
          <span className="material-symbols-outlined text-3xl text-accent">
            emoji_events
          </span>
          <h2 className="text-3xl font-bold">Upcoming Tournaments</h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-card-dark rounded-2xl border border-white/5 h-64 animate-pulse"
              />
            ))}
          </div>
        ) : futureTournaments.length === 0 ? (
          <div className="text-center py-16 bg-card-dark rounded-2xl border border-white/5">
            <span className="material-symbols-outlined text-5xl text-slate-600 mb-3 block">
              event_busy
            </span>
            <p className="text-lg text-slate-400">
              No upcoming tournaments at the moment.
            </p>
            <p className="text-slate-500 mt-1">Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {futureTournaments.map((tournament) => {
              const registered =
                tournament.currentPlayerCount ??
                (tournament.registeredPlayers?.length || 0);
              const max = tournament.maxPlayers || 32;
              const isFull = registered >= max;
              const isOpen =
                tournament.status === "open" ||
                tournament.allowSelfRegistration;

              return (
                <div
                  key={tournament.id || tournament._id}
                  className="group relative bg-card-dark border border-white/5 rounded-2xl overflow-hidden hover:border-primary/40 transition-all duration-300"
                >
                  {/* Status bar */}
                  <div
                    className={`h-1 w-full ${isFull ? "bg-amber-500" : "bg-primary"}`}
                  />

                  <div className="p-6">
                    {/* Date */}
                    <div className="flex items-center gap-2 text-primary text-sm font-bold uppercase tracking-wider mb-3">
                      <span className="material-symbols-outlined text-lg">
                        calendar_month
                      </span>
                      {formatDate(tournament.date)}
                    </div>

                    {/* Location */}
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary transition-colors">
                      {tournament.location}
                    </h3>

                    {/* Info row */}
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-5">
                      <span className="material-symbols-outlined text-base">
                        format_list_numbered
                      </span>
                      BOD #{tournament.bodNumber}
                      <span className="mx-1 text-slate-600">|</span>
                      {tournament.format}
                    </div>

                    {/* Spots filled */}
                    <div className="space-y-2 mb-6">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Spots Filled</span>
                        <span
                          className={`font-bold ${isFull ? "text-amber-500" : "text-white"}`}
                        >
                          {registered} / {max}
                        </span>
                      </div>
                      <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isFull ? "bg-amber-500" : "bg-primary"}`}
                          style={{
                            width: `${Math.min((registered / max) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* CTA */}
                    {isOpen ? (
                      <button
                        onClick={() =>
                          handleRegister(tournament.id || tournament._id)
                        }
                        className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                          isFull
                            ? "bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-black border border-amber-500/20"
                            : "bg-primary text-black hover:bg-primary-dark"
                        }`}
                      >
                        {isFull ? "Join Waitlist" : "Register Now"}
                        <span className="material-symbols-outlined text-lg">
                          arrow_forward
                        </span>
                      </button>
                    ) : (
                      <div className="w-full py-3 rounded-xl text-sm text-center text-slate-500 border border-white/5">
                        Coming Soon
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Past Tournaments */}
      {recentTournaments.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center gap-3 mb-8">
            <span className="material-symbols-outlined text-3xl text-slate-400">
              history
            </span>
            <h2 className="text-3xl font-bold">Past Tournaments</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {recentTournaments.map((tournament) => (
              <div
                key={tournament.id || tournament._id}
                className="bg-card-dark border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors"
              >
                <div className="flex items-center gap-2 text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">
                  <span className="material-symbols-outlined text-sm">
                    calendar_month
                  </span>
                  {formatShortDate(tournament.date)}
                </div>
                <h3 className="font-bold text-white text-base mb-1">
                  {tournament.location}
                </h3>
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <span className="px-2 py-0.5 bg-white/5 rounded text-xs font-medium">
                    BOD #{tournament.bodNumber}
                  </span>
                  <span>{tournament.format}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Bottom CTA */}
      {!isAuthenticated && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 mb-8">
          <div
            className="relative rounded-2xl overflow-hidden border border-white/5 p-10 sm:p-14 text-center"
            style={{
              background: `linear-gradient(135deg, ${branding.brandPrimaryColor}15, transparent 60%)`,
            }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to Compete?
            </h2>
            <p className="text-slate-400 text-lg mb-8 max-w-lg mx-auto">
              Create your account and join the next Bracket of Death tournament.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg text-background-dark bg-accent hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-accent/20"
              >
                <span className="material-symbols-outlined">person_add</span>
                Register Now
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg border border-white/20 text-white hover:bg-white/5 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined">login</span>
                Login
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default LandingPage;
