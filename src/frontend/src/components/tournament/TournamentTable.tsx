import React from "react";
import { Link } from "react-router-dom";
import type { Tournament } from "../../types/api";
import { getTournamentStatus } from "../../utils/tournamentStatus";

export type SortField =
  | "date"
  | "bodNumber"
  | "playerCount"
  | "status"
  | "location"
  | "format";
export type SortDirection = "asc" | "desc";

interface TournamentTableProps {
  tournaments: Tournament[];
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  loading?: boolean;
}

const TournamentTable: React.FC<TournamentTableProps> = ({
  tournaments,
  sortField,
  sortDirection,
  onSort,
  loading = false,
}) => {
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <span className="material-symbols-outlined text-[14px] text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
          unfold_more
        </span>
      );
    }
    return (
      <span className="material-symbols-outlined text-[14px] text-primary">
        {sortDirection === "asc" ? "arrow_upward" : "arrow_downward"}
      </span>
    );
  };

  const SortableHeader = ({
    field,
    label,
    className = "",
  }: {
    field: SortField;
    label: string;
    className?: string;
  }) => (
    <th
      className={`text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-white transition-colors group ${className}`}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <SortIcon field={field} />
      </div>
    </th>
  );

  const getStatusBadge = (tournament: Tournament) => {
    const status = getTournamentStatus(tournament.date);
    const statusConfig = {
      active: {
        bg: "bg-primary/10",
        text: "text-primary",
        ring: "ring-primary/20",
        label: "Live",
      },
      scheduled: {
        bg: "bg-green-500/10",
        text: "text-green-500",
        ring: "ring-green-500/20",
        label: "Upcoming",
      },
      completed: {
        bg: "bg-gray-500/10",
        text: "text-gray-400",
        ring: "ring-gray-500/20",
        label: "Completed",
      },
    };
    const config =
      statusConfig[status as keyof typeof statusConfig] ||
      statusConfig.scheduled;

    return (
      <span
        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${config.bg} ${config.text} ${config.ring}`}
      >
        {status === "active" && (
          <span className="w-1.5 h-1.5 rounded-full bg-primary mr-1.5 animate-pulse" />
        )}
        {config.label}
      </span>
    );
  };

  const getRegistrationBadge = (tournament: Tournament) => {
    if (!tournament.registrationType) return null;

    const isOpen =
      tournament.registrationStatus === "open" || tournament.isRegistrationOpen;
    const isFull =
      tournament.isFull || tournament.registrationStatus === "full";

    if (isFull) {
      return (
        <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-red-500/10 text-red-400 ring-1 ring-inset ring-red-500/20">
          Full
        </span>
      );
    }
    if (isOpen) {
      return (
        <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-green-500/10 text-green-400 ring-1 ring-inset ring-green-500/20">
          Open
        </span>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-16 bg-surface-dark rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (tournaments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="size-16 rounded-full bg-card-dark flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-slate-400 text-3xl">
            sports_tennis
          </span>
        </div>
        <h3 className="text-lg font-bold text-white mb-1">
          No tournaments found
        </h3>
        <p className="text-slate-400 text-sm">
          Try adjusting your filters or search criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px]">
        <thead>
          <tr className="border-b border-white/10">
            <SortableHeader field="bodNumber" label="BOD #" className="w-20" />
            <SortableHeader field="date" label="Date" className="w-28" />
            <SortableHeader field="location" label="Location" />
            <SortableHeader field="format" label="Format" className="w-28" />
            <SortableHeader
              field="playerCount"
              label="Players"
              className="w-24"
            />
            <SortableHeader field="status" label="Status" className="w-28" />
            <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
              Champion
            </th>
            <th className="w-10"></th>
          </tr>
        </thead>
        <tbody>
          {tournaments.map((tournament) => {
            const date = new Date(tournament.date);
            const status = getTournamentStatus(tournament.date);
            const playerCount =
              tournament.players?.length || tournament.currentPlayerCount || 0;

            return (
              <tr
                key={tournament.id}
                className="border-b border-white/5 hover:bg-white/5 transition-colors group"
              >
                <td className="py-4 px-4">
                  <span className="text-white font-bold">
                    #{tournament.bodNumber}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <div className="flex flex-col">
                    <span className="text-white text-sm font-medium">
                      {date.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className="text-slate-500 text-xs">
                      {date.getFullYear()}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className="text-slate-300 text-sm">
                    {tournament.location}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-slate-700/50 text-slate-300">
                    {tournament.format}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium">
                      {playerCount}
                    </span>
                    {tournament.maxPlayers && (
                      <>
                        <span className="text-slate-600">/</span>
                        <span className="text-slate-500 text-sm">
                          {tournament.maxPlayers}
                        </span>
                      </>
                    )}
                    {getRegistrationBadge(tournament)}
                  </div>
                </td>
                <td className="py-4 px-4">{getStatusBadge(tournament)}</td>
                <td className="py-4 px-4">
                  {status === "completed" && tournament.champion ? (
                    <span className="text-yellow-500 text-sm font-medium flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">
                        emoji_events
                      </span>
                      {tournament.champion.playerName}
                    </span>
                  ) : (
                    <span className="text-slate-600 text-sm">—</span>
                  )}
                </td>
                <td className="py-4 px-4">
                  <Link
                    to={`/tournaments/${tournament.id}`}
                    className="text-slate-500 hover:text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      chevron_right
                    </span>
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TournamentTable;
