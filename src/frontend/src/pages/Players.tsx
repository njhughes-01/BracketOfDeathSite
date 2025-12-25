import React, { useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import apiClient from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import type { Player } from "../types/api";

const Players: React.FC = () => {
  const { isAdmin } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    winningPercentage_min: undefined as number | undefined,
    gamesPlayed_min: undefined as number | undefined,
    sort: "name",
  });

  const getPlayers = useCallback(() => {
    // Keep API contract
    const params = { page, limit: 50, ...filters };
    if (search.trim()) {
      return apiClient.searchPlayers(search.trim(), params);
    } else {
      return apiClient.getPlayers(params);
    }
  }, [page, filters, search]);

  const {
    data: playersData,
    loading,
    execute: refresh,
  } = useApi(getPlayers, {
    immediate: true,
    dependencies: [page, filters, search],
  });

  const playersList = useMemo(() => {
    if (
      !playersData ||
      !("data" in playersData) ||
      !Array.isArray(playersData.data)
    )
      return [];
    return playersData.data;
  }, [playersData]);

  // Handle Sort Change
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters((prev) => ({ ...prev, sort: e.target.value }));
  };

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark min-h-screen pb-24 relative overflow-hidden">
      {/* Header Section - Sticky */}
      <div className="flex-none bg-background-light dark:bg-background-dark z-10 border-b border-gray-200 dark:border-white/5 sticky top-0">
        {/* Top Bar */}
        <div className="flex items-center px-4 py-3 justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Players
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refresh()}
              className="relative p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined text-slate-600 dark:text-slate-400 text-[24px]">
                refresh
              </span>
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`relative p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors ${showFilters ? "text-primary" : "text-slate-600 dark:text-slate-400"}`}
            >
              <span className="material-symbols-outlined text-[24px]">
                tune
              </span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-2">
          <div className="flex w-full items-center rounded-xl bg-white dark:bg-[#1c2230] border border-gray-200 dark:border-gray-700 h-11 focus-within:ring-2 focus-within:ring-primary/50 transition-all">
            <div className="pl-3 pr-2 flex items-center justify-center text-slate-400">
              <span className="material-symbols-outlined text-[20px]">
                search
              </span>
            </div>
            <input
              className="w-full bg-transparent border-none text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-0 p-0"
              placeholder="Search players..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="pr-3 pl-2 flex items-center justify-center text-slate-400 hover:text-primary"
              >
                <span className="material-symbols-outlined text-[20px]">
                  close
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Filters Panel (Expandable) */}
        {showFilters && (
          <div className="px-4 py-3 bg-gray-50 dark:bg-white/5 border-t border-gray-200 dark:border-white/5 animate-in slide-in-from-top-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">
                  Sort By
                </label>
                <select
                  value={filters.sort}
                  onChange={handleSortChange}
                  className="w-full rounded-lg bg-white dark:bg-[#1c2230] border border-gray-200 dark:border-gray-700 text-sm py-2 pl-3 pr-8 focus:ring-primary focus:border-primary"
                >
                  <option value="name">Name (A-Z)</option>
                  <option value="-winningPercentage">Win Rate</option>
                  <option value="-totalChampionships">Championships</option>
                  <option value="-gamesPlayed">Games Played</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-20 bg-card-dark rounded-xl animate-pulse"
              ></div>
            ))}
          </div>
        ) : playersList.length > 0 ? (
          playersList.map((player: Player) => (
            <Link
              key={player.id}
              to={`/players/${player.id}`}
              className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-[#1c2230] border border-gray-200 dark:border-white/5 shadow-sm hover:border-primary/50 transition-all group active:scale-[0.99]"
            >
              <div className="relative shrink-0">
                {/* Avatar Placeholder with Initials */}
                <div className="size-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-white font-bold text-lg border-2 border-transparent group-hover:border-primary transition-all shadow-lg">
                  {player.name
                    ? player.name
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()
                    : "?"}
                </div>
                {/* Rank Badge for Top Players (Mock logic: if win rate > 0.5) */}
                {(player.winningPercentage || 0) >= 0.5 && (
                  <div className="absolute -bottom-1 -right-1 bg-background-dark rounded-full p-0.5">
                    <div className="size-5 flex items-center justify-center bg-accent text-black text-[10px] font-bold rounded-full border border-background-dark">
                      {(player.winningPercentage || 0) >= 0.8 ? "S" : "A"}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-0.5">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white truncate pr-2 group-hover:text-primary transition-colors">
                    {player.name}
                  </h3>
                  <div className="flex items-center gap-1">
                    {(player.totalChampionships || 0) > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded border border-yellow-500/20">
                        <span className="material-symbols-outlined text-[12px]">
                          trophy
                        </span>{" "}
                        {player.totalChampionships}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">
                      sports_tennis
                    </span>
                    <span>{player.gamesPlayed || 0} Games</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">
                      trending_up
                    </span>
                    <span>
                      {((player.winningPercentage || 0) * 100).toFixed(0)}% Win
                      Rate
                    </span>
                  </div>
                </div>
              </div>

              <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 group-hover:text-white transition-colors">
                chevron_right
              </span>
            </Link>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="size-16 rounded-full bg-slate-100 dark:bg-card-dark flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-slate-400 text-3xl">
                group_off
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              No players found
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Try adjusting your search.
            </p>
          </div>
        )}
      </div>

      {/* FAB for Admin */}
      {isAdmin && (
        <Link
          to="/players/create"
          className="absolute bottom-6 right-6 z-20 size-14 rounded-full bg-neon-accent text-black shadow-[0_0_20px_rgba(204,255,0,0.4)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-3xl font-bold">
            add
          </span>
        </Link>
      )}
    </div>
  );
};

export default Players;
