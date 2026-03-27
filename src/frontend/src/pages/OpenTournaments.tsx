import React, { useEffect, useState } from "react";
import logger from "../utils/logger";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { apiClient } from "../services/api";
import { Heading, Text, Stack, Container, ResponsiveGrid, Button, LoadingSpinner } from "../components/ui";


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

  const handleJoin = (tournamentId: string) => {
    if (!isAuthenticated) {
      navigate(
        `/login?returnUrl=${encodeURIComponent(`/tournaments/${tournamentId}`)}`,
      );
      return;
    }

    navigate(`/tournaments/${tournamentId}`);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-background-dark font-display text-white">
      <Container maxWidth="xl" padding="md" className="py-12">
        <Heading level={1} responsive className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-green-400 mb-2">
          Open Tournaments
        </Heading>
        <Text size="lg" color="muted" className="mb-10">
          Discover and join upcoming Bracket of Death tournaments.
        </Text>

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
            <Text size="lg" color="muted" className="mt-4">
              No open tournaments at the moment.
            </Text>
            <Text color="muted" className="mt-2">
              Check back later for upcoming events!
            </Text>
          </div>
        )}

        <ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 3 }} gap={6}>
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

                <Stack direction="vertical" className="p-6">
                  <Stack direction="horizontal" justify="between" align="start" className="mb-4">
                    <Stack direction="horizontal" gap={2} align="center" className="text-primary font-bold tracking-wider text-sm uppercase">
                      <span className="material-symbols-outlined text-lg">
                        calendar_month
                      </span>
                      {new Date(tournament.date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Stack>
                    {isFull && (
                      <span className="px-3 py-1 bg-amber-500/10 text-amber-500 text-xs font-bold rounded-full border border-amber-500/20">
                        WAITLIST
                      </span>
                    )}
                  </Stack>

                  <Heading level={3} className="!text-2xl mb-2 group-hover:text-primary transition-colors">
                    {tournament.location}
                  </Heading>

                  <Stack direction="horizontal" gap={2} align="center" className="text-slate-400 text-sm mb-6">
                    <span className="material-symbols-outlined text-lg">
                      format_list_numbered
                    </span>
                    BOD #{tournament.bodNumber}
                    <span className="mx-2">•</span>
                    {tournament.format}
                  </Stack>

                  <Stack direction="vertical" gap={3} className="mb-8">
                    <Stack direction="horizontal" justify="between" className="text-sm">
                      <Text size="sm" color="muted">Spots Filled</Text>
                      <span
                        className={`font-bold ${isFull ? "text-amber-500" : "text-white"}`}
                      >
                        {registered} / {max}
                      </span>
                    </Stack>
                    {/* Progress Bar */}
                    <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isFull ? "bg-amber-500" : "bg-primary"}`}
                        style={{
                          width: `${Math.min((registered / max) * 100, 100)}%`,
                        }}
                      ></div>
                    </div>
                  </Stack>

                  <Button
                    variant={isFull ? "secondary" : "primary"}
                    fullWidth
                    onClick={() => handleJoin(tournament.id)}
                    icon="arrow_forward"
                    iconPosition="right"
                    className={isFull
                      ? "!bg-amber-500/10 !text-amber-500 hover:!bg-amber-500 hover:!text-black !border-amber-500/20"
                      : "shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)]"
                    }
                  >
                    {isFull ? "Join Waitlist" : "Register Now"}
                  </Button>
                </Stack>
              </div>
            );
          })}
        </ResponsiveGrid>
      </Container>
    </div>
  );
};

export default OpenTournaments;
