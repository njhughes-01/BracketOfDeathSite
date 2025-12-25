import React, { useState, useCallback, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useApi, useMutation } from "../hooks/useApi";
import { useAuth } from "../contexts/AuthContext";
import apiClient from "../services/api";

import LiveStats from "../components/tournament/LiveStats";
import BracketView from "../components/tournament/BracketView";
import { getTournamentStatus } from "../utils/tournamentStatus";
import type { Tournament, Match } from "../types/api";

const TournamentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "Overview" | "Matches" | "Players" | "Bracket"
  >("Overview");

  const getTournament = useCallback(() => apiClient.getTournament(id!), [id]);
  const { data: tournamentWrapper, loading } = useApi(getTournament, {
    immediate: true,
  });

  const getMatches = useCallback(
    () => apiClient.getTournamentMatches(id!),
    [id],
  );
  const { data: matchesWrapper } = useApi(getMatches, { immediate: true });

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

  const matchesByRound = useMemo(() => {
    if (!matches.length) return {};
    const grouped: Record<string, Match[]> = {};
    matches.forEach((m) => {
      if (!grouped[m.round]) grouped[m.round] = [];
      grouped[m.round].push(m);
    });
    return grouped;
  }, [matches]);

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
              {tournament.players?.length || 0}
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
            {["Overview", "Matches", "Players", "Bracket"].map((tab) => (
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
            ))}
          </div>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 p-6">
          {activeTab === "Overview" && (
            <div className="space-y-6">
              {/* About Section */}
              <div className="bg-[#1c2230] rounded-2xl p-6 border border-white/5 shadow-lg">
                <h3 className="text-white font-bold text-lg mb-3">
                  Tournament Details
                </h3>
                <div className="space-y-4">
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
                </div>
              </div>

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

          {activeTab === "Matches" && renderMatchList()}

          {activeTab === "Players" && (
            <div className="space-y-3">
              {tournament.players?.length ? (
                tournament.players.map((player: any) => (
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
                        <p className="text-xs text-slate-500">
                          Seed #{player.seed || "-"}
                        </p>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-slate-600 group-hover:text-white transition-colors">
                      chevron_right
                    </span>
                  </Link>
                ))
              ) : (
                <div className="text-center py-10 text-slate-500">
                  No registered players
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
