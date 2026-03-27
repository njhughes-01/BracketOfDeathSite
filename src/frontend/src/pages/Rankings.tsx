import React, { useState } from "react";
import logger from "../utils/logger";
import { useApi } from "../hooks/useApi";
import apiClient from "../services/api";
import { Link } from "react-router-dom";
import type { LeaderboardEntry } from "../types/api";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import YearRangeInput from "../components/YearRangeInput";
import { Heading, Text, Select, Stack } from "../components/ui";

const Rankings: React.FC = () => {
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [format, setFormat] = useState<string>("");
  const [sort, setSort] = useState<string>("-points");
  const DEFAULT_MIN_YEAR = 2008;
  const [availableRange, setAvailableRange] = useState<{
    min: number;
    max: number;
  }>({ min: DEFAULT_MIN_YEAR, max: new Date().getFullYear() });

  React.useEffect(() => {
    const fetchYears = async () => {
      try {
        const res = await apiClient.getAvailableYears();
        if (res && res.data) {
          setAvailableRange(res.data);
        }
      } catch (err) {
        logger.error("Failed to fetch available years", err);
      }
    };
    fetchYears();
  }, []);

  const getLeaderboard = React.useCallback(
    () =>
      apiClient.getLeaderboard({
        year: year !== "0" && year !== "" ? year : undefined,
        format: format || undefined,
        limit: 100,
        sort: sort,
      }),
    [year, format, sort],
  );

  const {
    data: response,
    loading,
    error,
  } = useApi(getLeaderboard, {
    immediate: true,
    dependencies: [year, format, sort],
  });

  const rankings = (response as LeaderboardEntry[]) || [];

  return (
    <div className="flex flex-col min-h-screen bg-background-dark pb-20">
      {/* Hero Header */}
      <div className="relative h-[250px] w-full bg-surface-dark overflow-hidden shrink-0">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-overlay rankings-hero-bg"
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-black/60"></div>

        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-20">
          <Link
            to="/dashboard"
            className="size-10 rounded-full bg-black/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/20 transition-all"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
          <Heading level={1} className="text-4xl font-bold text-white shadow-black drop-shadow-md mb-2">
            Rankings
          </Heading>
          <Text color="muted" className="text-slate-300">Top performers of the season</Text>
        </div>
      </div>

      {/* Filters & Sorting */}
      <div className="sticky top-0 z-20 bg-background-dark/80 backdrop-blur-md border-b border-white/5 py-4 px-4 overflow-x-auto">
        <Stack gap={3}>
          <Stack direction="horizontal" gap={3}>
            <YearRangeInput
              value={year}
              onChange={setYear}
              availableRange={availableRange}
            />

            <Select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              title="Filter by Format"
              fullWidth={false}
              size="sm"
              className="bg-[#1c2230] rounded-xl border-white/10"
            >
              <option value="">All Formats</option>
              <option value="Mixed">Mixed</option>
              <option value="M">Men's</option>
              <option value="W">Women's</option>
            </Select>
          </Stack>

          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {[
              { label: "Points", value: "-points" },
              { label: "Titles", value: "-totalChampionships" },
              { label: "Win Rate", value: "-winningPercentage" },
              { label: "Wins", value: "-totalWins" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setSort(option.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${sort === option.value
                  ? "bg-primary text-white"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                  }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </Stack>
      </div>

      {/* Leaderboard List */}
      <Stack gap={3} className="flex-1 p-4 max-w-4xl mx-auto w-full">
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <Text color="muted" className="text-center py-12">
            Failed to load rankings
          </Text>
        ) : rankings.length > 0 ? (
          rankings.map((player: LeaderboardEntry, index: number) => (
            <Link
              to={`/players/${player._id}`}
              key={player._id}
              className="flex items-center gap-4 bg-[#1c2230] p-4 rounded-xl border border-white/5 hover:border-white/10 transition-all group relative overflow-hidden"
            >
              {index < 3 && (
                <div
                  className={`absolute top-0 right-0 p-8 opacity-5 -translate-y-1/3 translate-x-1/3 rounded-full blur-2xl ${index === 0
                    ? "bg-yellow-500"
                    : index === 1
                      ? "bg-slate-300"
                      : "bg-amber-700"
                    }`}
                ></div>
              )}

              <div
                className={`size-8 flex items-center justify-center font-bold text-lg ${index === 0
                  ? "text-yellow-500"
                  : index === 1
                    ? "text-slate-300"
                    : index === 2
                      ? "text-amber-600"
                      : "text-slate-500"
                  }`}
              >
                #{index + 1}
              </div>

              <div className="size-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-sm ring-2 ring-transparent group-hover:ring-primary transition-all">
                {player.name?.[0]}
              </div>

              <div className="flex-1 min-w-0">
                <Heading level={3} className="text-white font-bold truncate group-hover:text-primary transition-colors text-base">
                  {player.name}
                </Heading>
                <Stack direction="horizontal" gap={3} align="center" className="text-xs text-slate-500">
                  <Text as="span" size="xs"
                    className={
                      sort === "-totalChampionships"
                        ? "text-primary font-bold"
                        : "text-slate-500"
                    }
                  >
                    {player.totalChampionships || 0} Titles
                  </Text>
                  <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                  <Text as="span" size="xs"
                    className={
                      sort === "-winningPercentage"
                        ? "text-primary font-bold"
                        : "text-slate-500"
                    }
                  >
                    {((player.winningPercentage || 0) * 100).toFixed(0)}% Win
                    Rate
                  </Text>
                  <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                  <Text as="span" size="xs"
                    className={
                      sort === "-totalWins" ? "text-primary font-bold" : "text-slate-500"
                    }
                  >
                    {player.totalWins}W-{player.totalLosses}L
                  </Text>
                </Stack>
              </div>

              <div className="text-right">
                <div
                  className={`text-xl font-bold ${sort === "-points" ? "text-primary" : "text-white"}`}
                >
                  {player.points || 0}
                </div>
                <Text size="xs" as="div" className="text-[10px] text-slate-500 uppercase tracking-wider">
                  PTS
                </Text>
              </div>
            </Link>
          ))
        ) : (
          <Text color="muted" className="text-center py-12">
            No rankings available for this filter
          </Text>
        )}
      </Stack>
    </div>
  );
};

export default Rankings;
