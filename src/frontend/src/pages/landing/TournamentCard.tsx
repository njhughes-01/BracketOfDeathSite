import React from "react";
import type { Tournament } from "../../types/api";

interface TournamentCardProps {
  tournament: Tournament;
  onRegister: (id: string) => void;
}

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const TournamentCard: React.FC<TournamentCardProps> = ({
  tournament,
  onRegister,
}) => {
  const registered =
    tournament.currentPlayerCount ??
    (tournament.registeredPlayers?.length || 0);
  const max = tournament.maxPlayers || 32;
  const isFull = registered >= max;
  const isOpen =
    tournament.status === "open" || tournament.allowSelfRegistration;

  return (
    <div className="group relative bg-card-dark border border-white/5 rounded-2xl overflow-hidden hover:border-primary/40 transition-all duration-300">
      <div className={`h-1 w-full ${isFull ? "bg-amber-500" : "bg-primary"}`} />

      <div className="p-6">
        <div className="flex items-center gap-2 text-primary text-sm font-bold uppercase tracking-wider mb-3">
          <span className="material-symbols-outlined text-lg">
            calendar_month
          </span>
          {formatDate(tournament.date)}
        </div>

        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary transition-colors">
          {tournament.location}
        </h3>

        <div className="flex items-center gap-2 text-slate-400 text-sm mb-5">
          <span className="material-symbols-outlined text-base">
            format_list_numbered
          </span>
          BOD #{tournament.bodNumber}
          <span className="mx-1 text-slate-600">|</span>
          {tournament.format}
        </div>

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

        {isOpen ? (
          <button
            onClick={() => onRegister(tournament.id || tournament._id)}
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
};

export default TournamentCard;
