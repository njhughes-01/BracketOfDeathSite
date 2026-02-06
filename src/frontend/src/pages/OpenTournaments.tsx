import React, { useEffect, useState } from "react";
import logger from "../utils/logger";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { apiClient } from "../services/api";
import LoadingSpinner from "../components/ui/LoadingSpinner";

interface ITournament {
  id: string;
  bodNumber: number;
  date: string;
  location: string;
  format: string;
  status: string;
  maxPlayers?: number;
  registeredPlayers?: any[];
  waitlistPlayers?: any[];
  notes?: string;
  registrationOpensAt?: string;
  registrationDeadline?: string;
}

const OpenTournaments: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<ITournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    fetchOpenTournaments();
  }, []);

  const fetchOpenTournaments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getOpenTournaments();
      setTournaments(response.data || []);
    } catch (err) {
      logger.error("Fetch error:", err);
      setError("Failed to load tournaments. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (tournamentId: string) => {
    if (!isAuthenticated) {
      navigate(
        `/login?returnUrl=${encodeURIComponent(window.location.pathname)}`,
      );
      return;
    }

    try {
      setJoiningId(tournamentId);

      const profileResponse = await apiClient.getProfile();
      const playerId = profileResponse.data?.player?._id || profileResponse.data?.user?.playerId;
      
      if (!playerId) {
        navigate("/onboarding");
        return;
      }

      await apiClient.joinTournament(tournamentId, playerId);

      // Refresh list to show updated status
      await fetchOpenTournaments();
      alert("Successfully registered!");
    } catch (err: any) {
      logger.error("Join failed:", err);
      const msg = err.response?.data?.error || "Failed to join tournament.";
      alert(msg);
    } finally {
      setJoiningId(null);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-background-dark font-display text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-green-400 mb-2">
          Open Tournaments
        </h1>
        <p className="text-slate-400 mb-10 text-lg">
          Discover and join upcoming Bracket of Death tournaments.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl mb-8">
            {error}
          </div>
        )}

        {tournaments.length === 0 && !loading && !error && (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10">
            <span className="material-symbols-outlined text-6xl text-slate-600 mb-4">
              event_busy
            </span>
            <p className="text-xl text-slate-400">
              No open tournaments at the moment.
            </p>
            <p className="text-slate-500 mt-2">
              Check back later for upcoming events!
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((tournament) => {
            const registeredPlayers = tournament.registeredPlayers || [];
            const registered = registeredPlayers.length;
            const max = tournament.maxPlayers || 32;
            const isFull = registered >= max;
            const userIsRegistered = user?.playerId 
              ? registeredPlayers.some(
                  (p: any) => (typeof p === 'string' ? p : p._id) === user.playerId
                )
              : false;

            return (
              <div
                key={tournament.id}
                className="group relative bg-[#1c2230] border border-white/5 rounded-3xl overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(34,197,94,0.1)]"
              >
                {/* Status Bar */}
                <div
                  className={`h-1.5 w-full ${isFull ? "bg-amber-500" : "bg-primary"}`}
                ></div>

                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2 text-primary font-bold tracking-wider text-sm uppercase">
                      <span className="material-symbols-outlined text-lg">
                        calendar_month
                      </span>
                      {new Date(tournament.date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                    {isFull && (
                      <span className="px-3 py-1 bg-amber-500/10 text-amber-500 text-xs font-bold rounded-full border border-amber-500/20">
                        WAITLIST
                      </span>
                    )}
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-primary transition-colors">
                    {tournament.location}
                  </h3>

                  <div className="flex items-center gap-2 text-slate-400 text-sm mb-6">
                    <span className="material-symbols-outlined text-lg">
                      format_list_numbered
                    </span>
                    BOD #{tournament.bodNumber}
                    <span className="mx-2">•</span>
                    {tournament.format}
                  </div>

                  <div className="space-y-3 mb-8">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Spots Filled</span>
                      <span
                        className={`font-bold ${isFull ? "text-amber-500" : "text-white"}`}
                      >
                        {registered} / {max}
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isFull ? "bg-amber-500" : "bg-primary"}`}
                        style={{
                          width: `${Math.min((registered / max) * 100, 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleJoin(tournament.id)}
                    disabled={joiningId === tournament.id}
                    className={`w-full py-4 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 ${
                      isFull
                        ? "bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-black border border-amber-500/20"
                        : "bg-primary text-black hover:bg-primary-dark shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)]"
                    }`}
                  >
                    {joiningId === tournament.id ? (
                      <span className="animate-pulse">Processing...</span>
                    ) : (
                      <>
                        <span>{isFull ? "Join Waitlist" : "Register Now"}</span>
                        <span className="material-symbols-outlined">
                          arrow_forward
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OpenTournaments;
