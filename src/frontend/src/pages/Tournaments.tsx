import React, { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { usePaginatedApi } from "../hooks/useApi";
import { useAuth } from "../contexts/AuthContext";
import apiClient from "../services/api";
import { getTournamentStatus } from "../utils/tournamentStatus";
import TournamentTable from "../components/tournament/TournamentTable";
import type {
  SortField,
  SortDirection,
} from "../components/tournament/TournamentTable";
import TournamentFilters from "../components/tournament/TournamentFilters";
import type { Tournament } from "../types/api";

const Tournaments: React.FC = () => {
  const { isAdmin, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    "All" | "Live" | "Upcoming" | "My Registered"
  >("All");

  // New sorting and filtering state
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [yearFilter, setYearFilter] = useState<number | null>(null);
  const [formatFilter, setFormatFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "cards">("cards");

  // Use usePaginatedApi
  const {
    data: tournaments,
    loading,
    refresh,
  } = usePaginatedApi<Tournament>(
    (page, filters) => apiClient.getTournaments({ page, ...filters }),
    { pageSize: 50, immediate: true },
  );

  // Get available years from tournaments
  const availableYears = useMemo(() => {
    if (!tournaments) return [];
    const years = new Set<number>();
    tournaments.forEach((t) => {
      const year = new Date(t.date).getFullYear();
      years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [tournaments]);

  // Filter and Sort Logic
  const filteredTournaments = useMemo(() => {
    if (!tournaments) return [];

    let filtered = [...tournaments];

    // Search Filter
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.bodNumber?.toString().includes(lowerTerm) ||
          t.location?.toLowerCase().includes(lowerTerm) ||
          t.format?.toLowerCase().includes(lowerTerm) ||
          t.champion?.playerName?.toLowerCase().includes(lowerTerm),
      );
    }

    // Year Filter
    if (yearFilter) {
      filtered = filtered.filter((t) => {
        const year = new Date(t.date).getFullYear();
        return year === yearFilter;
      });
    }

    // Format Filter
    if (formatFilter) {
      filtered = filtered.filter((t) => t.format === formatFilter);
    }

    // Status Filter (from dropdown)
    if (statusFilter) {
      filtered = filtered.filter((t) => {
        const status = getTournamentStatus(t.date);
        return status === statusFilter;
      });
    }

    // Status/Tab Filter (quick tabs)
    const now = new Date();
    if (activeFilter === "Upcoming") {
      filtered = filtered.filter((t) => new Date(t.date) > now);
    } else if (activeFilter === "Live") {
      filtered = filtered.filter(
        (t) => getTournamentStatus(t.date) === "active",
      );
    } else if (activeFilter === "My Registered") {
      if (user) {
        filtered = filtered.filter((t) =>
          t.players?.some((p) => p._id === user.id || p.name === user.username),
        );
      } else {
        filtered = [];
      }
    }

    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "date":
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case "bodNumber":
          comparison = (a.bodNumber || 0) - (b.bodNumber || 0);
          break;
        case "playerCount":
          const countA = a.players?.length || a.currentPlayerCount || 0;
          const countB = b.players?.length || b.currentPlayerCount || 0;
          comparison = countA - countB;
          break;
        case "location":
          comparison = (a.location || "").localeCompare(b.location || "");
          break;
        case "format":
          comparison = (a.format || "").localeCompare(b.format || "");
          break;
        case "status":
          const statusOrder = { active: 0, scheduled: 1, completed: 2 };
          const statusA = getTournamentStatus(a.date);
          const statusB = getTournamentStatus(b.date);
          comparison =
            (statusOrder[statusA as keyof typeof statusOrder] || 2) -
            (statusOrder[statusB as keyof typeof statusOrder] || 2);
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [
    tournaments,
    searchTerm,
    activeFilter,
    user,
    sortField,
    sortDirection,
    yearFilter,
    formatFilter,
    statusFilter,
  ]);

  const liveTournament = useMemo(() => {
    if (!tournaments) return null;
    return tournaments.find((t) => getTournamentStatus(t.date) === "active");
  }, [tournaments]);

  const handleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDirection((dir) => (dir === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDirection("desc");
      return field;
    });
  }, []);

  const handleSortChange = useCallback(
    (field: SortField, direction: SortDirection) => {
      setSortField(field);
      setSortDirection(direction);
    },
    [],
  );

  // Card view component (original design)
  const renderCardView = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 bg-card-dark rounded-xl animate-pulse"
            ></div>
          ))}
        </div>
      );
    }

    if (filteredTournaments.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="size-16 rounded-full bg-slate-100 dark:bg-card-dark flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-slate-400 text-3xl">
              sports_tennis
            </span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
            No tournaments found
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
            Try adjusting your filters.
          </p>
          <button
            onClick={() => {
              setActiveFilter("All");
              setSearchTerm("");
              setYearFilter(null);
              setFormatFilter(null);
              setStatusFilter(null);
            }}
            className="text-primary font-bold text-sm hover:underline"
          >
            Clear Filters
          </button>
        </div>
      );
    }

    return filteredTournaments.map((tournament) => {
      const date = new Date(tournament.date);
      const month = date.toLocaleString("default", { month: "short" });
      const day = date.getDate();
      const status = getTournamentStatus(tournament.date);
      const playerCount =
        tournament.players?.length || tournament.currentPlayerCount || 0;

      return (
        <Link
          key={tournament.id}
          to={`/tournaments/${tournament.id}`}
          className="flex flex-col rounded-xl bg-white dark:bg-card-dark p-4 shadow-sm border border-transparent hover:border-white/10 transition-all"
        >
          <div className="flex gap-4">
            {/* Date Box */}
            <div className="flex flex-col items-center justify-center h-14 w-14 rounded-lg bg-background-light dark:bg-surface-dark shrink-0 border border-gray-200 dark:border-white/5">
              <span
                className={`text-[10px] font-bold uppercase ${status === "active" ? "text-red-500" : "text-slate-500"}`}
              >
                {month}
              </span>
              <span className="text-xl font-bold text-slate-900 dark:text-white leading-none">
                {day}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <h3 className="text-base font-bold text-slate-900 dark:text-gray-100 truncate pr-2">{`BOD #${tournament.bodNumber}`}</h3>
                <span
                  className={`shrink-0 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                    status === "active"
                      ? "bg-primary/10 text-primary ring-primary/20"
                      : status === "scheduled"
                        ? "bg-green-500/10 text-green-500 ring-green-500/20"
                        : status === "completed"
                          ? "bg-gray-500/10 text-gray-400 ring-gray-500/20"
                          : "bg-blue-500/10 text-blue-400 ring-blue-500/20"
                  }`}
                >
                  {status === "active" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mr-1.5 animate-pulse" />
                  )}
                  {status === "active" ? "Live" : status}
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                {tournament.location}{" "}
                <span className="text-slate-700 dark:text-slate-600">•</span>{" "}
                {tournament.format}
              </p>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                  <span className="material-symbols-outlined text-[12px]">
                    group
                  </span>{" "}
                  {playerCount}
                  {tournament.maxPlayers
                    ? `/${tournament.maxPlayers}`
                    : ""}{" "}
                  Players
                </span>
                {/* Champion badge for completed tournaments */}
                {status === "completed" && tournament.champion && (
                  <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-yellow-500/10 text-yellow-500 ring-1 ring-inset ring-yellow-500/20">
                    <span className="material-symbols-outlined text-[12px]">
                      emoji_events
                    </span>{" "}
                    {tournament.champion.playerName}
                  </span>
                )}
                {/* Registration status badge */}
                {tournament.registrationStatus === "open" && (
                  <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-green-500/10 text-green-400 ring-1 ring-inset ring-green-500/20">
                    Open for Registration
                  </span>
                )}
                {tournament.isFull && (
                  <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-red-500/10 text-red-400 ring-1 ring-inset ring-red-500/20">
                    Full
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end justify-center shrink-0 pl-1">
              <span className="material-symbols-outlined text-slate-400 hover:text-white transition-colors">
                chevron_right
              </span>
            </div>
          </div>
        </Link>
      );
    });
  };

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark min-h-screen pb-24 relative overflow-hidden">
      {/* Header Section - Sticky */}
      <div className="flex-none bg-background-light dark:bg-background-dark z-10 border-b border-gray-200 dark:border-white/5 sticky top-0">
        {/* Top Bar */}
        <div className="flex items-center px-4 py-3 justify-between">
          <div className="flex items-center gap-3">
            {/* Admin Add Button in Header or user defaults */}
            {isAdmin && (
              <Link
                to="/tournaments/setup"
                className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors text-primary"
              >
                <span className="material-symbols-outlined text-[24px]">
                  add_circle
                </span>
              </Link>
            )}
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Tournaments
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
            {/* Notification */}
            <button className="relative p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
              <span className="material-symbols-outlined text-slate-600 dark:text-slate-400 text-[24px]">
                notifications
              </span>
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-neon-accent shadow-[0_0_8px_rgba(212,248,0,0.6)]"></span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-2">
          <div className="flex w-full items-center rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-white/5 h-11 focus-within:ring-2 focus-within:ring-primary/50 transition-all">
            <div className="pl-3 pr-2 flex items-center justify-center text-slate-400">
              <span className="material-symbols-outlined text-[20px]">
                search
              </span>
            </div>
            <input
              className="w-full bg-transparent border-none text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-0 p-0"
              placeholder="Search tournaments..."
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="pr-3 pl-2 flex items-center justify-center text-slate-400 hover:text-primary"
              >
                <span className="material-symbols-outlined text-[20px]">
                  close
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Chips / Tabs */}
        <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar items-center">
          {/* All Events */}
          <button
            onClick={() => setActiveFilter("All")}
            className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeFilter === "All"
                ? "bg-primary text-white shadow-lg shadow-primary/25"
                : "bg-white dark:bg-surface-dark border border-gray-200 dark:border-white/5 text-slate-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-white/5"
            }`}
          >
            <span>All Events</span>
          </button>

          {/* Live Now */}
          <button
            onClick={() => setActiveFilter("Live")}
            className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeFilter === "Live"
                ? "bg-primary text-white shadow-lg shadow-primary/25"
                : "bg-white dark:bg-surface-dark border border-gray-200 dark:border-white/5 text-slate-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-white/5"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full bg-neon-accent shadow-[0_0_6px_rgba(212,248,0,0.8)] ${activeFilter === "Live" ? "animate-none" : "animate-pulse"}`}
            ></span>
            <span>Live Now</span>
          </button>

          {/* Upcoming */}
          <button
            onClick={() => setActiveFilter("Upcoming")}
            className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeFilter === "Upcoming"
                ? "bg-primary text-white shadow-lg shadow-primary/25"
                : "bg-white dark:bg-surface-dark border border-gray-200 dark:border-white/5 text-slate-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-white/5"
            }`}
          >
            <span>Upcoming</span>
          </button>

          {/* My Registered */}
          <button
            onClick={() => setActiveFilter("My Registered")}
            className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeFilter === "My Registered"
                ? "bg-primary text-white shadow-lg shadow-primary/25"
                : "bg-white dark:bg-[#1c2230] border border-gray-200 dark:border-gray-700 text-slate-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            <span>My Registered</span>
          </button>
        </div>

        {/* Secondary Filters (Hidden for now or static) */}
        <div className="flex items-center justify-between px-4 pb-3 pt-1 border-t border-gray-100 dark:border-gray-800/50">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {filteredTournaments.length} Tournaments
          </p>
          {/* Sorting placeholder if needed */}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
        {/* Advanced Filters - Collapsible on mobile */}
        <TournamentFilters
          sortField={sortField}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          yearFilter={yearFilter}
          onYearChange={setYearFilter}
          formatFilter={formatFilter}
          onFormatChange={setFormatFilter}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          availableYears={availableYears}
        />

        {/* Featured Live Card */}
        {liveTournament && (
          <Link
            to={`/tournaments/${liveTournament.id}`}
            className="block group relative overflow-hidden rounded-2xl bg-surface-dark border border-primary/30 p-0 shadow-lg shadow-primary/5 transition-all hover:border-primary/50"
          >
            <div className="absolute top-0 right-0 p-3 z-10">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-neon-accent px-2.5 py-1 text-xs font-bold text-black shadow-[0_0_10px_rgba(212,248,0,0.4)] animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-black"></span>
                LIVE
              </span>
            </div>

            <div className="flex flex-col sm:flex-row">
              <div className="h-32 w-full sm:w-32 sm:h-auto relative bg-gray-800 shrink-0">
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-80 group-hover:opacity-100 transition-opacity"
                  style={{
                    backgroundImage:
                      'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAaQ_oN9Qgwao-ZSZQjJ9QDYpsp0T1EtvGSKNed9sv515fUBVPkGBinAC8i7NzoN5JtuieSEmeGVTXm6RQZ83QaCNln8_yJ_k-s_ykaCW5Pc4feD14_rEm_LNGMzEXHCxuO2E6Dw92yNK0Cj9vZ2TaLU3UgCR-UyGDC9OuZJ0IM9IV4ifggudKpav2PmqVd-ya5QgjG1IfpKrz6QEf-HfONtzH6L33t7o3CDuvT_0UuqkZR82nx_z9lAp_oLFHYk8304yP3arqsyHk")',
                  }}
                ></div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#1c2230] to-transparent sm:bg-gradient-to-r sm:from-transparent sm:to-[#1c2230]"></div>
              </div>

              <div className="flex-1 p-4 pt-2 sm:p-5 sm:pl-2">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">
                    Major Event
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-1 leading-tight">{`BOD #${liveTournament.bodNumber}`}</h3>
                <div className="flex items-center text-slate-400 text-xs mb-3 gap-2">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">
                      location_on
                    </span>{" "}
                    {liveTournament.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">
                      sports_tennis
                    </span>{" "}
                    {liveTournament.format}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-2 pt-3 border-t border-gray-700/50">
                  <div className="flex -space-x-2">
                    <div className="h-6 w-6 rounded-full ring-2 ring-[#1c2230] bg-gray-600"></div>
                    <div className="h-6 w-6 rounded-full ring-2 ring-[#1c2230] bg-gray-500"></div>
                    <div className="h-6 w-6 rounded-full ring-2 ring-[#1c2230] bg-gray-700 flex items-center justify-center text-[8px] text-white font-bold">
                      +{liveTournament.currentPlayerCount || 10}
                    </div>
                  </div>
                  <span className="text-neon-accent text-xs font-bold hover:underline flex items-center gap-1">
                    Watch Live{" "}
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "14px" }}
                    >
                      arrow_forward
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Tournament List/Table */}
        {viewMode === "table" ? (
          <div className="bg-surface-dark rounded-xl border border-white/5 overflow-hidden">
            <TournamentTable
              tournaments={filteredTournaments}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              loading={loading}
            />
          </div>
        ) : (
          <div className="space-y-4">{renderCardView()}</div>
        )}
      </div>
    </div>
  );
};

export default Tournaments;
