import React from "react";
import { Link } from "react-router-dom";
import type { Tournament } from "../../types/api";

interface TournamentHeaderProps {
  tournament: Tournament;
  isLive: boolean;
  isAdmin: boolean;
  onDelete: () => void;
}

const TournamentHeader: React.FC<TournamentHeaderProps> = ({
  tournament,
  isLive,
  isAdmin,
  onDelete,
}) => {
  return (
    <div className="relative h-[300px] w-full bg-surface-dark overflow-hidden shrink-0">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-60 mix-blend-overlay"
        style={{
          backgroundImage:
            'url("https://lh3.googleusercontent.com/aida-public/AB6AXuArfVEx5fb164F7A5wImLDhdzfcSW6LnHlwPVwOrKjRtLggvCj1itnaz5XN7nguDVCtG-LIKOmQulidI4n8ALkhyEmAG1WYypbKjBR8KWR6SihPLdXTyQ6OVw2NM56nRlyL--H7QHfytRz4iv9oUd7UwpBJCICbEYfvaVsubL9Qu-PN1eg_0DlZqGLQWLtSp2YbjgvUmr-s78-PTfyVElfYP0csdy5hZELB8ii7cq42JsinCdWrqMiKi_dP9NWOKWtbx6ksXq8z4ZI")',
        }}
      ></div>
      <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-black/60"></div>

      {/* Navigation Bar inside Hero */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-20">
        <Link
          to="/tournaments"
          className="size-10 rounded-full bg-black/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/20 transition-all"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div className="flex gap-2">
          <button className="size-10 rounded-full bg-black/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/20 transition-all">
            <span className="material-symbols-outlined">share</span>
          </button>
          {isAdmin && (
            <>
              <button
                onClick={onDelete}
                className="size-10 rounded-full bg-red-500/80 backdrop-blur-md text-white flex items-center justify-center hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                title="Delete Tournament"
              >
                <span className="material-symbols-outlined">delete</span>
              </button>
              <Link
                to={`/tournaments/${tournament.id}/edit`}
                className="size-10 rounded-full bg-white/10 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/20 transition-all"
              >
                <span className="material-symbols-outlined">edit</span>
              </Link>
              <Link
                to={`/tournaments/${tournament.id}/manage`}
                className="size-10 rounded-full bg-primary/80 backdrop-blur-md text-white flex items-center justify-center hover:bg-primary transition-all shadow-lg shadow-primary/20"
              >
                <span className="material-symbols-outlined">settings</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Tournament Info */}
      <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col gap-2 z-10">
        <div className="flex items-center gap-2 mb-1">
          {isLive && (
            <span className="px-2.5 py-1 rounded bg-accent text-black text-[10px] font-bold uppercase tracking-wider animate-pulse shadow-[0_0_10px_rgba(204,255,0,0.4)]">
              Live Now
            </span>
          )}
          <span className="px-2.5 py-1 rounded bg-white/10 backdrop-blur-md text-white border border-white/10 text-[10px] font-bold uppercase tracking-wider">
            {tournament.format}
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white leading-none shadow-black drop-shadow-lg">
          {`BOD Tournament #${tournament.bodNumber}`}
        </h1>
        <div className="flex items-center gap-4 text-white/80 text-sm font-medium mt-1">
          <span className="flex items-center gap-1.5 backdrop-blur-sm bg-black/20 px-2 py-0.5 rounded-lg">
            <span className="material-symbols-outlined text-[16px]">
              location_on
            </span>{" "}
            {tournament.location}
          </span>
          <span className="flex items-center gap-1.5 backdrop-blur-sm bg-black/20 px-2 py-0.5 rounded-lg">
            <span className="material-symbols-outlined text-[16px]">
              calendar_today
            </span>{" "}
            {new Date(tournament.date).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TournamentHeader;
