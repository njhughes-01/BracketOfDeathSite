import React from "react";
import type { Tournament } from "../../types/api";
import TournamentCard from "./TournamentCard";

interface UpcomingTournamentsProps {
  tournaments: Tournament[];
  loading: boolean;
  onRegister: (id: string) => void;
}

const UpcomingTournaments: React.FC<UpcomingTournamentsProps> = ({
  tournaments,
  loading,
  onRegister,
}) => (
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
    ) : tournaments.length === 0 ? (
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
        {tournaments.map((tournament) => (
          <TournamentCard
            key={tournament.id || tournament._id}
            tournament={tournament}
            onRegister={onRegister}
          />
        ))}
      </div>
    )}
  </section>
);

export default UpcomingTournaments;
