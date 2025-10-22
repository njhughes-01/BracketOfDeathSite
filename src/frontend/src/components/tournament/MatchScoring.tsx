import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Match, MatchUpdate } from '../../types/api';
import { EditableNumber } from '../admin';
import { validateTennisScore } from '../../utils/tennisValidation';
import { useAuth } from '../../contexts/AuthContext';

interface MatchScoringProps {
  match: Match;
  onUpdateMatch: (update: MatchUpdate) => void;
  compact?: boolean;
  requirePerPlayerScores?: boolean;
  strictTotals?: boolean;
}

const MatchScoring: React.FC<MatchScoringProps> = ({ match, onUpdateMatch, compact = false, requirePerPlayerScores = false, strictTotals = true }) => {
  const { user } = useAuth();
  const [showDetailedScoring, setShowDetailedScoring] = useState(true);
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const isValidObjectId = (v: unknown): v is string => typeof v === 'string' && /^[a-fA-F0-9]{24}$/.test(v);
  // Helper: derive a readable team name from available fields
  const firstOnly = (full: string): string => (full || '').split(' ')[0] || full || '';
  const getTeamName = (team: any): string => {
    if (team?.teamName) return team.teamName;
    if (Array.isArray(team?.playerNames) && team.playerNames.length > 0) {
      return team.playerNames.map(firstOnly).join(' & ');
    }
    if (Array.isArray(team?.players) && team.players.length > 0) {
      const names = (team.players as any[])
        .map((p: any) => p?.name || p?.playerName)
        .filter(Boolean)
        .map((n: string) => firstOnly(n));
      if (names.length > 0) return names.join(' & ');
    }
    return 'Unknown Team';
  };
  const [team1PlayerScores, setTeam1PlayerScores] = useState<Array<{
    playerId: string;
    playerName: string;
    score: number;
  }>>([]);
  const [team2PlayerScores, setTeam2PlayerScores] = useState<Array<{
    playerId: string;
    playerName: string;
    score: number;
  }>>([]);
  const [team1TotalOverride, setTeam1TotalOverride] = useState<number | undefined>(undefined);
  const [team2TotalOverride, setTeam2TotalOverride] = useState<number | undefined>(undefined);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced save function to prevent unwanted saves during token refresh
  const debouncedCommitPlayerScores = useCallback(() => {
    // Clear any existing timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // Set new timer to save after 1 second of inactivity
    saveTimerRef.current = setTimeout(() => {
      const payload: MatchUpdate = {
        matchId: (match._id || (match as any).id) as string,
        status: 'in-progress'
      };
      if (team1PlayerScores.length > 0 && team1PlayerScores.every(p => isValidObjectId(p.playerId))) {
        payload.team1PlayerScores = team1PlayerScores;
      }
      if (team2PlayerScores.length > 0 && team2PlayerScores.every(p => isValidObjectId(p.playerId))) {
        payload.team2PlayerScores = team2PlayerScores;
      }
      onUpdateMatch(payload);
    }, 1000);
  }, [match, team1PlayerScores, team2PlayerScores, onUpdateMatch]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // Initialize player scores from match data or create empty arrays
  useEffect(() => {
    const buildInitialScores = (team: any) => {
      // Use existing playerScores if present (with valid ids)
      if (Array.isArray(team.playerScores) && team.playerScores.length > 0) {
        const mapped = team.playerScores.map((p: any, idx: number) => ({
          playerId: (p.playerId || p._id || p.id) as string,
          playerName: firstOnly(p.playerName || p.name || `Player ${idx + 1}`),
          score: typeof p.score === 'number' ? p.score : 0,
        }));
        if (mapped.every(ps => isValidObjectId(ps.playerId))) return mapped;
      }

      // Prefer players array for real IDs (populated docs or string IDs)
      if (Array.isArray(team.players) && team.players.length > 0) {
        const mapped = team.players.map((player: any, idx: number) => {
          const pid: string | undefined = (player && (player._id || player.id)) || (typeof player === 'string' ? player : undefined);
          const name: string = firstOnly((team.playerNames?.[idx]) || player?.name || player?.playerName || `Player ${idx + 1}`);
          return {
            playerId: pid as string,
            playerName: name,
            score: 0,
          };
        }).filter((p: any) => p.playerId && isValidObjectId(p.playerId));
        if (mapped.length > 0) return mapped as Array<{ playerId: string; playerName: string; score: number }>;
      }

      // If we cannot determine valid IDs, do not send per-player scores; use totals only
      return [] as Array<{ playerId: string; playerName: string; score: number }>;
    };

    setTeam1PlayerScores(buildInitialScores(match.team1));
    setTeam2PlayerScores(buildInitialScores(match.team2));

    // Initialize totals overrides if scores exist
    setTeam1TotalOverride(match.team1.score);
    setTeam2TotalOverride(match.team2.score);
  }, [match]);

  const updatePlayerScore = (teamNumber: 1 | 2, playerIndex: number, score: number) => {
    if (teamNumber === 1) {
      const updated = [...team1PlayerScores];
      updated[playerIndex] = { ...updated[playerIndex], score };
      setTeam1PlayerScores(updated);
    } else {
      const updated = [...team2PlayerScores];
      updated[playerIndex] = { ...updated[playerIndex], score };
      setTeam2PlayerScores(updated);
    }
    // Trigger debounced save after score update
    debouncedCommitPlayerScores();
  };

  const immediateCommitPlayerScores = () => {
    // Cancel any pending debounced save
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    const payload: MatchUpdate = {
      matchId: (match._id || (match as any).id) as string,
      status: 'in-progress'
    };
    if (team1PlayerScores.length > 0 && team1PlayerScores.every(p => isValidObjectId(p.playerId))) {
      payload.team1PlayerScores = team1PlayerScores;
    }
    if (team2PlayerScores.length > 0 && team2PlayerScores.every(p => isValidObjectId(p.playerId))) {
      payload.team2PlayerScores = team2PlayerScores;
    }
    onUpdateMatch(payload);
  };

  const derivedTeam1Total = team1PlayerScores.reduce((sum, player) => sum + player.score, 0);
  const derivedTeam2Total = team2PlayerScores.reduce((sum, player) => sum + player.score, 0);
  const team1Total = strictTotals ? derivedTeam1Total : (team1TotalOverride ?? derivedTeam1Total);
  const team2Total = strictTotals ? derivedTeam2Total : (team2TotalOverride ?? derivedTeam2Total);

  const expectTeam1Players = Array.isArray(match.team1.players) ? (match.team1.players as any[]).length : team1PlayerScores.length;
  const expectTeam2Players = Array.isArray(match.team2.players) ? (match.team2.players as any[]).length : team2PlayerScores.length;
  const team1ScoresComplete = team1PlayerScores.length === expectTeam1Players && team1PlayerScores.every(p => typeof p.score === 'number');
  const team2ScoresComplete = team2PlayerScores.length === expectTeam2Players && team2PlayerScores.every(p => typeof p.score === 'number');

  const baseCompletable = team1Total !== undefined && team2Total !== undefined && team1Total !== team2Total;
  const canComplete = baseCompletable && (!requirePerPlayerScores || (team1ScoresComplete && team2ScoresComplete));

  // Validate tennis score
  const scoreValidation = (team1Total !== undefined && team2Total !== undefined)
    ? validateTennisScore(team1Total, team2Total)
    : { isValid: false, reason: 'Scores must be entered' };

  const winningSide: 'team1' | 'team2' | undefined = (match as any).winner
    ? ((match as any).winner as 'team1' | 'team2')
    : (team1Total !== team2Total ? (team1Total > team2Total ? 'team1' : 'team2') : undefined);

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

  const completeMatchWithPayload = (adminOverride?: { reason: string; authorizedBy: string }) => {
    const payload: MatchUpdate = {
      matchId: (match._id || (match as any).id) as string,
      team1Score: team1Total,
      team2Score: team2Total,
      status: 'completed',
      endTime: new Date().toISOString(),
    };
    if (team1PlayerScores.length > 0 && team1PlayerScores.every(p => isValidObjectId(p.playerId))) {
      payload.team1PlayerScores = team1PlayerScores;
    }
    if (team2PlayerScores.length > 0 && team2PlayerScores.every(p => isValidObjectId(p.playerId))) {
      payload.team2PlayerScores = team2PlayerScores;
    }
    if (adminOverride) {
      payload.adminOverride = adminOverride;
    }
    onUpdateMatch(payload);
    setShowOverrideDialog(false);
    setOverrideReason('');
  };

  const handleOverrideConfirm = () => {
    if (!overrideReason.trim()) {
      alert('Please provide a reason for the admin override.');
      return;
    }
    if (!user?.username) {
      alert('User information not available.');
      return;
    }
    completeMatchWithPayload({
      reason: overrideReason.trim(),
      authorizedBy: user.username
    });
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center space-x-1">
            <span>{getTeamName(match.team1)}</span>
            {(match.status === 'completed' || match.status === 'confirmed') && winningSide === 'team1' && (
              <span className="px-1 py-0.5 text-[10px] rounded bg-green-100 text-green-700">Winner</span>
            )}
          </span>
          <div className="flex items-center space-x-2">
            <span className="text-lg font-bold text-blue-600">{team1Total}</span>
          </div>
        </div>
        <div className="text-center text-gray-400 text-sm">vs</div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center space-x-1">
            <span>{getTeamName(match.team2)}</span>
            {(match.status === 'completed' || match.status === 'confirmed') && winningSide === 'team2' && (
              <span className="px-1 py-0.5 text-[10px] rounded bg-green-100 text-green-700">Winner</span>
            )}
          </span>
          <div className="flex items-center space-x-2">
            <span className="text-lg font-bold text-blue-600">{team2Total}</span>
          </div>
        </div>

        {showDetailedScoring && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Individual Player Scores</h4>
            
            {/* Team 1 Players */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">{getTeamName(match.team1)}</p>
              {team1PlayerScores.map((player, index) => (
                <div key={player.playerId} className="flex items-center justify-between py-1">
                  <span className="text-xs">{player.playerName}</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={player.score}
                    onChange={(e) => {
                      const v = e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0;
                      updatePlayerScore(1, index, v);
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { immediateCommitPlayerScores(); (e.target as HTMLInputElement).blur(); } }}
                    className="w-12 text-sm font-medium text-center border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              ))}
            </div>

            {/* Team 2 Players */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">{getTeamName(match.team2)}</p>
              {team2PlayerScores.map((player, index) => (
                <div key={player.playerId} className="flex items-center justify-between py-1">
                  <span className="text-xs">{player.playerName}</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={player.score}
                    onChange={(e) => {
                      const v = e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0;
                      updatePlayerScore(2, index, v);
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { immediateCommitPlayerScores(); (e.target as HTMLInputElement).blur(); } }}
                    className="w-12 text-sm font-medium text-center border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick totals and complete */}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-500">Total</span>
              {strictTotals ? (
                <span className="text-sm font-medium min-w-[1.5rem] text-center inline-block">{team1Total}</span>
              ) : (
                <EditableNumber
                  value={team1Total}
                  onSave={(v) => setTeam1TotalOverride(v === undefined ? undefined : v)}
                  min={0}
                  integer
                  placeholder="0"
                  displayClassName="text-sm font-medium min-w-[1.5rem] text-center"
                />
              )}
              <span className="text-xs text-gray-400">-</span>
              {strictTotals ? (
                <span className="text-sm font-medium min-w-[1.5rem] text-center inline-block">{team2Total}</span>
              ) : (
                <EditableNumber
                  value={team2Total}
                  onSave={(v) => setTeam2TotalOverride(v === undefined ? undefined : v)}
                  min={0}
                  integer
                  placeholder="0"
                  displayClassName="text-sm font-medium min-w-[1.5rem] text-center"
                />
              )}
            </div>
          </div>
          <button
            onClick={handleCompleteAttempt}
            className={`btn btn-xs ${canComplete ? 'btn-primary' : 'btn-disabled cursor-not-allowed'}`}
            disabled={!canComplete}
            title={
              canComplete
                ? scoreValidation.isValid
                  ? 'Complete match'
                  : `${scoreValidation.reason} - Click to complete with admin override`
                : requirePerPlayerScores && (!team1ScoresComplete || !team2ScoresComplete)
                  ? 'Enter individual scores for all players'
                  : 'Enter non-tied totals to complete'
            }
          >
            Complete
          </button>
        </div>

        {/* Admin Override Dialog */}
        {showOverrideDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Admin Override Required</h3>
              <p className="text-sm text-gray-700 mb-4">
                {scoreValidation.reason}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                This score doesn't follow standard tennis rules. Please provide a reason for completing this match with a non-standard score (e.g., injury retirement, walkover, match stopped early).
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Override:
                </label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g., Player injured and unable to continue"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  autoFocus
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowOverrideDialog(false);
                    setOverrideReason('');
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
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700 flex items-center space-x-2">
            <span>{getTeamName(match.team1)}</span>
            {(match.status === 'completed' || match.status === 'confirmed') && winningSide === 'team1' && (
              <span className="px-1 py-0.5 text-[10px] rounded bg-green-100 text-green-700">Winner</span>
            )}
          </p>
          <p className="text-2xl font-bold text-blue-600">{team1Total}</p>
        </div>
        <div className="text-gray-400 font-bold">VS</div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700 flex items-center space-x-2">
            <span>{getTeamName(match.team2)}</span>
            {(match.status === 'completed' || match.status === 'confirmed') && winningSide === 'team2' && (
              <span className="px-1 py-0.5 text-[10px] rounded bg-green-100 text-green-700">Winner</span>
            )}
          </p>
          <p className="text-2xl font-bold text-blue-600">{team2Total}</p>
        </div>
      </div>

      {/* Individual Player Scoring */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Team 1 */}
        <div className="border rounded-lg p-3">
          <h4 className="font-medium text-gray-700 mb-3">{match.team1.teamName} Players</h4>
          <div className="space-y-2">
            {team1PlayerScores.map((player, index) => (
              <div key={player.playerId} className="flex items-center justify-between">
                <span className="text-sm">{player.playerName}</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={player.score}
                  onChange={(e) => {
                    const v = e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0;
                    updatePlayerScore(1, index, v);
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { immediateCommitPlayerScores(); (e.target as HTMLInputElement).blur(); } }}
                  className="w-14 text-lg font-medium text-blue-600 text-center border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Team 2 */}
        <div className="border rounded-lg p-3">
          <h4 className="font-medium text-gray-700 mb-3">{match.team2.teamName} Players</h4>
          <div className="space-y-2">
            {team2PlayerScores.map((player, index) => (
              <div key={player.playerId} className="flex items-center justify-between">
                <span className="text-sm">{player.playerName}</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={player.score}
                  onChange={(e) => {
                    const v = e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0;
                    updatePlayerScore(2, index, v);
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { immediateCommitPlayerScores(); (e.target as HTMLInputElement).blur(); } }}
                  className="w-14 text-lg font-medium text-blue-600 text-center border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Totals and complete */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Totals</span>
          <EditableNumber
            value={team1Total}
            onSave={(v) => setTeam1TotalOverride(v === undefined ? undefined : v)}
            min={0}
            integer
            placeholder="0"
            displayClassName="text-lg font-medium text-blue-600 min-w-[2rem] text-center"
          />
          <span className="text-gray-400">-</span>
          <EditableNumber
            value={team2Total}
            onSave={(v) => setTeam2TotalOverride(v === undefined ? undefined : v)}
            min={0}
            integer
            placeholder="0"
            displayClassName="text-lg font-medium text-blue-600 min-w-[2rem] text-center"
          />
        </div>
        <button
          onClick={handleCompleteAttempt}
          className={`btn btn-sm ${canComplete ? 'btn-primary' : 'btn-disabled cursor-not-allowed'}`}
          disabled={!canComplete}
          title={
            canComplete
              ? scoreValidation.isValid
                ? 'Complete match'
                : `${scoreValidation.reason} - Click to complete with admin override`
              : requirePerPlayerScores && (!team1ScoresComplete || !team2ScoresComplete)
                ? 'Enter individual scores for all players'
                : 'Enter non-tied totals to complete'
          }
        >
          Complete Match
        </button>
      </div>

      {/* Admin Override Dialog */}
      {showOverrideDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Admin Override Required</h3>
            <p className="text-sm text-gray-700 mb-4">
              {scoreValidation.reason}
            </p>
            <p className="text-sm text-gray-600 mb-4">
              This score doesn't follow standard tennis rules. Please provide a reason for completing this match with a non-standard score (e.g., injury retirement, walkover, match stopped early).
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Override:
              </label>
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="e.g., Player injured and unable to continue"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                autoFocus
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowOverrideDialog(false);
                  setOverrideReason('');
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
};

export default MatchScoring;


