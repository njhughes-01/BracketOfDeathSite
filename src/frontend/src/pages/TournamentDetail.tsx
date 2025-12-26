import React, { useState, useCallback, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useApi, useMutation } from "../hooks/useApi";
import { useAuth } from "../contexts/AuthContext";
import apiClient from "../services/api";

import LiveStats from "../components/tournament/LiveStats";
import BracketView from "../components/tournament/BracketView";
import { getTournamentStatus } from "../utils/tournamentStatus";
import type { Tournament, Match, TournamentResult } from "../types/api";

const TournamentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "Overview" | "Standings" | "Matches" | "Players" | "Bracket"
  >("Overview");
  const [expandedRows, setExpandedRows] = useState<Set<string | number>>(
    new Set(),
  );

  const getTournament = useCallback(() => apiClient.getTournament(id!), [id]);
  const { data: tournamentWrapper, loading } = useApi(getTournament, {
    immediate: true,
  });

  const getMatches = useCallback(
    () => apiClient.getTournamentMatches(id!),
    [id],
  );
  const { data: matchesWrapper } = useApi(getMatches, { immediate: true });

  // Fetch tournament results (all historical data)
  const getResults = useCallback(
    () => apiClient.getResultsByTournament(id!),
    [id],
  );
  const { data: resultsWrapper } = useApi(getResults, { immediate: true });

  // Delete Mutation
  const { mutate: deleteTournament, loading: deleteLoading } = useMutation(
    () => apiClient.deleteTournament(id!),
    {
      onSuccess: () => navigate("/tournaments"),
      onError: (err) => alert(`Failed to delete tournament: ${err}`),
    },
  );

  const handleDelete = () => {
    if (
      window.confirm(
        "Are you sure you want to delete this tournament? This action cannot be undone.",
      )
    ) {
      deleteTournament(undefined);
    }
  };

  // Helper to safely extract tournament data
  const tournament = useMemo(() => {
    if (!tournamentWrapper) return null;
    if ("data" in tournamentWrapper)
      return tournamentWrapper.data as Tournament;
    return tournamentWrapper as unknown as Tournament;
  }, [tournamentWrapper]);

  const matches = useMemo(() => {
    if (!matchesWrapper) return [];
    if ("data" in matchesWrapper && Array.isArray(matchesWrapper.data))
      return matchesWrapper.data as Match[];
    return [];
  }, [matchesWrapper]);

  const results = useMemo(() => {
    if (!resultsWrapper) return [];
    // Cast to unknown first for safe type narrowing
    const wrapper = resultsWrapper as unknown;
    // Handle direct array format (legacy)
    if (Array.isArray(wrapper)) return wrapper as TournamentResult[];
    // Type guard for object with results property
    if (
      wrapper !== null &&
      typeof wrapper === "object" &&
      "results" in wrapper &&
      Array.isArray((wrapper as { results: unknown }).results)
    ) {
      return (wrapper as { results: TournamentResult[] }).results;
    }
    return [];
  }, [resultsWrapper]);

  const matchesByRound = useMemo(() => {
    if (!matches.length) return {};
    const grouped: Record<string, Match[]> = {};
    matches.forEach((m) => {
      if (!grouped[m.round]) grouped[m.round] = [];
      grouped[m.round].push(m);
    });
    return grouped;
  }, [matches]);

  // Get champion from results
  const champion = useMemo(() => {
    if (!results.length) return tournament?.champion;
    // Find the result with finalRank = 1 or bodFinish = 1
    const winner = results.find(
      (r) => r.totalStats?.finalRank === 1 || r.totalStats?.bodFinish === 1,
    );
    return winner;
  }, [results, tournament]);

  // Sort results by BOD finish position (1st, 2nd, 3rd, etc.)
  const sortedResults = useMemo(() => {
    if (!results.length) return [];
    return [...results].sort((a, b) => {
      // Prioritize bodFinish (actual placement 1, 2, 3...) over finalRank (suffering score)
      const rankA = a.totalStats?.bodFinish || 999;
      const rankB = b.totalStats?.bodFinish || 999;
      return rankA - rankB;
    });
  }, [results]);

  // Get finalist (rank 2) from sorted results
  const finalist = useMemo(() => {
    if (sortedResults.length < 2) return null;
    return sortedResults[1];
  }, [sortedResults]);

  // Calculate final match score (champion vs finalist bracket scores)
  const finalMatchScore = useMemo(() => {
    if (!champion || !finalist) return null;
    const champFinalsWon =
      (champion as TournamentResult).bracketScores?.finalsWon || 0;
    const finalistFinalsWon =
      (finalist as TournamentResult).bracketScores?.finalsWon || 0;
    if (champFinalsWon === 0 && finalistFinalsWon === 0) return null;
    return { champion: champFinalsWon, finalist: finalistFinalsWon };
  }, [champion, finalist]);

  // Calculate aggregate tournament statistics from results
  const tournamentStats = useMemo(() => {
    if (!results.length) return null;

    // Calculate totals (each game is counted twice - once per team, so divide by 2)
    const totalPlayed = results.reduce(
      (sum, r) => sum + (r.totalStats?.totalPlayed || 0),
      0,
    );
    const rrPlayed = results.reduce(
      (sum, r) => sum + (r.roundRobinScores?.rrPlayed || 0),
      0,
    );
    const bracketPlayed = results.reduce(
      (sum, r) => sum + (r.bracketScores?.bracketPlayed || 0),
      0,
    );
    const totalWon = results.reduce(
      (sum, r) => sum + (r.totalStats?.totalWon || 0),
      0,
    );
    const avgWinPct =
      results.reduce((sum, r) => sum + (r.totalStats?.winPercentage || 0), 0) /
      results.length;

    // Find highest scorer
    const highestScorer = results.reduce(
      (best, r) =>
        (r.totalStats?.totalWon || 0) > (best?.totalStats?.totalWon || 0)
          ? r
          : best,
      results[0],
    );

    return {
      totalTeams: results.length,
      totalGames: Math.round(totalPlayed / 2),
      rrGames: Math.round(rrPlayed / 2),
      bracketGames: Math.round(bracketPlayed / 2),
      totalWins: totalWon, // Total game wins across all teams
      avgWinPct,
      highestScorer,
    };
  }, [results]);

  const status = tournament
    ? getTournamentStatus(tournament.date)
    : "scheduled";
  const isLive = status === "active";

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-background-dark animate-pulse">
        <div className="h-64 w-full bg-surface-dark/50"></div>
        <div className="flex-1 p-6 space-y-4">
          <div className="h-8 w-1/3 bg-surface-dark/50 rounded"></div>
          <div className="h-32 bg-surface-dark/50 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="p-10 text-center text-gray-500">Tournament not found</div>
    );
  }

  const renderMatchList = () => {
    if (matches.length === 0)
      return (
        <div className="text-center py-10 text-gray-500">
          No matches scheduled yet
        </div>
      );

    const roundOrder = [
      "RR_R1",
      "RR_R2",
      "RR_R3",
      "quarterfinal",
      "semifinal",
      "final",
    ];
    const roundNames: Record<string, string> = {
      RR_R1: "Round Robin 1",
      RR_R2: "Round Robin 2",
      RR_R3: "Round Robin 3",
      quarterfinal: "Quarter Finals",
      semifinal: "Semi Finals",
      final: "Final",
    };

    // Sort rounds
    const rounds = Object.keys(matchesByRound).sort(
      (a, b) => roundOrder.indexOf(a) - roundOrder.indexOf(b),
    );

    return (
      <div className="space-y-6">
        {rounds.map((round) => (
          <div key={round} className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-px bg-white/10 flex-1"></div>
              <h4 className="text-slate-400 font-bold uppercase text-xs tracking-wider">
                {roundNames[round] || round}
              </h4>
              <div className="h-px bg-white/10 flex-1"></div>
            </div>

            {matchesByRound[round].map((match) => (
              <div
                key={match.id}
                className="bg-surface-dark rounded-xl p-4 border border-white/5 flex flex-col gap-3 shadow-lg"
              >
                {/* Meta Header */}
                <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                  <span>Match {match.matchNumber}</span>
                  <span
                    className={
                      match.status === "completed"
                        ? "text-green-500"
                        : "text-blue-500"
                    }
                  >
                    {match.status}
                  </span>
                </div>

                {/* Teams & Scores */}
                <div className="flex flex-col gap-3">
                  {/* Team 1 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Avatar placeholder */}
                      <div
                        className={`size-8 rounded-full border border-white/5 flex items-center justify-center text-xs font-bold ${match.team1.score && match.team2.score && match.team1.score > match.team2.score ? "bg-primary text-white" : "bg-gray-800 text-gray-400"}`}
                      >
                        {match.team1.teamName?.[0]}
                      </div>
                      <span
                        className={`text-base ${match.team1.score && match.team2.score && match.team1.score > match.team2.score ? "text-white font-bold" : "text-slate-400 font-medium"}`}
                      >
                        {match.team1.teamName}
                      </span>
                    </div>
                    <span
                      className={`text-lg font-mono ${match.team1.score && match.team2.score && match.team1.score > match.team2.score ? "text-primary font-bold" : "text-slate-500"}`}
                    >
                      {match.team1.score}
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-white/5 w-full"></div>

                  {/* Team 2 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`size-8 rounded-full border border-white/5 flex items-center justify-center text-xs font-bold ${match.team2.score && match.team1.score && match.team2.score > match.team1.score ? "bg-primary text-white" : "bg-gray-800 text-gray-400"}`}
                      >
                        {match.team2.teamName?.[0]}
                      </div>
                      <span
                        className={`text-base ${match.team2.score && match.team1.score && match.team2.score > match.team1.score ? "text-white font-bold" : "text-slate-400 font-medium"}`}
                      >
                        {match.team2.teamName}
                      </span>
                    </div>
                    <span
                      className={`text-lg font-mono ${match.team2.score && match.team1.score && match.team2.score > match.team1.score ? "text-primary font-bold" : "text-slate-500"}`}
                    >
                      {match.team2.score}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col bg-background-dark min-h-screen pb-20">
      {/* Hero Header */}
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
                  onClick={handleDelete}
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

      {/* Content Container */}
      <div className="flex-1 -mt-6 rounded-t-3xl bg-background-dark relative z-10 overflow-hidden flex flex-col">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 p-6 pb-2">
          <div className="p-4 rounded-2xl bg-[#1c2230] border border-white/5 flex flex-col items-center justify-center gap-1 shadow-lg">
            <span className="text-3xl font-bold text-white">
              {tournament.currentPlayerCount ||
                tournament.players?.length ||
                results.length ||
                0}
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
              Players
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-[#1c2230] border border-white/5 flex flex-col items-center justify-center gap-1 shadow-lg">
            <span className="text-3xl font-bold text-primary">
              {tournament.maxPlayers || "-"}
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
              Capacity
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-white/5">
          <div className="flex gap-6 overflow-x-auto no-scrollbar">
            {["Overview", "Standings", "Matches", "Players", "Bracket"].map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`pb-4 text-sm font-bold relative shrink-0 transition-colors ${
                    activeTab === tab
                      ? "text-primary"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full shadow-[0_-2px_10px_rgba(16,77,198,0.5)]"></div>
                  )}
                </button>
              ),
            )}
          </div>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 p-6">
          {activeTab === "Overview" && (
            <div className="space-y-6">
              {/* Champion & Finalist Section */}
              {champion && status === "completed" && (
                <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 rounded-2xl p-6 border border-yellow-500/20 shadow-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-yellow-500 text-2xl">
                      emoji_events
                    </span>
                    <h3 className="text-white font-bold text-lg">
                      Final Results
                    </h3>
                  </div>

                  {/* Champion and Finalist Grid */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Champion */}
                    <div className="bg-black/20 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="size-12 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center text-black font-bold text-lg shadow-lg shadow-yellow-500/30">
                          🏆
                        </div>
                        <div>
                          <p className="text-[10px] text-yellow-500 uppercase tracking-wider font-bold">
                            Champion
                          </p>
                          <p className="text-white font-bold">
                            {"players" in champion &&
                            Array.isArray(
                              (champion as TournamentResult).players,
                            )
                              ? (champion as TournamentResult).players
                                  .map((p: any) =>
                                    typeof p === "object" && "name" in p
                                      ? p.name
                                      : p,
                                  )
                                  .join(" & ")
                              : "playerName" in champion
                                ? (champion as { playerName?: string })
                                    .playerName
                                : "Champion"}
                          </p>
                        </div>
                      </div>
                      {"totalStats" in champion && (
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="bg-black/30 rounded-lg p-2">
                            <p className="text-yellow-500 font-bold">
                              {(champion as TournamentResult).totalStats
                                ?.totalWon || 0}
                              -
                              {(champion as TournamentResult).totalStats
                                ?.totalLost || 0}
                            </p>
                            <p className="text-slate-500 text-[10px] uppercase">
                              Total
                            </p>
                          </div>
                          {"roundRobinScores" in champion && (
                            <div className="bg-black/30 rounded-lg p-2">
                              <p className="text-blue-400 font-bold">
                                {(champion as TournamentResult).roundRobinScores
                                  ?.rrWon || 0}
                                -
                                {(champion as TournamentResult).roundRobinScores
                                  ?.rrLost || 0}
                              </p>
                              <p className="text-slate-500 text-[10px] uppercase">
                                RR
                              </p>
                            </div>
                          )}
                          {"bracketScores" in champion && (
                            <div className="bg-black/30 rounded-lg p-2">
                              <p className="text-purple-400 font-bold">
                                {(champion as TournamentResult).bracketScores
                                  ?.bracketWon || 0}
                                -
                                {(champion as TournamentResult).bracketScores
                                  ?.bracketLost || 0}
                              </p>
                              <p className="text-slate-500 text-[10px] uppercase">
                                Bracket
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                      {/* Champion Suffering Score */}
                      {tournament.championSufferingScore !== undefined &&
                        tournament.championSufferingScore !== null && (
                          <div className="mt-2 text-center">
                            <span className="text-[10px] text-yellow-500/70 uppercase tracking-wider font-bold">
                              Suffering Score:{" "}
                            </span>
                            <span className="text-yellow-400 font-bold text-sm">
                              {tournament.championSufferingScore.toFixed(2)}
                            </span>
                          </div>
                        )}
                    </div>

                    {/* Finalist */}
                    {finalist && (
                      <div className="bg-black/20 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="size-12 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-black font-bold text-lg shadow-lg">
                            🥈
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                              Finalist
                            </p>
                            <p className="text-white font-bold">
                              {finalist.players &&
                              Array.isArray(finalist.players)
                                ? finalist.players
                                    .map((p: any) =>
                                      typeof p === "object" && "name" in p
                                        ? p.name
                                        : p,
                                    )
                                    .join(" & ")
                                : "Finalist"}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="bg-black/30 rounded-lg p-2">
                            <p className="text-slate-300 font-bold">
                              {finalist.totalStats?.totalWon || 0}-
                              {finalist.totalStats?.totalLost || 0}
                            </p>
                            <p className="text-slate-500 text-[10px] uppercase">
                              Total
                            </p>
                          </div>
                          <div className="bg-black/30 rounded-lg p-2">
                            <p className="text-blue-400 font-bold">
                              {finalist.roundRobinScores?.rrWon || 0}-
                              {finalist.roundRobinScores?.rrLost || 0}
                            </p>
                            <p className="text-slate-500 text-[10px] uppercase">
                              RR
                            </p>
                          </div>
                          <div className="bg-black/30 rounded-lg p-2">
                            <p className="text-purple-400 font-bold">
                              {finalist.bracketScores?.bracketWon || 0}-
                              {finalist.bracketScores?.bracketLost || 0}
                            </p>
                            <p className="text-slate-500 text-[10px] uppercase">
                              Bracket
                            </p>
                          </div>
                        </div>
                        {/* Finalist Suffering Score */}
                        {tournament.finalistSufferingScore !== undefined &&
                          tournament.finalistSufferingScore !== null && (
                            <div className="mt-2 text-center">
                              <span className="text-[10px] text-slate-400/70 uppercase tracking-wider font-bold">
                                Suffering Score:{" "}
                              </span>
                              <span className="text-slate-400 font-bold text-sm">
                                {tournament.finalistSufferingScore.toFixed(2)}
                              </span>
                            </div>
                          )}
                      </div>
                    )}
                  </div>

                  {/* Final Match Score */}
                  {finalMatchScore && (
                    <div className="mt-4 text-center">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">
                        Final Match
                      </p>
                      <div className="inline-flex items-center gap-3 bg-black/30 rounded-xl px-6 py-3">
                        <span className="text-yellow-500 font-bold text-2xl">
                          {finalMatchScore.champion}
                        </span>
                        <span className="text-slate-500 text-lg">-</span>
                        <span className="text-slate-400 font-bold text-2xl">
                          {finalMatchScore.finalist}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tournament Statistics Section */}
              {tournamentStats && (
                <div className="bg-[#1c2230] rounded-2xl p-6 border border-white/5 shadow-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-primary">
                      analytics
                    </span>
                    <h3 className="text-white font-bold text-lg">
                      Tournament Statistics
                    </h3>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="bg-background-dark rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-primary">
                        {tournamentStats.totalTeams}
                      </p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                        Teams
                      </p>
                    </div>
                    <div className="bg-background-dark rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-white">
                        {tournamentStats.totalGames}
                      </p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                        Total Games
                      </p>
                    </div>
                    <div className="bg-background-dark rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-blue-400">
                        {tournamentStats.rrGames}
                      </p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                        Round Robin
                      </p>
                    </div>
                    <div className="bg-background-dark rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-purple-400">
                        {tournamentStats.bracketGames}
                      </p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                        Bracket Games
                      </p>
                    </div>
                  </div>

                  {/* Additional Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-background-dark rounded-lg p-3">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">
                        Average Win Rate
                      </span>
                      <span className="text-white text-lg font-bold">
                        {(tournamentStats.avgWinPct * 100).toFixed(1)}%
                      </span>
                    </div>
                    {tournamentStats.highestScorer && (
                      <div className="bg-background-dark rounded-lg p-3">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">
                          Most Wins
                        </span>
                        <span className="text-white text-sm font-medium">
                          {tournamentStats.highestScorer.players &&
                          Array.isArray(tournamentStats.highestScorer.players)
                            ? tournamentStats.highestScorer.players
                                .map((p: any) =>
                                  typeof p === "object" && "name" in p
                                    ? p.name
                                    : p,
                                )
                                .join(" & ")
                            : "Team"}{" "}
                          <span className="text-primary">
                            (
                            {tournamentStats.highestScorer.totalStats
                              ?.totalWon || 0}{" "}
                            wins)
                          </span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Historical Tournament Statistics (from Excel) */}
                  {(tournament.tiebreakers !== undefined ||
                    tournament.avgGames !== undefined ||
                    tournament.avgRRGames !== undefined) && (
                    <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-white/10">
                      {tournament.tiebreakers !== undefined &&
                        tournament.tiebreakers !== null && (
                          <div className="bg-background-dark rounded-lg p-3 text-center">
                            <p className="text-xl font-bold text-orange-400">
                              {tournament.tiebreakers}
                            </p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                              Tiebreakers
                            </p>
                          </div>
                        )}
                      {tournament.avgGames !== undefined &&
                        tournament.avgGames !== null && (
                          <div className="bg-background-dark rounded-lg p-3 text-center">
                            <p className="text-xl font-bold text-emerald-400">
                              {tournament.avgGames.toFixed(1)}
                            </p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                              Avg Games/Team
                            </p>
                          </div>
                        )}
                      {tournament.avgRRGames !== undefined &&
                        tournament.avgRRGames !== null && (
                          <div className="bg-background-dark rounded-lg p-3 text-center">
                            <p className="text-xl font-bold text-cyan-400">
                              {tournament.avgRRGames.toFixed(1)}
                            </p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                              Avg RR Games
                            </p>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              )}

              {/* Tournament Info Section */}
              {(tournament.location ||
                tournament.notes ||
                tournament.photoAlbums ||
                tournament.advancementCriteria) && (
                <div className="bg-[#1c2230] rounded-2xl p-6 border border-white/5 shadow-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-primary">
                      info
                    </span>
                    <h3 className="text-white font-bold text-lg">
                      Tournament Info
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {/* Location */}
                    {tournament.location && (
                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-slate-400 text-lg mt-0.5">
                          location_on
                        </span>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">
                            Location
                          </p>
                          <p className="text-white">{tournament.location}</p>
                        </div>
                      </div>
                    )}

                    {/* Advancement Criteria */}
                    {tournament.advancementCriteria && (
                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-slate-400 text-lg mt-0.5">
                          emoji_events
                        </span>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">
                            Advancement Criteria
                          </p>
                          <p className="text-white text-sm">
                            {tournament.advancementCriteria}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {tournament.notes && (
                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-slate-400 text-lg mt-0.5">
                          notes
                        </span>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">
                            Notes
                          </p>
                          <p className="text-slate-300 text-sm whitespace-pre-wrap">
                            {tournament.notes}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Photo Albums */}
                    {tournament.photoAlbums && (
                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-slate-400 text-lg mt-0.5">
                          photo_library
                        </span>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">
                            Photo Album
                          </p>
                          <a
                            href={tournament.photoAlbums}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary-light underline text-sm inline-flex items-center gap-1"
                          >
                            View Photos
                            <span className="material-symbols-outlined text-sm">
                              open_in_new
                            </span>
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* About Section */}
              <div className="bg-[#1c2230] rounded-2xl p-6 border border-white/5 shadow-lg">
                <h3 className="text-white font-bold text-lg mb-3">
                  Tournament Details
                </h3>
                <div className="space-y-4">
                  {/* Quick Info Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {tournament.bracketType && (
                      <div className="bg-background-dark rounded-lg p-3">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">
                          Bracket Type
                        </span>
                        <span className="text-white text-sm font-medium capitalize">
                          {tournament.bracketType.replace(/_/g, " ")}
                        </span>
                      </div>
                    )}
                    {tournament.season && (
                      <div className="bg-background-dark rounded-lg p-3">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">
                          Season
                        </span>
                        <span className="text-white text-sm font-medium">
                          {tournament.season}
                        </span>
                      </div>
                    )}
                    {tournament.registrationType && (
                      <div className="bg-background-dark rounded-lg p-3">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">
                          Registration
                        </span>
                        <span className="text-white text-sm font-medium capitalize">
                          {tournament.registrationType}
                        </span>
                      </div>
                    )}
                    {tournament.registrationStatus && (
                      <div className="bg-background-dark rounded-lg p-3">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">
                          Reg. Status
                        </span>
                        <span
                          className={`text-sm font-medium capitalize ${
                            tournament.registrationStatus === "open"
                              ? "text-green-400"
                              : tournament.registrationStatus === "full"
                                ? "text-red-400"
                                : tournament.registrationStatus === "closed"
                                  ? "text-slate-400"
                                  : "text-yellow-400"
                          }`}
                        >
                          {tournament.registrationStatus}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Registration Dates */}
                  {(tournament.registrationOpensAt ||
                    tournament.registrationDeadline) && (
                    <>
                      <div className="h-px bg-white/5"></div>
                      <div className="grid grid-cols-2 gap-3">
                        {tournament.registrationOpensAt && (
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">
                              Registration Opens
                            </span>
                            <span className="text-slate-300 text-sm">
                              {new Date(
                                tournament.registrationOpensAt,
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {tournament.registrationDeadline && (
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">
                              Registration Deadline
                            </span>
                            <span className="text-slate-300 text-sm">
                              {new Date(
                                tournament.registrationDeadline,
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <div className="h-px bg-white/5"></div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">
                      Description
                    </span>
                    <p className="text-slate-300 text-sm leading-relaxed">
                      {tournament.notes ||
                        "No specific notes provided for this tournament."}
                    </p>
                  </div>
                  <div className="h-px bg-white/5"></div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">
                      Rules
                    </span>
                    <p className="text-slate-300 text-sm leading-relaxed">
                      {tournament.advancementCriteria ||
                        "Standard tournament rules apply."}
                    </p>
                  </div>
                  {tournament.photoAlbums && (
                    <>
                      <div className="h-px bg-white/5"></div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">
                          Photo Albums
                        </span>
                        <a
                          href={tournament.photoAlbums}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary text-sm hover:underline flex items-center gap-1"
                        >
                          View Photos
                          <span className="material-symbols-outlined text-[16px]">
                            open_in_new
                          </span>
                        </a>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Admin Configuration Section - Only visible to admins */}
              {isAdmin &&
                (tournament.seedingConfig ||
                  tournament.teamFormationConfig ||
                  tournament.managementState) && (
                  <div className="bg-[#1c2230] rounded-2xl p-6 border border-white/5 shadow-lg">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="material-symbols-outlined text-primary">
                        admin_panel_settings
                      </span>
                      <h3 className="text-white font-bold text-lg">
                        Configuration
                      </h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-primary/20 text-primary">
                        Admin Only
                      </span>
                    </div>
                    <div className="space-y-4">
                      {/* Seeding Configuration */}
                      {tournament.seedingConfig && (
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-2">
                            Seeding Method
                          </span>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-background-dark rounded-lg p-3">
                              <span className="text-slate-400 text-xs block mb-1">
                                Method
                              </span>
                              <span className="text-white text-sm font-medium capitalize">
                                {tournament.seedingConfig.method?.replace(
                                  /_/g,
                                  " ",
                                ) || "Not set"}
                              </span>
                            </div>
                            {tournament.seedingConfig.parameters && (
                              <>
                                {tournament.seedingConfig.parameters
                                  .recentTournamentCount !== undefined && (
                                  <div className="bg-background-dark rounded-lg p-3">
                                    <span className="text-slate-400 text-xs block mb-1">
                                      Recent Tournaments
                                    </span>
                                    <span className="text-white text-sm font-medium">
                                      {
                                        tournament.seedingConfig.parameters
                                          .recentTournamentCount
                                      }
                                    </span>
                                  </div>
                                )}
                                {tournament.seedingConfig.parameters
                                  .championshipWeight !== undefined && (
                                  <div className="bg-background-dark rounded-lg p-3">
                                    <span className="text-slate-400 text-xs block mb-1">
                                      Championship Weight
                                    </span>
                                    <span className="text-white text-sm font-medium">
                                      {
                                        tournament.seedingConfig.parameters
                                          .championshipWeight
                                      }
                                    </span>
                                  </div>
                                )}
                                {tournament.seedingConfig.parameters
                                  .winPercentageWeight !== undefined && (
                                  <div className="bg-background-dark rounded-lg p-3">
                                    <span className="text-slate-400 text-xs block mb-1">
                                      Win % Weight
                                    </span>
                                    <span className="text-white text-sm font-medium">
                                      {
                                        tournament.seedingConfig.parameters
                                          .winPercentageWeight
                                      }
                                    </span>
                                  </div>
                                )}
                                {tournament.seedingConfig.parameters
                                  .avgFinishWeight !== undefined && (
                                  <div className="bg-background-dark rounded-lg p-3">
                                    <span className="text-slate-400 text-xs block mb-1">
                                      Avg Finish Weight
                                    </span>
                                    <span className="text-white text-sm font-medium">
                                      {
                                        tournament.seedingConfig.parameters
                                          .avgFinishWeight
                                      }
                                    </span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Team Formation Configuration */}
                      {tournament.teamFormationConfig && (
                        <>
                          <div className="h-px bg-white/5"></div>
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-2">
                              Team Formation
                            </span>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-background-dark rounded-lg p-3">
                                <span className="text-slate-400 text-xs block mb-1">
                                  Method
                                </span>
                                <span className="text-white text-sm font-medium capitalize">
                                  {tournament.teamFormationConfig.method?.replace(
                                    /_/g,
                                    " ",
                                  ) || "Not set"}
                                </span>
                              </div>
                              {tournament.teamFormationConfig.parameters && (
                                <>
                                  {tournament.teamFormationConfig.parameters
                                    .skillBalancing !== undefined && (
                                    <div className="bg-background-dark rounded-lg p-3">
                                      <span className="text-slate-400 text-xs block mb-1">
                                        Skill Balancing
                                      </span>
                                      <span
                                        className={`text-sm font-medium ${tournament.teamFormationConfig.parameters.skillBalancing ? "text-green-400" : "text-slate-400"}`}
                                      >
                                        {tournament.teamFormationConfig
                                          .parameters.skillBalancing
                                          ? "Enabled"
                                          : "Disabled"}
                                      </span>
                                    </div>
                                  )}
                                  {tournament.teamFormationConfig.parameters
                                    .avoidRecentPartners !== undefined && (
                                    <div className="bg-background-dark rounded-lg p-3">
                                      <span className="text-slate-400 text-xs block mb-1">
                                        Avoid Recent Partners
                                      </span>
                                      <span
                                        className={`text-sm font-medium ${tournament.teamFormationConfig.parameters.avoidRecentPartners ? "text-green-400" : "text-slate-400"}`}
                                      >
                                        {tournament.teamFormationConfig
                                          .parameters.avoidRecentPartners
                                          ? "Yes"
                                          : "No"}
                                      </span>
                                    </div>
                                  )}
                                  {tournament.teamFormationConfig.parameters
                                    .maxTimesPartnered !== undefined && (
                                    <div className="bg-background-dark rounded-lg p-3">
                                      <span className="text-slate-400 text-xs block mb-1">
                                        Max Times Partnered
                                      </span>
                                      <span className="text-white text-sm font-medium">
                                        {
                                          tournament.teamFormationConfig
                                            .parameters.maxTimesPartnered
                                        }
                                      </span>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Management State */}
                      {tournament.managementState?.currentRound && (
                        <>
                          <div className="h-px bg-white/5"></div>
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-2">
                              Management State
                            </span>
                            <div className="bg-background-dark rounded-lg p-3 inline-block">
                              <span className="text-slate-400 text-xs block mb-1">
                                Current Round
                              </span>
                              <span className="text-primary text-sm font-bold uppercase">
                                {tournament.managementState.currentRound.replace(
                                  /_/g,
                                  " ",
                                )}
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

              {/* Live Section Placeholders */}
              {isLive && (
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-6 border border-primary/20">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-primary">
                      live_tv
                    </span>
                    <h3 className="text-white font-bold">Live Coverage</h3>
                  </div>
                  <LiveStats
                    tournamentId={id!}
                    refreshInterval={30000}
                    compact={true}
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === "Standings" && (
            <div className="space-y-4">
              {sortedResults.length > 0 ? (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-3 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Rank
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Team
                          </th>
                          <th className="text-center py-3 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Div
                          </th>
                          <th className="text-center py-3 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Seed
                          </th>
                          <th className="text-center py-3 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            RR
                          </th>
                          <th className="text-center py-3 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Bracket
                          </th>
                          <th className="text-center py-3 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Total
                          </th>
                          <th className="text-center py-3 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Win %
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedResults.map((result, idx) => {
                          // Use bodFinish (actual placement 1, 2, 3...) for display
                          const rank = result.totalStats?.bodFinish || idx + 1;
                          const isChampion = rank === 1;
                          const rowKey = result.id || idx;
                          const isExpanded = expandedRows.has(rowKey);
                          const toggleExpand = () => {
                            setExpandedRows((prev) => {
                              const newSet = new Set(prev);
                              if (newSet.has(rowKey)) {
                                newSet.delete(rowKey);
                              } else {
                                newSet.add(rowKey);
                              }
                              return newSet;
                            });
                          };
                          return (
                            <React.Fragment key={rowKey}>
                              <tr
                                onClick={toggleExpand}
                                className={`border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer ${
                                  isChampion ? "bg-yellow-500/10" : ""
                                }`}
                              >
                                <td className="py-4 px-2">
                                  <div
                                    className={`flex items-center justify-center size-8 rounded-full font-bold text-sm ${
                                      isChampion
                                        ? "bg-yellow-500 text-black"
                                        : "bg-slate-700 text-white"
                                    }`}
                                  >
                                    {isChampion ? "🏆" : rank}
                                  </div>
                                </td>
                                <td className="py-4 px-4">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`material-symbols-outlined text-slate-500 text-sm transition-transform ${
                                        isExpanded ? "rotate-90" : ""
                                      }`}
                                    >
                                      chevron_right
                                    </span>
                                    <p className="text-white font-medium">
                                      {result.totalStats?.home && (
                                        <span
                                          className="mr-1 text-green-400"
                                          title="Home Team"
                                        >
                                          🏠
                                        </span>
                                      )}
                                      {result.players &&
                                      Array.isArray(result.players)
                                        ? result.players
                                            .map((p: any) =>
                                              typeof p === "object" &&
                                              "name" in p
                                                ? p.name
                                                : p,
                                            )
                                            .join(" & ")
                                        : "Team"}
                                    </p>
                                  </div>
                                </td>
                                <td className="py-4 px-2 text-center">
                                  <span className="text-slate-400 text-sm">
                                    {result.division || "-"}
                                  </span>
                                </td>
                                <td className="py-4 px-2 text-center">
                                  <span className="text-slate-400 text-sm">
                                    {result.seed || "-"}
                                  </span>
                                </td>
                                <td className="py-4 px-2 text-center">
                                  <span className="text-white text-sm font-mono">
                                    {result.roundRobinScores?.rrWon || 0}-
                                    {result.roundRobinScores?.rrLost || 0}
                                  </span>
                                </td>
                                <td className="py-4 px-2 text-center">
                                  <span className="text-white text-sm font-mono">
                                    {result.bracketScores?.bracketWon || 0}-
                                    {result.bracketScores?.bracketLost || 0}
                                  </span>
                                </td>
                                <td className="py-4 px-2 text-center">
                                  <span className="text-primary text-sm font-bold font-mono">
                                    {result.totalStats?.totalWon || 0}-
                                    {result.totalStats?.totalLost || 0}
                                  </span>
                                </td>
                                <td className="py-4 px-2 text-center">
                                  <span className="text-slate-300 text-sm font-mono">
                                    {(
                                      (result.totalStats?.winPercentage || 0) *
                                      100
                                    ).toFixed(1)}
                                    %
                                  </span>
                                </td>
                              </tr>
                              {/* Expandable Detail Row */}
                              {isExpanded && (
                                <tr className="bg-slate-900/50">
                                  <td colSpan={8} className="py-3 px-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      {/* Round Robin Details */}
                                      <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
                                        <p className="text-[10px] text-blue-400 uppercase tracking-wider font-bold mb-2">
                                          Round Robin Scores
                                        </p>
                                        <div className="grid grid-cols-3 gap-2 text-center text-xs mb-2">
                                          <div className="bg-black/30 rounded p-2">
                                            <p className="text-white font-bold">
                                              {result.roundRobinScores
                                                ?.round1 ?? "-"}
                                            </p>
                                            <p className="text-slate-500 text-[10px]">
                                              R1
                                            </p>
                                          </div>
                                          <div className="bg-black/30 rounded p-2">
                                            <p className="text-white font-bold">
                                              {result.roundRobinScores
                                                ?.round2 ?? "-"}
                                            </p>
                                            <p className="text-slate-500 text-[10px]">
                                              R2
                                            </p>
                                          </div>
                                          <div className="bg-black/30 rounded p-2">
                                            <p className="text-white font-bold">
                                              {result.roundRobinScores
                                                ?.round3 ?? "-"}
                                            </p>
                                            <p className="text-slate-500 text-[10px]">
                                              R3
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                          <span className="text-slate-400">
                                            Win %:{" "}
                                            <span className="text-blue-400 font-bold">
                                              {(
                                                (result.roundRobinScores
                                                  ?.rrWinPercentage || 0) * 100
                                              ).toFixed(1)}
                                              %
                                            </span>
                                          </span>
                                          <span className="text-slate-400">
                                            Rank:{" "}
                                            <span className="text-blue-400 font-bold">
                                              {result.roundRobinScores?.rrRank?.toFixed(
                                                2,
                                              ) ?? "-"}
                                            </span>
                                          </span>
                                        </div>
                                      </div>

                                      {/* Bracket Details */}
                                      <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/20">
                                        <p className="text-[10px] text-purple-400 uppercase tracking-wider font-bold mb-2">
                                          Bracket Scores
                                        </p>
                                        {/* R16 Matchup Opponent */}
                                        {result.bracketScores?.r16Matchup && (
                                          <div className="mb-2 text-xs">
                                            <span className="text-slate-400">
                                              R16 vs:{" "}
                                            </span>
                                            <span className="text-purple-300 font-medium">
                                              {result.bracketScores.r16Matchup}
                                            </span>
                                          </div>
                                        )}
                                        <div className="grid grid-cols-4 gap-2 text-center text-xs">
                                          <div className="bg-black/30 rounded p-2">
                                            <p className="text-white font-bold font-mono">
                                              {result.bracketScores?.r16Won ??
                                                "-"}
                                              -
                                              {result.bracketScores?.r16Lost ??
                                                "-"}
                                            </p>
                                            <p className="text-slate-500 text-[10px]">
                                              R16
                                            </p>
                                          </div>
                                          <div className="bg-black/30 rounded p-2">
                                            <p className="text-white font-bold font-mono">
                                              {result.bracketScores?.qfWon ??
                                                "-"}
                                              -
                                              {result.bracketScores?.qfLost ??
                                                "-"}
                                            </p>
                                            <p className="text-slate-500 text-[10px]">
                                              QF
                                            </p>
                                          </div>
                                          <div className="bg-black/30 rounded p-2">
                                            <p className="text-white font-bold font-mono">
                                              {result.bracketScores?.sfWon ??
                                                "-"}
                                              -
                                              {result.bracketScores?.sfLost ??
                                                "-"}
                                            </p>
                                            <p className="text-slate-500 text-[10px]">
                                              SF
                                            </p>
                                          </div>
                                          <div className="bg-black/30 rounded p-2">
                                            <p className="text-white font-bold font-mono">
                                              {result.bracketScores
                                                ?.finalsWon ?? "-"}
                                              -
                                              {result.bracketScores
                                                ?.finalsLost ?? "-"}
                                            </p>
                                            <p className="text-slate-500 text-[10px]">
                                              Finals
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-3">
                    {sortedResults.map((result, idx) => {
                      const rank =
                        result.totalStats?.finalRank ||
                        result.totalStats?.bodFinish ||
                        idx + 1;
                      const isChampion = rank === 1;
                      return (
                        <div
                          key={result.id || idx}
                          className={`rounded-xl p-4 border ${
                            isChampion
                              ? "bg-yellow-500/10 border-yellow-500/20"
                              : "bg-[#1c2230] border-white/5"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex items-center justify-center size-10 rounded-full font-bold ${
                                  isChampion
                                    ? "bg-yellow-500 text-black text-lg"
                                    : "bg-slate-700 text-white"
                                }`}
                              >
                                {isChampion ? "🏆" : rank}
                              </div>
                              <div>
                                <p className="text-white font-bold">
                                  {result.players &&
                                  Array.isArray(result.players)
                                    ? result.players
                                        .map((p: any) =>
                                          typeof p === "object" && "name" in p
                                            ? p.name
                                            : p,
                                        )
                                        .join(" & ")
                                    : "Team"}
                                </p>
                                <p className="text-slate-400 text-xs">
                                  {result.division
                                    ? `Division ${result.division}`
                                    : ""}
                                  {result.division && result.seed ? " • " : ""}
                                  {result.seed ? `Seed #${result.seed}` : ""}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            <div className="bg-background-dark rounded-lg p-2 text-center">
                              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">
                                RR
                              </p>
                              <p className="text-white font-mono text-sm">
                                {result.roundRobinScores?.rrWon || 0}-
                                {result.roundRobinScores?.rrLost || 0}
                              </p>
                            </div>
                            <div className="bg-background-dark rounded-lg p-2 text-center">
                              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">
                                Bracket
                              </p>
                              <p className="text-white font-mono text-sm">
                                {result.bracketScores?.bracketWon || 0}-
                                {result.bracketScores?.bracketLost || 0}
                              </p>
                            </div>
                            <div className="bg-background-dark rounded-lg p-2 text-center">
                              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">
                                Total
                              </p>
                              <p className="text-primary font-mono text-sm font-bold">
                                {result.totalStats?.totalWon || 0}-
                                {result.totalStats?.totalLost || 0}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 pt-3 border-t border-white/5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-500 uppercase font-bold">
                                Win Percentage
                              </span>
                              <span className="text-white font-mono font-bold">
                                {(
                                  (result.totalStats?.winPercentage || 0) * 100
                                ).toFixed(1)}
                                %
                              </span>
                            </div>
                          </div>

                          {/* Detailed Round Robin Scores */}
                          {result.roundRobinScores &&
                            (result.roundRobinScores.round1 !== undefined ||
                              result.roundRobinScores.round2 !== undefined ||
                              result.roundRobinScores.round3 !== undefined) && (
                              <div className="mt-3 pt-3 border-t border-white/5">
                                <p className="text-xs text-slate-500 uppercase font-bold mb-2">
                                  Round Robin Details
                                </p>
                                <div className="flex gap-2">
                                  {result.roundRobinScores.round1 !==
                                    undefined && (
                                    <div className="flex-1 bg-background-dark rounded px-2 py-1 text-center">
                                      <p className="text-[9px] text-slate-500">
                                        R1
                                      </p>
                                      <p className="text-white text-xs font-mono">
                                        {result.roundRobinScores.round1}
                                      </p>
                                    </div>
                                  )}
                                  {result.roundRobinScores.round2 !==
                                    undefined && (
                                    <div className="flex-1 bg-background-dark rounded px-2 py-1 text-center">
                                      <p className="text-[9px] text-slate-500">
                                        R2
                                      </p>
                                      <p className="text-white text-xs font-mono">
                                        {result.roundRobinScores.round2}
                                      </p>
                                    </div>
                                  )}
                                  {result.roundRobinScores.round3 !==
                                    undefined && (
                                    <div className="flex-1 bg-background-dark rounded px-2 py-1 text-center">
                                      <p className="text-[9px] text-slate-500">
                                        R3
                                      </p>
                                      <p className="text-white text-xs font-mono">
                                        {result.roundRobinScores.round3}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="size-16 rounded-full bg-slate-100 dark:bg-card-dark flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-slate-400 text-3xl">
                      leaderboard
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                    No Results Available
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    Results will appear after the tournament is completed.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "Matches" && renderMatchList()}

          {activeTab === "Players" && (
            <div className="space-y-4">
              {/* Show Generated Seeds if available */}
              {tournament.generatedSeeds &&
              tournament.generatedSeeds.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-lg">
                      list_alt
                    </span>
                    Player Seeds
                  </h4>
                  {tournament.generatedSeeds.map(
                    (seedInfo: any, idx: number) => (
                      <div
                        key={seedInfo.playerId || idx}
                        className="flex items-center justify-between p-4 rounded-xl bg-[#1c2230] border border-white/5"
                      >
                        <div className="flex items-center gap-4">
                          <div className="size-10 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-bold shadow-lg">
                            {seedInfo.seed}
                          </div>
                          <div>
                            <p className="text-white font-bold">
                              {seedInfo.playerName}
                            </p>
                            {seedInfo.statistics && (
                              <p className="text-xs text-slate-400">
                                {seedInfo.statistics.totalChampionships || 0}{" "}
                                championships •{" "}
                                {(
                                  (seedInfo.statistics.winningPercentage || 0) *
                                  100
                                ).toFixed(1)}
                                % win rate
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              ) : tournament.generatedTeams &&
                tournament.generatedTeams.length > 0 ? (
                /* Show Generated Teams if available */
                <div className="space-y-3">
                  <h4 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-lg">
                      groups
                    </span>
                    Teams
                  </h4>
                  {tournament.generatedTeams.map((team: any, idx: number) => (
                    <div
                      key={team.teamId || idx}
                      className="p-4 rounded-xl bg-[#1c2230] border border-white/5"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-bold shadow-lg">
                            {team.combinedSeed || idx + 1}
                          </div>
                          <p className="text-white font-bold">
                            {team.teamName}
                          </p>
                        </div>
                      </div>
                      {team.players && team.players.length > 0 && (
                        <div className="ml-13 space-y-1">
                          {team.players.map((player: any, pIdx: number) => (
                            <p key={pIdx} className="text-sm text-slate-400">
                              {player.playerName}{" "}
                              {player.seed && (
                                <span className="text-slate-500">
                                  (#{player.seed})
                                </span>
                              )}
                            </p>
                          ))}
                        </div>
                      )}
                      {team.combinedStatistics && (
                        <div className="mt-2 pt-2 border-t border-white/5">
                          <p className="text-xs text-slate-500">
                            Avg Finish:{" "}
                            {team.combinedStatistics.avgFinish?.toFixed(1) ||
                              "-"}{" "}
                            • Win %:{" "}
                            {(
                              (team.combinedStatistics.combinedWinPercentage ||
                                0) * 100
                            ).toFixed(1)}
                            %
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : tournament.players?.length ? (
                /* Fallback to simple player list */
                <div className="space-y-3">
                  <h4 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-lg">
                      person
                    </span>
                    Registered Players
                  </h4>
                  {tournament.players.map((player: any) => (
                    <Link
                      to={`/players/${player._id}`}
                      key={player._id}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#1c2230] border border-white/5 hover:border-white/10 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="size-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-xs ring-2 ring-transparent group-hover:ring-primary transition-all">
                          {player.name?.[0]}
                        </div>
                        <div>
                          <p className="text-white font-bold text-sm group-hover:text-primary transition-colors">
                            {player.name}
                          </p>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-slate-600 group-hover:text-white transition-colors">
                        chevron_right
                      </span>
                    </Link>
                  ))}

                  {/* Waitlist Players Section */}
                  {tournament.waitlistPlayers &&
                    tournament.waitlistPlayers.length > 0 && (
                      <>
                        <div className="h-px bg-white/10 my-4"></div>
                        <h4 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                          <span className="material-symbols-outlined text-yellow-500 text-lg">
                            hourglass_empty
                          </span>
                          Waitlist ({tournament.waitlistPlayers.length})
                        </h4>
                        {tournament.waitlistPlayers.map(
                          (player: any, idx: number) => (
                            <Link
                              to={`/players/${player._id}`}
                              key={player._id}
                              className="flex items-center justify-between p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/10 hover:border-yellow-500/20 transition-all group"
                            >
                              <div className="flex items-center gap-4">
                                <div className="size-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500 font-bold text-xs">
                                  {idx + 1}
                                </div>
                                <div className="size-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-xs">
                                  {player.name?.[0]}
                                </div>
                                <div>
                                  <p className="text-white font-bold text-sm group-hover:text-yellow-500 transition-colors">
                                    {player.name}
                                  </p>
                                  <p className="text-yellow-500/60 text-xs">
                                    Position #{idx + 1} on waitlist
                                  </p>
                                </div>
                              </div>
                              <span className="material-symbols-outlined text-slate-600 group-hover:text-white transition-colors">
                                chevron_right
                              </span>
                            </Link>
                          ),
                        )}
                      </>
                    )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="size-16 rounded-full bg-slate-100 dark:bg-card-dark flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-slate-400 text-3xl">
                      group
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                    No Players Registered
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    Players will appear after registration.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "Bracket" && (
            <div className="bg-[#1c2230] rounded-2xl border border-white/5 p-4 overflow-hidden">
              {matches.length > 0 ? (
                <div className="overflow-x-auto">
                  <BracketView
                    matches={matches}
                    teams={[]}
                    currentRound={isLive ? "semifinal" : undefined}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <span className="material-symbols-outlined text-4xl mb-2 opacity-30">
                    account_tree
                  </span>
                  <p className="text-sm">Bracket pending generation</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TournamentDetail;
