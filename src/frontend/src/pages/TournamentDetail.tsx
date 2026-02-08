import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useApi, useMutation } from "../hooks/useApi";
import { useAuth } from "../contexts/AuthContext";
import apiClient from "../services/api";

import LiveStats from "../components/tournament/LiveStats";
import BracketView from "../components/tournament/BracketView";
import TournamentHeader from "../components/tournament/TournamentHeader";
import TournamentRegistration from "../components/tournament/TournamentRegistration";
import TournamentInfo from "../components/tournament/TournamentInfo";
import type { DiscountInfo } from "../components/checkout";
import type { RegistrationState, ReservationInfo, UserTicket } from "../components/tournament/TournamentRegistration";
import { getTournamentStatus } from "../utils/tournamentStatus";
import type { Tournament, Match, TournamentResult, Player } from "../types/api";
import logger from "../utils/logger";

const TournamentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, isAuthenticated, user } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "Overview" | "Standings" | "Matches" | "Players" | "Bracket"
  >("Overview");
  const [expandedRows, setExpandedRows] = useState<Set<string | number>>(
    new Set(),
  );

  // Checkout flow state
  const [registrationState, setRegistrationState] = useState<RegistrationState>("loading");
  const [reservation, setReservation] = useState<ReservationInfo | null>(null);
  const [userTicket, setUserTicket] = useState<UserTicket | null>(null);
  const [discountCode, setDiscountCode] = useState<string>("");
  const [discountInfo, setDiscountInfo] = useState<DiscountInfo | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // API calls
  const getTournament = useCallback(() => apiClient.getTournament(id!), [id]);
  const { data: tournamentWrapper, loading } = useApi(getTournament, {
    immediate: true,
  });

  const getMatches = useCallback(
    () => apiClient.getTournamentMatches(id!),
    [id],
  );
  const { data: matchesWrapper } = useApi(getMatches, { immediate: true });

  const getResults = useCallback(
    () => apiClient.getResultsByTournament(id!),
    [id],
  );
  const { data: resultsWrapper } = useApi(getResults, { immediate: true });

  // Delete Mutation
  const { mutate: deleteTournament } = useMutation(
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
    const wrapper = resultsWrapper as unknown;
    if (Array.isArray(wrapper)) return wrapper as TournamentResult[];
    if (wrapper !== null && typeof wrapper === "object" && "data" in wrapper) {
      const data = (wrapper as { data: unknown }).data;
      if (Array.isArray(data)) return data as TournamentResult[];
      if (
        data !== null &&
        typeof data === "object" &&
        "results" in data &&
        Array.isArray((data as { results: unknown }).results)
      ) {
        return (data as { results: TournamentResult[] }).results;
      }
    }
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
    const winner = results.find(
      (r) => r.totalStats?.finalRank === 1 || r.totalStats?.bodFinish === 1,
    );
    return winner;
  }, [results, tournament]);

  // Sort results by BOD finish position
  const sortedResults = useMemo(() => {
    if (!results.length) return [];
    return [...results].sort((a, b) => {
      const rankA = a.totalStats?.bodFinish || 999;
      const rankB = b.totalStats?.bodFinish || 999;
      return rankA - rankB;
    });
  }, [results]);

  // Get finalist (rank 2)
  const finalist = useMemo(() => {
    if (sortedResults.length < 2) return null;
    return sortedResults[1];
  }, [sortedResults]);

  // Calculate final match score
  const finalMatchScore = useMemo(() => {
    if (!champion || !finalist) return null;
    const champFinalsWon =
      (champion as TournamentResult).bracketScores?.finalsWon || 0;
    const finalistFinalsWon =
      (finalist as TournamentResult).bracketScores?.finalsWon || 0;
    if (champFinalsWon === 0 && finalistFinalsWon === 0) return null;
    return { champion: champFinalsWon, finalist: finalistFinalsWon };
  }, [champion, finalist]);

  // Calculate tournament statistics
  const tournamentStats = useMemo(() => {
    if (!results.length) return null;

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
      totalWins: totalWon,
      avgWinPct,
      highestScorer,
    };
  }, [results]);

  // Extract individual players from tournament results
  const individualPlayers = useMemo(() => {
    if (!results.length) return [];

    interface PlayerStats {
      _id: string;
      name: string;
      partner: string;
      gamesWon: number;
      gamesLost: number;
      winPct: number;
      seed?: number;
      division?: string;
      finish?: number;
    }

    const playerMap = new Map<string, PlayerStats>();

    results.forEach((result) => {
      if (!result.players || !Array.isArray(result.players)) return;

      const playerNames = result.players.map(
        (p: { _id?: string; name?: string } | string) =>
          typeof p === "object" && "name" in p ? p.name || "" : String(p),
      );

      result.players.forEach(
        (player: { _id?: string; name?: string } | string, idx: number) => {
          const playerId =
            typeof player === "object" && "_id" in player
              ? player._id
              : String(player);
          const playerName =
            typeof player === "object" && "name" in player
              ? player.name
              : String(player);

          if (!playerId) return;

          const partnerName = playerNames
            .filter((_: string, i: number) => i !== idx)
            .join(" & ");

          if (!playerMap.has(playerId)) {
            playerMap.set(playerId, {
              _id: playerId,
              name: playerName || "Unknown",
              partner: partnerName,
              gamesWon: result.totalStats?.totalWon || 0,
              gamesLost: result.totalStats?.totalLost || 0,
              winPct: result.totalStats?.winPercentage || 0,
              seed: result.seed,
              division: result.division,
              finish: result.totalStats?.bodFinish,
            });
          }
        },
      );
    });

    return Array.from(playerMap.values()).sort(
      (a, b) => (a.finish || 999) - (b.finish || 999),
    );
  }, [results]);

  // Derive bracket matches from tournament results
  const derivedBracketMatches = useMemo(() => {
    const hasBracketMatches = matches.some((m) =>
      ["quarterfinal", "semifinal", "final", "grand-final"].includes(m.round),
    );

    if (hasBracketMatches) return matches;
    if (!results.length) return [];

    const derivedMatches: Match[] = [];
    let matchNumber = 1;

    const getFinish = (r: TournamentResult, idx: number): number => {
      const stats = r.totalStats;
      const finish = stats?.bodFinish ?? stats?.finalRank;
      return finish ? Number(finish) : idx + 1;
    };

    const championResult = results.find((r, i) => getFinish(r, i) === 1);
    const finalistResult = results.find((r, i) => getFinish(r, i) === 2);
    const semifinalists = results.filter((r, i) => {
      const finish = getFinish(r, i);
      return finish === 3 || finish === 4;
    });
    const quarterfinalists = results.filter((r, i) => {
      const finish = getFinish(r, i);
      return finish >= 5 && finish <= 8;
    });

    const getTeamName = (result: TournamentResult) => {
      if (Array.isArray(result.players) && result.players.length > 0) {
        const names = result.players
          .map((p) =>
            typeof p === "object" && "name" in p ? p.name : String(p),
          )
          .filter(Boolean);
        if (names.length > 0) return names.join(" & ");
      }
      return "Unknown Team";
    };

    // Create final match
    if (championResult && finalistResult) {
      const champScore = championResult.bracketScores?.finalsWon ?? 0;
      const finalistScore = finalistResult.bracketScores?.finalsWon ?? 0;

      derivedMatches.push({
        _id: `derived-final-${matchNumber}`,
        id: `derived-final-${matchNumber}`,
        tournamentId: tournament?._id || "",
        round: "final",
        matchNumber: matchNumber++,
        team1: {
          teamId: championResult._id,
          teamName: getTeamName(championResult),
          players: Array.isArray(championResult.players)
            ? (championResult.players as Player[])
            : [],
          score: champScore > finalistScore ? champScore : finalistScore + 1,
        },
        team2: {
          teamId: finalistResult._id,
          teamName: getTeamName(finalistResult),
          players: Array.isArray(finalistResult.players)
            ? (finalistResult.players as Player[])
            : [],
          score: finalistScore,
        },
        status: "completed",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Create semifinal matches
    if (semifinalists.length > 0) {
      if (championResult && semifinalists[0]) {
        const sf = semifinalists[0];
        derivedMatches.push({
          _id: `derived-sf-${matchNumber}`,
          id: `derived-sf-${matchNumber}`,
          tournamentId: tournament?._id || "",
          round: "semifinal",
          matchNumber: matchNumber++,
          team1: {
            teamId: championResult._id,
            teamName: getTeamName(championResult),
            players: Array.isArray(championResult.players)
              ? (championResult.players as Player[])
              : [],
            score: championResult.bracketScores?.sfWon || 1,
          },
          team2: {
            teamId: sf._id,
            teamName: getTeamName(sf),
            players: Array.isArray(sf.players) ? (sf.players as Player[]) : [],
            score: sf.bracketScores?.sfWon || 0,
          },
          status: "completed",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      if (finalistResult && semifinalists[1]) {
        const sf = semifinalists[1];
        derivedMatches.push({
          _id: `derived-sf-${matchNumber}`,
          id: `derived-sf-${matchNumber}`,
          tournamentId: tournament?._id || "",
          round: "semifinal",
          matchNumber: matchNumber++,
          team1: {
            teamId: finalistResult._id,
            teamName: getTeamName(finalistResult),
            players: Array.isArray(finalistResult.players)
              ? (finalistResult.players as Player[])
              : [],
            score: finalistResult.bracketScores?.sfWon || 1,
          },
          team2: {
            teamId: sf._id,
            teamName: getTeamName(sf),
            players: Array.isArray(sf.players) ? (sf.players as Player[]) : [],
            score: sf.bracketScores?.sfWon || 0,
          },
          status: "completed",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    // Create quarterfinal matches
    if (quarterfinalists.length > 0) {
      for (let i = 0; i < quarterfinalists.length; i += 2) {
        if (quarterfinalists[i] && quarterfinalists[i + 1]) {
          const qf1 = quarterfinalists[i];
          const qf2 = quarterfinalists[i + 1];
          derivedMatches.push({
            _id: `derived-qf-${matchNumber}`,
            id: `derived-qf-${matchNumber}`,
            tournamentId: tournament?._id || "",
            round: "quarterfinal",
            matchNumber: matchNumber++,
            team1: {
              teamId: qf1._id,
              teamName: getTeamName(qf1),
              players: Array.isArray(qf1.players)
                ? (qf1.players as Player[])
                : [],
              score: qf1.bracketScores?.qfWon || 0,
            },
            team2: {
              teamId: qf2._id,
              teamName: getTeamName(qf2),
              players: Array.isArray(qf2.players)
                ? (qf2.players as Player[])
                : [],
              score: qf2.bracketScores?.qfWon || 0,
            },
            status: "completed",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }

    return derivedMatches;
  }, [matches, results, tournament]);

  // ============================================
  // CHECKOUT FLOW FUNCTIONS
  // ============================================

  // Check user's registration status
  useEffect(() => {
    const checkRegistrationStatus = async () => {
      if (!id || loading) return;
      
      if (!isAuthenticated) {
        setRegistrationState("not_logged_in");
        return;
      }

      try {
        const ticketResponse = await apiClient.getMyTicketForTournament(id);
        if (ticketResponse.data?.ticket && 
            ticketResponse.data.ticket.status !== "void" && 
            ticketResponse.data.ticket.status !== "refunded") {
          setUserTicket(ticketResponse.data.ticket);
          setRegistrationState("registered");
          return;
        }

        const reservationResponse = await apiClient.getReservationStatus(id);
        if (reservationResponse.data?.hasReservation && reservationResponse.data?.reservationId) {
          setReservation(reservationResponse.data);
          setRegistrationState("reserved");
          return;
        }

        setRegistrationState("not_registered");
      } catch (err) {
        logger.error("Failed to check registration status:", err);
        setRegistrationState("not_registered");
      }
    };

    checkRegistrationStatus();
  }, [id, loading, isAuthenticated]);

  // Update registration state based on tournament data
  useEffect(() => {
    if (!tournament || registrationState === "loading") return;
    if (registrationState === "registered" || registrationState === "reserved") return;

    if (tournament.inviteOnly && !isAdmin) {
      setRegistrationState("invite_only");
      return;
    }

    if (tournament.registrationStatus === "closed") {
      setRegistrationState("closed");
      return;
    }

    if (tournament.registrationStatus === "full") {
      const isOnWaitlist = tournament.waitlistPlayers?.some(
        p => p._id === user?.playerId
      );
      if (isOnWaitlist) {
        setRegistrationState("waitlisted");
        return;
      }
      setRegistrationState("full");
      return;
    }
  }, [tournament, registrationState, isAdmin, user?.playerId]);

  // Calculate current price
  const currentPrice = useMemo(() => {
    if (!tournament) return 0;
    if (!tournament.entryFee || tournament.entryFee === 0) return 0;

    if (tournament.earlyBirdFee && tournament.earlyBirdDeadline) {
      const deadline = new Date(tournament.earlyBirdDeadline);
      if (new Date() < deadline) {
        return tournament.earlyBirdFee;
      }
    }

    return tournament.entryFee;
  }, [tournament]);

  // Calculate discounted price
  const finalPrice = useMemo(() => {
    if (!discountInfo?.valid) return currentPrice;

    if (discountInfo.discountType === "percent" && discountInfo.discountValue) {
      return Math.round(currentPrice * (1 - discountInfo.discountValue / 100));
    }
    
    if (discountInfo.discountType === "amount" && discountInfo.discountValue) {
      return Math.max(0, currentPrice - discountInfo.discountValue);
    }

    return currentPrice;
  }, [currentPrice, discountInfo]);

  const requiresPayment = currentPrice > 0;

  // Handle discount code application
  const handleDiscountApply = (code: string, info: DiscountInfo) => {
    setDiscountCode(code);
    setDiscountInfo(info);
    logger.info("Discount applied:", { code, info });
  };

  // Reserve slot
  const handleReserveSlot = async () => {
    if (!id) return;
    
    setCheckoutLoading(true);
    setCheckoutError(null);

    try {
      const response = await apiClient.reserveSlot(id);
      
      if (!response.data) {
        throw new Error("Failed to reserve slot");
      }

      setReservation({
        reservationId: response.data.reservationId,
        expiresAt: response.data.expiresAt,
        remainingSeconds: response.data.remainingSeconds,
      });
      setRegistrationState("reserved");
      logger.info("Slot reserved:", response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to reserve slot";
      setCheckoutError(message);
      logger.error("Reserve slot failed:", err);
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Complete checkout
  const handleCompleteCheckout = async () => {
    if (!id || !reservation) return;

    setCheckoutLoading(true);
    setCheckoutError(null);

    try {
      if (requiresPayment && finalPrice > 0) {
        const response = await apiClient.createCheckoutSession({
          tournamentId: id,
          reservationId: reservation.reservationId,
          discountCode: discountCode || undefined,
        });

        if (!response.data?.url) {
          throw new Error("Failed to create checkout session");
        }

        logger.info("Redirecting to Stripe checkout:", response.data.url);
        window.location.href = response.data.url;
      } else {
        const response = await apiClient.completeFreeRegistration({
          tournamentId: id,
          reservationId: reservation.reservationId,
        });

        if (!response.data) {
          throw new Error("Failed to complete registration");
        }

        setUserTicket({
          _id: response.data.ticketId,
          ticketCode: response.data.ticketCode,
          status: "valid",
          paymentStatus: "free",
          amountPaid: 0,
        });
        setReservation(null);
        setRegistrationState("registered");
        logger.info("Free registration completed:", response.data);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Checkout failed";
      setCheckoutError(message);
      logger.error("Checkout failed:", err);
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Handle reservation expiry
  const handleReservationExpire = () => {
    setReservation(null);
    setRegistrationState("not_registered");
    setCheckoutError("Your reservation has expired. Please try again.");
    logger.info("Reservation expired");
  };

  // Cancel reservation
  const handleCancelReservation = async () => {
    if (!id) return;

    try {
      await apiClient.cancelReservation(id);
      setReservation(null);
      setRegistrationState("not_registered");
      setCheckoutError(null);
      logger.info("Reservation cancelled");
    } catch (err) {
      logger.error("Failed to cancel reservation:", err);
    }
  };

  // ============================================
  // END CHECKOUT FLOW FUNCTIONS
  // ============================================

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

                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
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

                  <div className="h-px bg-white/5 w-full"></div>

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
      <TournamentHeader
        tournament={tournament}
        isLive={isLive}
        isAdmin={isAdmin}
        onDelete={handleDelete}
      />

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
                  onClick={() => setActiveTab(tab as "Overview" | "Standings" | "Matches" | "Players" | "Bracket")}
                  className={`pb-4 text-sm font-bold relative shrink-0 transition-colors ${activeTab === tab
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
              {/* Tournament Info Component */}
              <TournamentInfo
                tournament={tournament}
                champion={champion || null}
                finalist={finalist}
                finalMatchScore={finalMatchScore}
                tournamentStats={tournamentStats}
                status={status}
                isAdmin={isAdmin}
              />

              {/* Registration Section - Only show for upcoming/open tournaments */}
              {status !== "completed" && status !== "cancelled" && (
                <TournamentRegistration
                  tournament={tournament}
                  tournamentId={id!}
                  registrationState={registrationState}
                  reservation={reservation}
                  userTicket={userTicket}
                  currentPrice={currentPrice}
                  finalPrice={finalPrice}
                  requiresPayment={requiresPayment}
                  discountInfo={discountInfo}
                  checkoutLoading={checkoutLoading}
                  checkoutError={checkoutError}
                  onReserveSlot={handleReserveSlot}
                  onCompleteCheckout={handleCompleteCheckout}
                  onCancelReservation={handleCancelReservation}
                  onReservationExpire={handleReservationExpire}
                  onDiscountApply={handleDiscountApply}
                  onClearError={() => setCheckoutError(null)}
                />
              )}

              {/* Live Section */}
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
                                className={`border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer ${isChampion ? "bg-yellow-500/10" : ""
                                  }`}
                              >
                                <td className="py-4 px-2">
                                  <div
                                    className={`flex items-center justify-center size-8 rounded-full font-bold text-sm ${isChampion
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
                                      className={`material-symbols-outlined text-slate-500 text-sm transition-transform ${isExpanded ? "rotate-90" : ""
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
                                          .map((p: Player | string | { _id?: string; name?: string }) =>
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
                          className={`rounded-xl p-4 border ${isChampion
                            ? "bg-yellow-500/10 border-yellow-500/20"
                            : "bg-[#1c2230] border-white/5"
                            }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex items-center justify-center size-10 rounded-full font-bold ${isChampion
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
                                      .map((p: Player | string | { _id?: string; name?: string }) =>
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
                    (seedInfo: {
                      playerId?: string;
                      seed?: number;
                      playerName?: string;
                      statistics?: {
                        totalChampionships?: number;
                        winningPercentage?: number;
                      };
                    }, idx: number) => (
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
                  {tournament.generatedTeams.map((team: {
                    teamId?: string;
                    combinedSeed?: number;
                    teamName?: string;
                    players?: Array<{ playerName?: string; seed?: number }>;
                    combinedStatistics?: {
                      avgFinish?: number;
                      combinedWinPercentage?: number;
                    };
                  }, idx: number) => (
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
                          {team.players.map((player: { playerName?: string; seed?: number }, pIdx: number) => (
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
                  {tournament.players.map((player: Player) => (
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
                          (player: Player, idx: number) => (
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
              ) : individualPlayers.length > 0 ? (
                /* Show individual players from results for completed tournaments */
                <div className="space-y-3">
                  <h4 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-lg">
                      person
                    </span>
                    Tournament Players ({individualPlayers.length})
                  </h4>
                  {individualPlayers.map((player) => (
                    <Link
                      to={`/players/${player._id}`}
                      key={player._id}
                      className="flex items-center justify-between p-4 rounded-xl bg-[#1c2230] border border-white/5 hover:border-white/10 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`size-10 rounded-full flex items-center justify-center text-white font-bold shadow-lg ${player.finish === 1
                            ? "bg-gradient-to-br from-yellow-500 to-yellow-600"
                            : player.finish === 2
                              ? "bg-gradient-to-br from-slate-400 to-slate-500"
                              : "bg-gradient-to-br from-primary to-blue-600"
                            }`}
                        >
                          {player.finish || "-"}
                        </div>
                        <div>
                          <p className="text-white font-bold group-hover:text-primary transition-colors">
                            {player.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            Partner: {player.partner || "Unknown"}
                            {player.division && (
                              <span className="text-slate-500 ml-2">
                                • Div {player.division}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-white font-bold font-mono text-sm">
                            {player.gamesWon}-{player.gamesLost}
                          </p>
                          <p className="text-xs text-slate-500">
                            {(player.winPct * 100).toFixed(1)}% Win
                          </p>
                        </div>
                        <span className="material-symbols-outlined text-slate-600 group-hover:text-white transition-colors">
                          chevron_right
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="size-16 rounded-full bg-slate-100 dark:bg-card-dark flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-slate-400 text-3xl">
                      group
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                    No Players Available
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    {status === "completed"
                      ? "Player data is not available for this tournament."
                      : "Players will appear after registration."}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "Bracket" && (
            <div className="bg-[#1c2230] rounded-2xl border border-white/5 p-4 overflow-hidden">
              {derivedBracketMatches.length > 0 ? (
                <div className="overflow-x-auto">
                  <BracketView
                    matches={derivedBracketMatches}
                    teams={[]}
                    currentRound={isLive ? "semifinal" : undefined}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <span className="material-symbols-outlined text-4xl mb-2 opacity-30">
                    account_tree
                  </span>
                  <p className="text-sm">
                    {status === "completed"
                      ? "Bracket data not available for this tournament"
                      : "Bracket pending generation"}
                  </p>
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
