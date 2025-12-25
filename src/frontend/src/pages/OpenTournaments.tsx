import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import LoadingSpinner from "../components/ui/LoadingSpinner";

interface ITournament {
  _id: string;
  bodNumber: number;
  date: string;
  location: string;
  format: string;
  status: string;
  maxPlayers?: number;
  registeredPlayers: any[];
  waitlistPlayers: any[];
  notes?: string;
  registrationOpensAt?: string;
  registrationDeadline?: string;
}

const OpenTournaments: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const hasProfile = !!user?.playerId;
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
      const response = await axios.get("/api/tournaments/open");
      console.log("API Response:", JSON.stringify(response.data));
      setTournaments(response.data.data);
      console.log("Set tournaments:", response.data.data.length);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to load tournaments. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (tournamentId: string) => {
    // 1. Check Authentication
    if (!isAuthenticated) {
      navigate(
        `/login?returnUrl=${encodeURIComponent(window.location.pathname)}`,
      );
      return;
    }

    // 2. Check Profile
    // We assume useAuth provides `hasProfile` (boolean) or similar.
    // If not, we might need to check user payload or api.
    // Based on previous contexts, we might need to check if user has linked player.
    // For now, let's try to join. If 400 'Player ID required' or similar, we know.
    if (!hasProfile) {
      // Redirect to onboarding if we know they lack a profile
      navigate("/onboarding");
      return;
    }

    try {
      setJoiningId(tournamentId);

      // We need to pass playerId if we have it locally, or let backend infer from user.
      // Backend `join` implementation currently requires `playerId` in body if we didn't implement user lookup yet.
      // BUT, `TournamentController.ts` assumes `user.sub` is available.
      // Wait, my `TournamentController.ts` update had:
      // if (playerId) { ... } else { sendError(400, 'Player ID is required') }
      // So I MUST pass playerId.
      // Does `user` object have it?
      // I should look at `AuthContext`.

      // Assuming for now we rely on the backend to know the link or we fetch it.
      // Let's try to fetch current player profile first if we don't have it?
      // Or, let's update backend to look it up.
      // Actually, `AuthContext` usually loads the profile.

      // Let's Check AuthContext again to see if we have access to playerId.
      // For now I will assume we need to fetch it or finding it.
      // Actually, simpler: The user should be onboarding if they don't have a profile.
      // If they have a profile, we should handle it.

      // HACK: For this implementation, I will try to call join.
      // If it fails with "ID required", I'll fetch profile and retry.
      // But better: let's fetch profile.

      const profile = await axios.get("/api/players/me").catch(() => null);
      if (!profile || !profile.data.data) {
        navigate("/onboarding");
        return;
      }

      const playerId = profile.data.data._id;

      await axios.post(`/api/tournaments/${tournamentId}/join`, {
        playerId,
      });

      // Refresh list to show updated status
      await fetchOpenTournaments();
      alert("Successfully registered!"); // Simple feedback for now
    } catch (err: any) {
      console.error("Join failed:", err);
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
            // Calculate spots
            const registered = tournament.registeredPlayers.length;
            const max = tournament.maxPlayers || 32;
            const isFull = registered >= max;
            const userIsRegistered = false; // TODO: Check if current user is in list (need playerId)

            return (
              <div
                key={tournament._id}
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
                    onClick={() => handleJoin(tournament._id)}
                    disabled={joiningId === tournament._id}
                    className={`w-full py-4 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 ${
                      isFull
                        ? "bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-black border border-amber-500/20"
                        : "bg-primary text-black hover:bg-primary-dark shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)]"
                    }`}
                  >
                    {joiningId === tournament._id ? (
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
