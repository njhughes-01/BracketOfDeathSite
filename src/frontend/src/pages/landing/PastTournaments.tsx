import React from "react";
import type { Tournament } from "../../types/api";

interface PastTournamentsProps {
  tournaments: Tournament[];
}

const formatShortDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const PastTournaments: React.FC<PastTournamentsProps> = ({ tournaments }) => {
  if (tournaments.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="flex items-center gap-3 mb-8">
        <span className="material-symbols-outlined text-3xl text-slate-400">
          history
        </span>
        <h2 className="text-3xl font-bold">Past Tournaments</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tournaments.map((tournament) => (
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
  );
};

export default PastTournaments;
