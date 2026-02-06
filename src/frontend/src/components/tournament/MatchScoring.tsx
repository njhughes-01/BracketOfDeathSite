import logger from "../../utils/logger";
import React, { useState, useEffect, useRef } from "react";
import type { Match, MatchUpdate } from "../../types/api";
import { EditableNumber } from "../admin";
import { validateTennisScore } from "../../utils/tennisValidation";
import { useAuth } from "../../contexts/AuthContext";

interface MatchScoringProps {
  match: Match;
  onUpdateMatch: (update: MatchUpdate) => void;
  compact?: boolean;
  requirePerPlayerScores?: boolean;
  strictTotals?: boolean;
}

const MatchScoring: React.FC<MatchScoringProps> = ({
  match,
  onUpdateMatch,
  compact = false,
  requirePerPlayerScores = false,
  strictTotals = true,
}) => {
  const { user } = useAuth();
  const [showDetailedScoring, setShowDetailedScoring] = useState(true);
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const isValidObjectId = (v: unknown): v is string =>
    typeof v === "string" && /^[a-fA-F0-9]{24}$/.test(v);

  // Track the ID of the match we last loaded data for, to prevent overwriting
  // local state with identical server data (or empty data) when other matches update
  const [lastLoadedMatchId, setLastLoadedMatchId] = useState<string | null>(
    null,
  );

  // Helper: derive a readable team name from available fields
  const firstOnly = (full: string): string =>
    (full || "").split(" ")[0] || full || "";
  const getTeamName = (team: any): string => {
    if (team?.teamName) return team.teamName;
    if (Array.isArray(team?.playerNames) && team.playerNames.length > 0) {
      return team.playerNames.map(firstOnly).join(" & ");
    }
    if (Array.isArray(team?.players) && team.players.length > 0) {
      const names = (team.players as any[])
        .map((p: any) => p?.name || p?.playerName)
        .filter(Boolean)
        .map((n: string) => firstOnly(n));
      if (names.length > 0) return names.join(" & ");
    }
    return "Unknown Team";
  };
  const [team1PlayerScores, setTeam1PlayerScores] = useState<
    Array<{
      playerId: string;
      playerName: string;
      score: number;
    }>
  >([]);
  const [team2PlayerScores, setTeam2PlayerScores] = useState<
    Array<{
      playerId: string;
      playerName: string;
      score: number;
    }>
  >([]);
  const [team1TotalOverride, setTeam1TotalOverride] = useState<
    number | undefined
  >(undefined);
  const [team2TotalOverride, setTeam2TotalOverride] = useState<
    number | undefined
  >(undefined);

  // Initialize player scores from match data or create empty arrays
  // ONLY if the match ID has changed or we haven't loaded it yet.
  // This prevents resetting "dirty" local state when the parent component re-renders
  // due to updates in OTHER matches.
  useEffect(() => {
    const currentMatchId = (match._id || (match as any).id) as string;

    // We update local state from props if:
    // 1. It's a different match ID than what we have loaded
    // 2. Or we haven't loaded anything yet
    // 3. (Optional improvement) If we wanted to force reload we'd need a separate mechanism,
    //    but for now, preserving local edits is priority.
    if (currentMatchId !== lastLoadedMatchId) {
      const buildInitialScores = (team: any) => {
        // Use existing playerScores if present (with valid ids)
        if (Array.isArray(team.playerScores) && team.playerScores.length > 0) {
          const mapped = team.playerScores.map((p: any, idx: number) => ({
            playerId: (p.playerId || p._id || p.id) as string,
            playerName: firstOnly(
              p.playerName || p.name || `Player ${idx + 1}`,
            ),
            score: typeof p.score === "number" ? p.score : 0,
          }));
          if (mapped.every((ps) => isValidObjectId(ps.playerId))) return mapped;
        }

        // Prefer players array for real IDs (populated docs or string IDs)
        if (Array.isArray(team.players) && team.players.length > 0) {
          const mapped = team.players
            .map((player: any, idx: number) => {
              const pid: string | undefined =
                (player && (player._id || player.id)) ||
                (typeof player === "string" ? player : undefined);
              const name: string = firstOnly(
                team.playerNames?.[idx] ||
                  player?.name ||
                  player?.playerName ||
                  `Player ${idx + 1}`,
              );
              return {
                playerId: pid as string,
                playerName: name,
                score: 0,
              };
            })
            .filter((p: any) => p.playerId && isValidObjectId(p.playerId));
          if (mapped.length > 0)
            return mapped as Array<{
              playerId: string;
              playerName: string;
              score: number;
            }>;
        }

        // If we cannot determine valid IDs, do not send per-player scores; use totals only
        return [] as Array<{
          playerId: string;
          playerName: string;
          score: number;
        }>;
      };

      const p1 = buildInitialScores(match.team1);
      const p2 = buildInitialScores(match.team2);

      setTeam1PlayerScores(p1);
      setTeam2PlayerScores(p2);

      // Intelligent Override Initialization:
      // Only set the override if the stored total score differs from the sum of player scores.
      // This allows the UI to be reactive (calculating totals from players) unless manually overridden.
      // Use explicit check for number to handle 0 correctly.
      const sum1 = p1.reduce((acc, p) => acc + (p.score || 0), 0);
      const team1Stored = match.team1.score;
      if (typeof team1Stored === "number" && team1Stored !== sum1) {
        setTeam1TotalOverride(team1Stored);
      } else {
        setTeam1TotalOverride(undefined);
      }

      const sum2 = p2.reduce((acc, p) => acc + (p.score || 0), 0);
      const team2Stored = match.team2.score;
      if (typeof team2Stored === "number" && team2Stored !== sum2) {
        setTeam2TotalOverride(team2Stored);
      } else {
        setTeam2TotalOverride(undefined);
      }

      setLastLoadedMatchId(currentMatchId);
    }
  }, [match, lastLoadedMatchId]);

  const updatePlayerScore = (
    teamNumber: 1 | 2,
    playerIndex: number,
    score: number,
  ) => {
    if (teamNumber === 1) {
      const updated = [...team1PlayerScores];
      updated[playerIndex] = { ...updated[playerIndex], score };
      setTeam1PlayerScores(updated);
    } else {
      const updated = [...team2PlayerScores];
      updated[playerIndex] = { ...updated[playerIndex], score };
      setTeam2PlayerScores(updated);
    }
    // No auto-save here anymore
  };

  const handleManualSave = () => {
    const payload: MatchUpdate = {
      matchId: (match._id || (match as any).id) as string,
      status: "in-progress",
    };

    // Include overrides if they exist?
    // Usually overrides are just local calc helpers, but if we calculate totals:
    if (team1TotalOverride !== undefined)
      payload.team1Score = team1TotalOverride;
    if (team2TotalOverride !== undefined)
      payload.team2Score = team2TotalOverride;

    // Calculate derived totals if strict
    if (strictTotals) {
      // If no per-player scores (e.g. quick entry), we rely on validation logic??
      // Actually payload needs scores.
    }

    // Always send player scores if they exist
    if (team1PlayerScores.length > 0) {
      payload.team1PlayerScores = team1PlayerScores;
    }
    if (team2PlayerScores.length > 0) {
      payload.team2PlayerScores = team2PlayerScores;
    }

    onUpdateMatch(payload);
    logger.debug("Manual save triggered for match:", payload.matchId);
    // Note: We don't update lastLoadedMatchId here. We wait for the parent to pass back
    // the new props. Since the ID won't change, we effectively keep our local state.
    // If the save returns new data that CHANGES what we see (unlikely for just saving numbers),
    // users might want a refresh. But for now, implicit persistence is safer.
  };

  const immediateCommitPlayerScores = () => {
    handleManualSave();
  };

  const derivedTeam1Total = team1PlayerScores.reduce(
    (sum, player) => sum + player.score,
    0,
  );
  const derivedTeam2Total = team2PlayerScores.reduce(
    (sum, player) => sum + player.score,
    0,
  );
  const team1Total = strictTotals
    ? derivedTeam1Total
    : (team1TotalOverride ?? derivedTeam1Total);
  const team2Total = strictTotals
    ? derivedTeam2Total
    : (team2TotalOverride ?? derivedTeam2Total);

  const expectTeam1Players = Array.isArray(match.team1.players)
    ? (match.team1.players as any[]).length
    : team1PlayerScores.length;
  const expectTeam2Players = Array.isArray(match.team2.players)
    ? (match.team2.players as any[]).length
    : team2PlayerScores.length;
  const team1ScoresComplete =
    team1PlayerScores.length === expectTeam1Players &&
    team1PlayerScores.every((p) => typeof p.score === "number");
  const team2ScoresComplete =
    team2PlayerScores.length === expectTeam2Players &&
    team2PlayerScores.every((p) => typeof p.score === "number");

  const baseCompletable =
    team1Total !== undefined &&
    team2Total !== undefined &&
    team1Total !== team2Total;
  const canComplete =
    baseCompletable &&
    (!requirePerPlayerScores || (team1ScoresComplete && team2ScoresComplete));

  // Validate tennis score
  const scoreValidation =
    team1Total !== undefined && team2Total !== undefined
      ? validateTennisScore(team1Total, team2Total)
      : { isValid: false, reason: "Scores must be entered" };

  const winningSide: "team1" | "team2" | undefined = (match as any).winner
    ? ((match as any).winner as "team1" | "team2")
    : team1Total !== team2Total
      ? team1Total > team2Total
        ? "team1"
        : "team2"
      : undefined;

  const handleCompleteAttempt = () => {
    if (!canComplete) return;

    // Check if score is valid
    if (!scoreValidation.isValid) {
      // Show admin override dialog
      setShowOverrideDialog(true);
      return;
    }

    // Valid score - complete normally
    completeMatchWithPayload();
  };

  const completeMatchWithPayload = (adminOverride?: {
    reason: string;
    authorizedBy: string;
  }) => {
    const payload: MatchUpdate = {
      matchId: (match._id || (match as any).id) as string,
      team1Score: team1Total,
      team2Score: team2Total,
      status: "completed",
      endTime: new Date().toISOString(),
    };
    if (team1PlayerScores.length > 0) {
      payload.team1PlayerScores = team1PlayerScores;
    }
    if (team2PlayerScores.length > 0) {
      payload.team2PlayerScores = team2PlayerScores;
    }
    if (adminOverride) {
      payload.adminOverride = adminOverride;
    }
    onUpdateMatch(payload);
    setShowOverrideDialog(false);
    setOverrideReason("");
  };

  const handleOverrideConfirm = () => {
    if (!overrideReason.trim()) {
      alert("Please provide a reason for the admin override.");
      return;
    }
    if (!user?.username) {
      alert("User information not available.");
      return;
    }
    completeMatchWithPayload({
      reason: overrideReason.trim(),
      authorizedBy: user.username,
    });
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center space-x-1">
            <span>{getTeamName(match.team1)}</span>
            {(match.status === "completed" || match.status === "confirmed") &&
              winningSide === "team1" && (
                <span className="px-1 py-0.5 text-[10px] rounded bg-green-100 text-green-700">
                  Winner
                </span>
              )}
          </span>
          <div className="flex items-center space-x-2">
            <span className="text-lg font-bold text-blue-600">
              {team1Total}
            </span>
          </div>
        </div>
        <div className="text-center text-gray-400 text-sm">vs</div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center space-x-1">
            <span>{getTeamName(match.team2)}</span>
            {(match.status === "completed" || match.status === "confirmed") &&
              winningSide === "team2" && (
                <span className="px-1 py-0.5 text-[10px] rounded bg-green-100 text-green-700">
                  Winner
                </span>
              )}
          </span>
          <div className="flex items-center space-x-2">
            <span className="text-lg font-bold text-blue-600">
              {team2Total}
            </span>
          </div>
        </div>

        {showDetailedScoring && (
          <div className="mt-3 p-3 bg-black/20 rounded-lg space-y-3 border border-white/5">
            <h4 className="text-sm font-medium text-slate-300">
              Individual Player Scores
            </h4>

            {/* Team 1 Players */}
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">
                {getTeamName(match.team1)}
              </p>
              {team1PlayerScores.map((player, index) => (
                <div
                  key={player.playerId}
                  className="flex items-center justify-between py-1"
                >
                  <span className="text-xs text-slate-300">
                    {player.playerName}
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={player.score}
                    onChange={(e) => {
                      const v =
                        e.target.value === ""
                          ? 0
                          : parseInt(e.target.value, 10) || 0;
                      updatePlayerScore(1, index, v);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        immediateCommitPlayerScores();
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    className="w-12 text-sm font-medium text-center bg-background-dark border border-white/10 rounded px-1 py-0.5 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              ))}
            </div>

            {/* Team 2 Players */}
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">
                {getTeamName(match.team2)}
              </p>
              {team2PlayerScores.map((player, index) => (
                <div
                  key={player.playerId}
                  className="flex items-center justify-between py-1"
                >
                  <span className="text-xs text-slate-300">
                    {player.playerName}
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={player.score}
                    onChange={(e) => {
                      const v =
                        e.target.value === ""
                          ? 0
                          : parseInt(e.target.value, 10) || 0;
                      updatePlayerScore(2, index, v);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        immediateCommitPlayerScores();
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    className="w-12 text-sm font-medium text-center bg-background-dark border border-white/10 rounded px-1 py-0.5 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick totals and buttons */}
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center space-x-1">
            {strictTotals ? (
              <span className="text-sm font-medium w-8 text-center">
                {team1Total}
              </span>
            ) : (
              <EditableNumber
                value={team1Total}
                onSave={(v) =>
                  setTeam1TotalOverride(v === undefined ? undefined : v)
                }
                min={0}
                integer
                placeholder="0"
                displayClassName="text-sm font-medium min-w-[1.5rem] text-center"
              />
            )}
            <span className="text-xs text-gray-400">-</span>
            {strictTotals ? (
              <span className="text-sm font-medium w-8 text-center">
                {team2Total}
              </span>
            ) : (
              <EditableNumber
                value={team2Total}
                onSave={(v) =>
                  setTeam2TotalOverride(v === undefined ? undefined : v)
                }
                min={0}
                integer
                placeholder="0"
                displayClassName="text-sm font-medium min-w-[1.5rem] text-center"
              />
            )}
          </div>

          <div className="flex gap-1">
            <button
              onClick={handleManualSave}
              className="btn btn-xs btn-outline btn-neutral"
              title="Save current scores without completing match"
              data-testid={`match-${match.matchNumber}-save-btn`}
            >
              Save
            </button>
            <button
              onClick={handleCompleteAttempt}
              className={`btn btn-xs ${canComplete ? "btn-primary" : "btn-disabled cursor-not-allowed"}`}
              disabled={!canComplete}
              title={
                canComplete
                  ? scoreValidation.isValid
                    ? "Confirm Result & Complete Match"
                    : `${scoreValidation.reason} - Click to complete with admin override`
                  : requirePerPlayerScores &&
                      (!team1ScoresComplete || !team2ScoresComplete)
                    ? "Enter individual scores for all players"
                    : "Enter non-tied totals to complete"
              }
              data-testid={`match-${match.matchNumber}-confirm-btn`}
            >
              Confirm Result
            </button>
          </div>
        </div>

        {/* Admin Override Dialog */}
        {showOverrideDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Admin Override Required
              </h3>
              <p className="text-sm text-gray-700 mb-4">
                {scoreValidation.reason}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                This score doesn't follow standard tennis rules. Please provide
                a reason for completing this match with a non-standard score.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Override:
                </label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g., Retire due to injury"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  autoFocus
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowOverrideDialog(false);
                    setOverrideReason("");
                  }}
                  className="btn btn-sm btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleOverrideConfirm}
                  className="btn btn-sm btn-primary"
                >
                  Confirm Override
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full detailed scoring view
  return (
    <div className="space-y-4">
      {/* Team Totals */}
      <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/5">
        <div className="text-center">
          <p className="text-sm font-medium text-slate-300 flex items-center space-x-2">
            <span>{getTeamName(match.team1)}</span>
            {(match.status === "completed" || match.status === "confirmed") &&
              winningSide === "team1" && (
                <span className="px-1 py-0.5 text-[10px] rounded bg-green-500/20 text-green-500">
                  Winner
                </span>
              )}
          </p>
          <p className="text-2xl font-bold text-primary">{team1Total}</p>
        </div>
        <div className="text-slate-600 font-bold">VS</div>
        <div className="text-center">
          <p className="text-sm font-medium text-slate-300 flex items-center space-x-2">
            <span>{getTeamName(match.team2)}</span>
            {(match.status === "completed" || match.status === "confirmed") &&
              winningSide === "team2" && (
                <span className="px-1 py-0.5 text-[10px] rounded bg-green-500/20 text-green-500">
                  Winner
                </span>
              )}
          </p>
          <p className="text-2xl font-bold text-primary">{team2Total}</p>
        </div>
      </div>

      {/* Individual Player Scoring */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Team 1 */}
        <div className="border border-white/10 rounded-lg p-3 bg-black/20">
          <h4 className="font-medium text-slate-300 mb-3">
            {match.team1.teamName} Players
          </h4>
          <div className="space-y-2">
            {team1PlayerScores.map((player, index) => (
              <div
                key={player.playerId}
                className="flex items-center justify-between"
              >
                <span className="text-sm text-slate-400">
                  {player.playerName}
                </span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={player.score}
                  onChange={(e) => {
                    const v =
                      e.target.value === ""
                        ? 0
                        : parseInt(e.target.value, 10) || 0;
                    updatePlayerScore(1, index, v);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      immediateCommitPlayerScores();
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  className="w-14 text-lg font-medium text-white text-center bg-background-dark border border-white/10 rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Team 2 */}
        <div className="border border-white/10 rounded-lg p-3 bg-black/20">
          <h4 className="font-medium text-slate-300 mb-3">
            {match.team2.teamName} Players
          </h4>
          <div className="space-y-2">
            {team2PlayerScores.map((player, index) => (
              <div
                key={player.playerId}
                className="flex items-center justify-between"
              >
                <span className="text-sm text-slate-400">
                  {player.playerName}
                </span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={player.score}
                  onChange={(e) => {
                    const v =
                      e.target.value === ""
                        ? 0
                        : parseInt(e.target.value, 10) || 0;
                    updatePlayerScore(2, index, v);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      immediateCommitPlayerScores();
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  className="w-14 text-lg font-medium text-white text-center bg-background-dark border border-white/10 rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Totals and buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Totals</span>
          <EditableNumber
            value={team1Total}
            onSave={(v) =>
              setTeam1TotalOverride(v === undefined ? undefined : v)
            }
            min={0}
            integer
            placeholder="0"
            displayClassName="text-lg font-medium text-blue-600 min-w-[2rem] text-center"
          />
          <span className="text-gray-400">-</span>
          <EditableNumber
            value={team2Total}
            onSave={(v) =>
              setTeam2TotalOverride(v === undefined ? undefined : v)
            }
            min={0}
            integer
            placeholder="0"
            displayClassName="text-lg font-medium text-blue-600 min-w-[2rem] text-center"
          />
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleManualSave}
            className="btn btn-sm btn-outline btn-neutral"
            data-testid={`match-${match.matchNumber}-save-detailed-btn`}
          >
            Save
          </button>
          <button
            onClick={handleCompleteAttempt}
            className={`btn btn-sm ${canComplete ? "btn-primary" : "btn-disabled cursor-not-allowed"}`}
            disabled={!canComplete}
            title={
              canComplete
                ? scoreValidation.isValid
                  ? "Confirm Result & Complete Match"
                  : `${scoreValidation.reason} - Click to complete with admin override`
                : requirePerPlayerScores &&
                    (!team1ScoresComplete || !team2ScoresComplete)
                  ? "Enter individual scores for all players"
                  : "Enter non-tied totals to complete"
            }
            data-testid={`match-${match.matchNumber}-confirm-detailed-btn`}
          >
            Confirm Result
          </button>
        </div>
      </div>

      {/* Admin Override Dialog */}
      {showOverrideDialog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-surface-dark border border-white/10 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-white mb-2">
              Admin Override Required
            </h3>
            <p className="text-sm text-red-400 mb-4 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
              {scoreValidation.reason}
            </p>
            <p className="text-sm text-slate-400 mb-4">
              This score doesn't follow standard tennis rules. Please provide a
              reason for completing this match with a non-standard score.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Reason for Override:
              </label>
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="e.g., Retire due to injury"
                className="w-full bg-background-dark border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary placeholder:text-slate-600"
                rows={3}
                autoFocus
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowOverrideDialog(false);
                  setOverrideReason("");
                }}
                className="btn btn-sm btn-ghost text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleOverrideConfirm}
                className="btn btn-sm btn-primary"
              >
                Confirm Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchScoring;
