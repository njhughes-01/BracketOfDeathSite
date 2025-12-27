import React from "react";
import type { SortField, SortDirection } from "./TournamentTable";

interface TournamentFiltersProps {
  sortField: SortField;
  sortDirection: SortDirection;
  onSortChange: (field: SortField, direction: SortDirection) => void;
  yearFilter: number | null;
  onYearChange: (year: number | null) => void;
  formatFilter: string | null;
  onFormatChange: (format: string | null) => void;
  statusFilter: string | null;
  onStatusChange: (status: string | null) => void;
  viewMode: "table" | "cards";
  onViewModeChange: (mode: "table" | "cards") => void;
  availableYears?: number[];
}

const TournamentFilters: React.FC<TournamentFiltersProps> = ({
  sortField,
  sortDirection,
  onSortChange,
  yearFilter,
  onYearChange,
  formatFilter,
  onFormatChange,
  statusFilter,
  onStatusChange,
  viewMode,
  onViewModeChange,
  availableYears = [],
}) => {
  const formats = [
    "M",
    "W",
    "Mixed",
    "Men's Doubles",
    "Women's Doubles",
    "Mixed Doubles",
  ];
  const statuses = [
    { value: "scheduled", label: "Upcoming" },
    { value: "active", label: "Live" },
    { value: "completed", label: "Completed" },
  ];

  const sortOptions: { value: SortField; label: string }[] = [
    { value: "date", label: "Date" },
    { value: "bodNumber", label: "BOD #" },
    { value: "playerCount", label: "Players" },
    { value: "status", label: "Status" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-surface-dark rounded-xl border border-white/5">
      {/* Year Filter */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-500 uppercase font-bold">
          Year
        </label>
        <select
          value={yearFilter || ""}
          onChange={(e) =>
            onYearChange(e.target.value ? Number(e.target.value) : null)
          }
          className="bg-background-dark border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
        >
          <option value="">All Years</option>
          {availableYears.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {/* Format Filter */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-500 uppercase font-bold">
          Format
        </label>
        <select
          value={formatFilter || ""}
          onChange={(e) => onFormatChange(e.target.value || null)}
          className="bg-background-dark border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
        >
          <option value="">All Formats</option>
          {formats.map((format) => (
            <option key={format} value={format}>
              {format}
            </option>
          ))}
        </select>
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-500 uppercase font-bold">
          Status
        </label>
        <select
          value={statusFilter || ""}
          onChange={(e) => onStatusChange(e.target.value || null)}
          className="bg-background-dark border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
        >
          <option value="">All Status</option>
          {statuses.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-white/10 hidden sm:block" />

      {/* Sort Controls */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-500 uppercase font-bold">
          Sort
        </label>
        <select
          value={sortField}
          onChange={(e) =>
            onSortChange(e.target.value as SortField, sortDirection)
          }
          className="bg-background-dark border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          onClick={() =>
            onSortChange(sortField, sortDirection === "asc" ? "desc" : "asc")
          }
          className="p-1.5 rounded-lg bg-background-dark border border-white/10 hover:border-primary/50 hover:bg-primary/10 transition-all"
          title={sortDirection === "asc" ? "Ascending" : "Descending"}
        >
          <span className="material-symbols-outlined text-[18px] text-slate-400">
            {sortDirection === "asc" ? "arrow_upward" : "arrow_downward"}
          </span>
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* View Mode Toggle */}
      <div className="flex items-center gap-1 bg-background-dark rounded-lg p-1 border border-white/10">
        <button
          onClick={() => onViewModeChange("table")}
          className={`p-1.5 rounded transition-all ${
            viewMode === "table"
              ? "bg-primary text-white"
              : "text-slate-400 hover:text-white"
          }`}
          title="Table View"
        >
          <span className="material-symbols-outlined text-[18px]">
            table_rows
          </span>
        </button>
        <button
          onClick={() => onViewModeChange("cards")}
          className={`p-1.5 rounded transition-all ${
            viewMode === "cards"
              ? "bg-primary text-white"
              : "text-slate-400 hover:text-white"
          }`}
          title="Card View"
        >
          <span className="material-symbols-outlined text-[18px]">
            grid_view
          </span>
        </button>
      </div>
    </div>
  );
};

export default TournamentFilters;
