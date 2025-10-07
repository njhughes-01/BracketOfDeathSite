import React, { useState, useEffect } from 'react';
import type { Match, MatchUpdate } from '../../types/api';
import { EditableNumber } from '../admin';

interface MatchScoringProps {
  match: Match;
  onUpdateMatch: (update: MatchUpdate) => void;
  compact?: boolean;
  requirePerPlayerScores?: boolean;
  strictTotals?: boolean;
}

const MatchScoring: React.FC<MatchScoringProps> = ({ match, onUpdateMatch, compact = false, requirePerPlayerScores = false, strictTotals = true }) => {
  const [showDetailedScoring, setShowDetailedScoring] = useState(true);
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

  // Initialize player scores from match data or create empty arrays
  useEffect(() => {
    const buildInitialScores = (team: any) => {
      // Use existing playerScores if present
      if (Array.isArray(team.playerScores) && team.playerScores.length > 0) {
        return team.playerScores.map((p: any, idx: number) => ({
          playerId: p.playerId || p._id || p.id || `${team.teamId || team.teamName || 'team'}-p${idx}`,
          playerName: firstOnly(p.playerName || p.name || `Player ${idx + 1}`),
          score: typeof p.score === 'number' ? p.score : 0,
        }));
      }

      // Prefer explicit playerNames when present to avoid generic labels
      if (Array.isArray(team.playerNames) && team.playerNames.length > 0) {
        return team.playerNames.map((name: string, idx: number) => ({
          playerId: `${team.teamId || team.teamName || 'team'}-name-${idx}`,
          playerName: firstOnly(name),
          score: 0,
        }));
      }

      // Fallback to players array (could be populated docs or IDs)
      if (Array.isArray(team.players) && team.players.length > 0) {
        return team.players.map((player: any, idx: number) => ({
          playerId: player?._id || player?.id || player || `${team.teamId || team.teamName || 'team'}-p${idx}`,
          playerName: firstOnly(player?.name || player?.playerName || `Player ${idx + 1}`),
          score: 0,
        }));
      }

      // Final fallback: empty list
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
  };

  const commitPlayerScores = () => {
    onUpdateMatch({
      matchId: (match._id || (match as any).id) as string,
      team1PlayerScores,
      team2PlayerScores,
      status: 'in-progress'
    });
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

  const winningSide: 'team1' | 'team2' | undefined = (match as any).winner
    ? ((match as any).winner as 'team1' | 'team2')
    : (team1Total !== team2Total ? (team1Total > team2Total ? 'team1' : 'team2') : undefined);

  const completeMatch = () => {
    if (!canComplete) return;
    onUpdateMatch({
      matchId: (match._id || (match as any).id) as string,
      team1Score: team1Total,
      team2Score: team2Total,
      team1PlayerScores,
      team2PlayerScores,
      status: 'completed',
      endTime: new Date().toISOString(),
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
                    onBlur={commitPlayerScores}
                    onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } }}
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
                    onBlur={commitPlayerScores}
                    onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } }}
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
            onClick={completeMatch}
            className={`btn btn-xs ${canComplete ? 'btn-primary' : 'btn-disabled cursor-not-allowed'}`}
            disabled={!canComplete}
            title={
              canComplete
                ? 'Complete match'
                : requirePerPlayerScores && (!team1ScoresComplete || !team2ScoresComplete)
                  ? 'Enter individual scores for all players'
                  : 'Enter non-tied totals to complete'
            }
          >
            Complete
          </button>
        </div>
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
                  onBlur={commitPlayerScores}
                  onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } }}
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
                  onBlur={commitPlayerScores}
                  onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } }}
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
          onClick={completeMatch}
          className={`btn btn-sm ${canComplete ? 'btn-primary' : 'btn-disabled cursor-not-allowed'}`}
          disabled={!canComplete}
          title={
            canComplete
              ? 'Complete match'
              : requirePerPlayerScores && (!team1ScoresComplete || !team2ScoresComplete)
                ? 'Enter individual scores for all players'
                : 'Enter non-tied totals to complete'
          }
        >
          Complete Match
        </button>
      </div>
    </div>
  );
};

export default MatchScoring;


