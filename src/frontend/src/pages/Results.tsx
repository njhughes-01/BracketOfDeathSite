import React, { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import apiClient from "../services/api";
import { Heading, Text, Button, Input, Select, FormField, Stack, Container, ResponsiveGrid, LoadingSpinner } from "../components/ui";

const Results: React.FC = () => {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    tournamentId: "",
    playerId: "",
    division: "",
    year: "",
    sort: "-tournament.date",
  });

  const getTournamentResults = useCallback(
    () =>
      apiClient.getTournamentResults({
        page,
        limit: 20,
        ...filters,
      }),
    [page, filters],
  );

  const {
    data: results,
    loading,
    error,
  } = useApi(getTournamentResults, {
    immediate: true,
    dependencies: [page, filters],
  });

  const getTournaments = useCallback(
    () => apiClient.getTournaments({ limit: 100 }),
    [],
  );

  const { data: tournaments } = useApi(getTournaments, { immediate: true });

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getPlacementColor = (placement: number) => {
    switch (placement) {
      case 1:
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/30";
      case 2:
        return "bg-slate-300/10 text-slate-300 border-slate-300/30";
      case 3:
        return "bg-orange-500/10 text-orange-500 border-orange-500/30";
      default:
        return "bg-blue-500/10 text-blue-500 border-blue-500/30";
    }
  };

  const getPlacementIcon = (placement: number) => {
    switch (placement) {
      case 1:
        return "🥇";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return "🏅";
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-20 min-h-screen bg-background-dark p-4">
      <Container maxWidth="xl" className="w-full">
        <Stack direction="vertical" gap={4}>
          {/* Header */}
          <Stack direction="horizontal" align="center" justify="between">
            <Heading level={1} className="!text-3xl tracking-tight">
              Tournament Results
            </Heading>
            <Link to="/tournaments">
              <Button variant="secondary" icon="emoji_events" size="sm">
                View Tournaments
              </Button>
            </Link>
          </Stack>

          {/* Filters */}
          <div className="p-5 bg-[#1c2230] rounded-2xl border border-white/5 shadow-xl">
            <ResponsiveGrid cols={{ base: 1, md: 2, lg: 4 }} gap={4}>
              <FormField label="Tournament">
                <Select
                  value={filters.tournamentId}
                  onChange={(e) =>
                    handleFilterChange("tournamentId", e.target.value)
                  }
                >
                  <option value="">All Tournaments</option>
                  {tournaments &&
                  "data" in tournaments &&
                  Array.isArray(tournaments.data)
                    ? tournaments.data.map((tournament: any) => (
                        <option key={tournament.id} value={tournament.id}>
                          #{tournament.bodNumber} - {tournament.location}
                        </option>
                      ))
                    : null}
                </Select>
              </FormField>

              <FormField label="Year">
                <Select
                  value={filters.year}
                  onChange={(e) => handleFilterChange("year", e.target.value)}
                >
                  <option value="">All Years</option>
                  {Array.from({ length: 16 }, (_, i) => 2024 - i).map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Division">
                <Input
                  type="text"
                  value={filters.division}
                  onChange={(e) => handleFilterChange("division", e.target.value)}
                  placeholder="All Divisions"
                />
              </FormField>

              <FormField label="Sort By">
                <Select
                  value={filters.sort}
                  onChange={(e) => handleFilterChange("sort", e.target.value)}
                >
                  <option value="-tournament.date">Date (Newest First)</option>
                  <option value="tournament.date">Date (Oldest First)</option>
                  <option value="totalStats.bodFinish">Best Finish First</option>
                  <option value="-totalStats.bodFinish">Worst Finish First</option>
                  <option value="-totalStats.winPercentage">Win % (High to Low)</option>
                  <option value="totalStats.winPercentage">Win % (Low to High)</option>
                  <option value="-totalStats.totalWon">Most Games Won</option>
                  <option value="tournament.bodNumber">BOD Number</option>
                </Select>
              </FormField>
            </ResponsiveGrid>
          </div>

          {/* Results List */}
          <div className="flex flex-col gap-4 min-h-[400px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <LoadingSpinner size="lg" />
                <Text color="muted" className="font-bold animate-pulse">
                  Loading results...
                </Text>
              </div>
            ) : error ? (
              <div className="text-center py-12 bg-red-500/5 rounded-xl border border-red-500/20">
                <div className="size-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="material-symbols-outlined text-red-500">error</span>
                </div>
                <Text className="text-red-400 font-bold mb-1">Error loading results</Text>
                <Text size="sm" color="muted">{error}</Text>
              </div>
            ) : results &&
              "data" in results &&
              Array.isArray(results.data) &&
              results.data.length > 0 ? (
              <Stack direction="vertical" gap={4}>
                {results.data.map((result: any) => (
                  <div
                    key={result.id}
                    className="bg-[#1c2230] rounded-2xl p-5 border border-white/5 hover:border-primary/50 transition-all shadow-lg hover:shadow-primary/5 group"
                  >
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                      <div className="flex items-center gap-5 w-full md:w-auto">
                        <div
                          className={`size-16 rounded-2xl flex items-center justify-center border-2 text-3xl shadow-[0_0_15px_rgba(0,0,0,0.3)] ${getPlacementColor(result.totalStats?.bodFinish || 0)}`}
                        >
                          {getPlacementIcon(result.totalStats?.bodFinish || 0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                            <Heading level={3} className="!text-xl font-black leading-tight group-hover:text-primary transition-colors">
                              {result.teamName || "Team"}
                            </Heading>
                            {result.totalStats?.bodFinish &&
                              result.totalStats?.bodFinish <= 3 && (
                                <span
                                  className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border ${getPlacementColor(result.totalStats?.bodFinish)}`}
                                >
                                  {result.totalStats?.bodFinish === 1
                                    ? "Champion"
                                    : result.totalStats?.bodFinish === 2
                                      ? "Finalist"
                                      : "3rd Place"}
                                </span>
                              )}
                          </div>
                          <Text size="sm" color="muted" className="font-medium">
                            BOD #{result.tournament?.bodNumber}{" "}
                            <span className="text-slate-600 mx-1">•</span>{" "}
                            {result.tournament?.location}
                          </Text>
                          <Text size="xs" color="muted" className="mt-1 font-mono">
                            {formatDate(result.tournament?.date || result.createdAt)}
                          </Text>
                        </div>
                      </div>

                      <div className="flex items-center justify-between w-full md:w-auto gap-10 pt-4 md:pt-0 border-t md:border-t-0 border-white/5">
                        <div className="text-center">
                          <Text className="!text-xl font-black text-white">
                            {result.totalStats?.totalWon || 0}
                          </Text>
                          <Text size="xs" color="muted" className="uppercase tracking-wider font-bold">
                            Won
                          </Text>
                        </div>

                        <div className="text-center">
                          <Text className="!text-xl font-black text-white">
                            {result.totalStats?.totalPlayed || 0}
                          </Text>
                          <Text size="xs" color="muted" className="uppercase tracking-wider font-bold">
                            Played
                          </Text>
                        </div>

                        <div className="text-center">
                          <Text className="!text-xl font-black text-accent">
                            {result.totalStats?.totalPlayed > 0
                              ? (
                                  (result.totalStats?.totalWon /
                                    result.totalStats?.totalPlayed) *
                                  100
                                ).toFixed(0) + "%"
                              : "0%"}
                          </Text>
                          <Text size="xs" color="muted" className="uppercase tracking-wider font-bold">
                            Win Rate
                          </Text>
                        </div>

                        <div className="flex flex-col items-end gap-2 ml-4">
                          <Link
                            to={`/tournaments/${result.tournamentId || result.tournament?.id || result.tournament?._id}`}
                            className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-white hover:bg-primary hover:text-black transition-all"
                          >
                            <span className="material-symbols-outlined text-[20px]">
                              arrow_forward
                            </span>
                          </Link>
                          <div className="text-[10px] font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded uppercase tracking-wider">
                            {result.division || "Open"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </Stack>
            ) : (
              <div className="text-center py-20 bg-[#1c2230] rounded-2xl border border-white/5 border-dashed flex flex-col items-center justify-center">
                <div className="size-20 bg-background-dark rounded-full flex items-center justify-center mb-6 text-5xl grayscale opacity-50">
                  📊
                </div>
                <Heading level={3} className="!text-xl mb-2">No results found</Heading>
                <Text color="muted" className="mb-8 max-w-sm">
                  We couldn't find any results matching your filters. Try
                  adjusting your search criteria.
                </Text>
                <Button
                  variant="secondary"
                  onClick={() =>
                    setFilters({
                      tournamentId: "",
                      playerId: "",
                      division: "",
                      year: "",
                      sort: "-tournament.date",
                    })
                  }
                >
                  Clear all filters
                </Button>
              </div>
            )}
          </div>

          {/* Pagination */}
          {results &&
            "pagination" in results &&
            (results as any).pagination &&
            (results as any).pagination.pages > 1 && (
              <Stack direction="horizontal" align="center" justify="center" gap={4} className="mt-8">
                <Button
                  variant="secondary"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  size="sm"
                >
                  Previous
                </Button>

                <Text size="sm" className="font-bold text-slate-400">
                  Page <span className="text-white">{page}</span> of{" "}
                  <span className="text-white">
                    {(results as any).pagination.pages}
                  </span>
                </Text>

                <Button
                  variant="secondary"
                  onClick={() => setPage(page + 1)}
                  disabled={
                    results && "pagination" in results
                      ? page === (results as any).pagination.pages
                      : true
                  }
                  size="sm"
                >
                  Next
                </Button>
              </Stack>
            )}
        </Stack>
      </Container>
    </div>
  );
};

export default Results;
