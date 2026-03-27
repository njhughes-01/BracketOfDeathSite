import React, { useCallback, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useApi, useMutation } from "../hooks/useApi";
import { useAuth } from "../contexts/AuthContext";
import apiClient from "../services/api";
import { Heading, Text, Button, Stack, ResponsiveGrid } from "../components/ui";

const PlayerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<"tournaments" | "matches">(
    "tournaments",
  );

  const getPlayer = useCallback(() => apiClient.getPlayer(id!), [id]);
  const {
    data: playerResponse,
    loading,
    error,
  } = useApi(getPlayer, { immediate: true });

  const getPlayerResults = useCallback(
    () => apiClient.getResultsByPlayer(id!),
    [id],
  );
  const { data: resultsResponse, loading: resultsLoading } = useApi(
    getPlayerResults,
    { immediate: true },
  );

  const getPlayerScoring = useCallback(
    () => apiClient.getPlayerScoring(id!),
    [id],
  );
  const { data: scoringResponse } = useApi(getPlayerScoring, {
    immediate: true,
  });
  const scoring = scoringResponse as any;

  // Delete Mutation
  const { mutate: deletePlayer, loading: deleteLoading } = useMutation(
    () => apiClient.deletePlayer(id!),
    {
      onSuccess: () => navigate("/players"),
      onError: (err) => alert(`Failed to delete player: ${err}`),
    },
  );

  const handleDelete = () => {
    if (
      window.confirm(
        "Are you sure you want to delete this player? This action cannot be undone.",
      )
    ) {
      deletePlayer(undefined);
    }
  };

  const player = playerResponse as any;
  const resultsData = resultsResponse as any;
  const results = useMemo(() => resultsData?.results || [], [resultsData]);
  const playerStats = useMemo(() => resultsData?.stats, [resultsData]);

  if (loading || deleteLoading) {
    return (
      <div className="flex flex-col h-screen bg-background-dark animate-pulse">
        <div className="h-64 w-full bg-surface-dark/50"></div>
        <Stack gap={4} className="flex-1 p-6">
          <div className="h-8 w-1/3 bg-surface-dark/50 rounded"></div>
          <div className="h-32 bg-surface-dark/50 rounded-xl"></div>
        </Stack>
      </div>
    );
  }

  if (error || !player) {
    return (
      <Stack align="center" justify="center" className="h-screen bg-background-dark text-center px-4">
        <div className="size-20 bg-surface-dark rounded-full flex items-center justify-center mb-4 border border-white/5">
          <span className="material-symbols-outlined text-slate-500 text-3xl">
            person_off
          </span>
        </div>
        <Heading level={2} className="text-xl font-bold text-white mb-2">Player Not Found</Heading>
        <Text color="muted" className="mb-6">
          The player you are looking for does not exist or has been removed.
        </Text>
        <Button
          variant="primary"
          onClick={() => navigate("/players")}
          className="shadow-lg shadow-primary/20"
        >
          Return to Players
        </Button>
      </Stack>
    );
  }

  return (
    <div className="flex flex-col bg-background-dark min-h-screen pb-20">
      {/* Hero Header */}
      <div className="relative h-[280px] w-full bg-surface-dark overflow-hidden shrink-0">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-overlay"
          style={{
            backgroundImage:
              'url("https://lh3.googleusercontent.com/aida-public/AB6AXuArfVEx5fb164F7A5wImLDhdzfcSW6LnHlwPVwOrKjRtLggvCj1itnaz5XN7nguDVCtG-LIKOmQulidI4n8ALkhyEmAG1WYypbKjBR8KWR6SihPLdXTyQ6OVw2NM56nRlyL--H7QHfytRz4iv9oUd7UwpBJCICbEYfvaVsubL9Qu-PN1eg_0DlZqGLQWLtSp2YbjgvUmr-s78-PTfyVElfYP0csdy5hZELB8ii7cq42JsinCdWrqMiKi_dP9NWOKWtbx6ksXq8z4ZI")',
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-black/60"></div>

        {/* Navigation Bar inside Hero */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-20">
          <Link
            to="/players"
            className="size-10 rounded-full bg-black/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/20 transition-all"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <Stack direction="horizontal" gap={2}>
            {isAdmin && (
              <Button
                variant="danger"
                size="sm"
                icon="delete"
                onClick={handleDelete}
                className="size-10 !rounded-full backdrop-blur-md !p-0"
                title="Delete Player"
              />
            )}
            <Link
              to={`/players/${id}/edit`}
              className="size-10 rounded-full bg-black/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/20 transition-all"
            >
              <span className="material-symbols-outlined">edit</span>
            </Link>
          </Stack>
        </div>

        {/* Player Info */}
        <div className="absolute bottom-0 left-0 right-0 p-6 flex items-center gap-5 z-10">
          <div className="size-20 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 border-4 border-background-dark shadow-xl flex items-center justify-center text-3xl font-bold text-white relative">
            {player.name
              ? player.name
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()
              : "?"}
            {(player.winningPercentage || 0) >= 0.5 && (
              <div className="absolute -bottom-1 -right-1 bg-background-dark rounded-full p-1">
                <div className="size-6 flex items-center justify-center bg-accent text-black text-xs font-bold rounded-full border border-background-dark">
                  {(player.winningPercentage || 0) >= 0.8 ? "S" : "A"}
                </div>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 pb-2">
            <Heading level={1} className="text-3xl font-bold text-white leading-tight shadow-black drop-shadow-md truncate">
              {player.name}
            </Heading>
            <Text size="sm" color="muted" className="text-slate-300 font-medium">
              {player.pairing
                ? `Pairs with ${player.pairing}`
                : "Individual Player"}
            </Text>
          </div>
        </div>
      </div>

      {/* Content Container */}
      <Stack gap={6} className="flex-1 -mt-4 rounded-t-3xl bg-background-dark relative z-10 pt-6 px-4">
        {/* Key Stats Grid */}
        <ResponsiveGrid cols={{ mobile: 3, tablet: 3, desktop: 3 }} gap={3}>
          <div className="p-3 rounded-2xl bg-[#1c2230] border border-white/5 flex flex-col items-center justify-center gap-0.5 shadow-lg">
            <Text size="xs" className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
              Win Rate
            </Text>
            <span className="text-lg font-bold text-primary">
              {((player.winningPercentage || 0) * 100).toFixed(0)}%
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-[#1c2230] border border-white/5 flex flex-col items-center justify-center gap-0.5 shadow-lg">
            <Text size="xs" className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
              Games
            </Text>
            <span className="text-lg font-bold text-white">
              {player.gamesPlayed || 0}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-[#1c2230] border border-white/5 flex flex-col items-center justify-center gap-0.5 shadow-lg">
            <Text size="xs" className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
              Titles
            </Text>
            <span className="text-lg font-bold text-accent">
              {player.totalChampionships || 0}
            </span>
          </div>
        </ResponsiveGrid>

        {/* Detailed Stats Row (Scrollable) */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          <div className="min-w-[120px] p-4 rounded-xl bg-[#1c2230] border border-white/5">
            <Text size="xs" color="muted" className="block text-slate-500 mb-1">
              Avg Finish
            </Text>
            <span className="text-xl font-bold text-white">
              {player.avgFinish?.toFixed(1) || "-"}
            </span>
          </div>
          <div className="min-w-[120px] p-4 rounded-xl bg-[#1c2230] border border-white/5">
            <Text size="xs" color="muted" className="block text-slate-500 mb-1">
              Best Result
            </Text>
            <span className="text-xl font-bold text-white">
              {player.bestResult || "-"}
            </span>
          </div>
          {(scoring as any)?.data?.totalPoints > 0 && (
            <div className="min-w-[120px] p-4 rounded-xl bg-[#1c2230] border border-white/5">
              <Text size="xs" color="muted" className="block text-slate-500 mb-1">
                Live Points
              </Text>
              <span className="text-xl font-bold text-white">
                {(scoring as any).data.totalPoints}
              </span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab("tournaments")}
            className={`flex-1 pb-3 text-sm font-bold relative transition-colors ${activeTab === "tournaments" ? "text-primary" : "text-slate-500"}`}
          >
            Tournaments
            {activeTab === "tournaments" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full shadow-[0_-2px_10px_rgba(16,77,198,0.5)]"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab("matches")}
            className={`flex-1 pb-3 text-sm font-bold relative transition-colors ${activeTab === "matches" ? "text-primary" : "text-slate-500"}`}
          >
            Matches
            {activeTab === "matches" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full shadow-[0_-2px_10px_rgba(16,77,198,0.5)]"></div>
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="pb-8">
          {activeTab === "tournaments" && (
            <Stack gap={4}>
              {resultsLoading ? (
                <Stack gap={3}>
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-24 bg-[#1c2230] rounded-xl animate-pulse"
                    ></div>
                  ))}
                </Stack>
              ) : results.length > 0 ? (
                results.map((result: any) => {
                  const tournament = result.tournamentId;
                  const rank = result.totalStats?.finalRank;
                  const isWinner = rank === 1;

                  return (
                    <Link
                      key={result.id}
                      to={`/tournaments/${tournament?.id || tournament?._id}`}
                      className={`block p-4 rounded-xl border transition-all ${isWinner ? "bg-gradient-to-br from-[#1c2230] to-yellow-900/10 border-yellow-500/30" : "bg-[#1c2230] border-white/5 hover:border-white/10"}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <Heading level={3} className="text-white font-bold text-sm tracking-tight">
                            {tournament.name || `BOD #${tournament.bodNumber}`}
                          </Heading>
                          <Text size="xs" color="muted" as="span" className="text-slate-500">
                            {new Date(tournament.date).toLocaleDateString()}
                          </Text>
                        </div>
                        <div className="flex flex-col items-end">
                          <span
                            className={`text-lg font-bold leading-none ${isWinner ? "text-yellow-500" : "text-slate-400"}`}
                          >
                            {rank
                              ? rank === 1
                                ? "1st"
                                : rank === 2
                                  ? "2nd"
                                  : rank === 3
                                    ? "3rd"
                                    : `${rank}th`
                              : "-"}
                          </span>
                          <Text size="xs" as="span" className="text-[10px] text-slate-600 uppercase font-bold">
                            Rank
                          </Text>
                        </div>
                      </div>
                      <Stack direction="horizontal" gap={4} className="pt-2 border-t border-white/5">
                        <div className="flex flex-col">
                          <Text size="xs" as="span" className="text-[10px] text-slate-500 uppercase">
                            Record
                          </Text>
                          <Text size="xs" as="span" className="font-mono text-white">
                            {result.totalStats?.totalWon || 0}W -{" "}
                            {result.totalStats?.totalLost || 0}L
                          </Text>
                        </div>
                        <div className="flex flex-col">
                          <Text size="xs" as="span" className="text-[10px] text-slate-500 uppercase">
                            Seed
                          </Text>
                          <Text size="xs" as="span" className="font-mono text-white">
                            #{result.seed || "-"}
                          </Text>
                        </div>
                      </Stack>
                    </Link>
                  );
                })
              ) : (
                <Text color="muted" className="text-center py-10 text-sm">
                  No tournament history found
                </Text>
              )}
            </Stack>
          )}

          {activeTab === "matches" && (
            <Stack gap={4}>
              {resultsLoading ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-20 bg-[#1c2230] rounded-xl"></div>
                </div>
              ) : results.length > 0 ? (
                results.map((result: any) => {
                  return (
                    <div
                      key={result.id}
                      className="bg-[#1c2230] rounded-xl p-4 border border-white/5"
                    >
                      <Heading level={4} className="text-xs font-bold text-slate-400 uppercase mb-3">
                        {result.tournamentId?.name || "Tournament"} Matches
                      </Heading>
                      <ResponsiveGrid cols={{ mobile: 2, tablet: 2, desktop: 2 }} gap={2}>
                        <div className="bg-background-dark p-2 rounded border border-white/5 flex justify-between items-center">
                          <Text size="xs" as="span" color="muted">Total</Text>
                          <Text size="xs" as="span" color="white" className="font-bold">
                            {result.totalStats?.totalWon}W -{" "}
                            {result.totalStats?.totalLost}L
                          </Text>
                        </div>
                      </ResponsiveGrid>
                    </div>
                  );
                })
              ) : (
                <Text color="muted" className="text-center py-10 text-sm">
                  No match history found
                </Text>
              )}
            </Stack>
          )}
        </div>
      </Stack>
    </div>
  );
};

export default PlayerDetail;
