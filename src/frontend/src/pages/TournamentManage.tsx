import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../services/api';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { EditableCard, EditableNumber } from '../components/admin';
import BracketView from '../components/tournament/BracketView';
import LiveStats from '../components/tournament/LiveStats';
import MatchScoring from '../components/tournament/MatchScoring';
import PlayerLeaderboard from '../components/tournament/PlayerLeaderboard';
import MatchesToolbar from '../components/tournament/MatchesToolbar';
import { getDefaultRoundFor, getRoundOptions, isRoundRobin } from '../utils/bracket';
import type {
  LiveTournament,
  Match,
  TournamentAction,
  MatchUpdate,
  TournamentResult
} from '../types/api';

const TournamentManage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();

  // Helpers for persistence (declare before useState)
  function storageKey(suffix: string) { return `tm:${id}:${suffix}`; }
  function persistSelectedRound(round: string) { try { localStorage.setItem(storageKey('selectedRound'), round); } catch { } }
  function readPersistedRound(): string | null { try { return localStorage.getItem(storageKey('selectedRound')); } catch { return null; } }
  function persistToggle(key: string, val: boolean) { try { localStorage.setItem(storageKey(key), String(val)); } catch { } }
  function readToggle(key: string, fallback: boolean): boolean { try { const v = localStorage.getItem(storageKey(key)); return v === null ? fallback : v === 'true'; } catch { return fallback; } }

  const [liveTournament, setLiveTournament] = useState<LiveTournament | null>(null);
  const [currentMatches, setCurrentMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRound, setSelectedRound] = useState<string>('');
  const [compactListView, setCompactListView] = useState<boolean>(readToggle('compact', true));
  const [strictTotals, setStrictTotals] = useState<boolean>(readToggle('strictTotals', true));
  const [requirePerPlayerScores, setRequirePerPlayerScores] = useState<boolean>(readToggle('requirePerPlayerScores', true));
  const eventSourceRef = useRef<EventSource | null>(null);
  const streamConnectedRef = useRef(false);
  const initializedRoundRef = useRef(false);

  // Deduplicate matches by stable key to avoid duplicates in UI
  const uniqueMatches = React.useMemo(() => {
    const seen = new Set<string>();
    const result: Match[] = [] as any;
    for (const m of currentMatches) {
      const key = (m as any)._id || (m as any).id || `${(m as any).tournamentId}-${(m as any).round}-${(m as any).matchNumber}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(m);
    }
    return result;
  }, [currentMatches]);

  // Load live tournament data
  const loadTournamentData = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      const response = await apiClient.getLiveTournament(id);
      if (response.success && response.data) {
        setLiveTournament(response.data);
        const bt = (response.data as LiveTournament).bracketType;
        // Determine selected round priority:
        // URL param > server managementState > persisted > phase.currentRound > default
        const params = new URLSearchParams(location.search);
        const urlRound = params.get('round') || '';
        const options = getRoundOptions(bt).map(o => o.value);
        let nextRound = response.data.phase.currentRound || getDefaultRoundFor(bt);
        const serverRound = (response.data as any).managementState?.currentRound as string | undefined;
        if (serverRound && options.includes(serverRound)) nextRound = serverRound;
        if (urlRound && options.includes(urlRound)) nextRound = urlRound;
        const persisted = readPersistedRound();
        if (!urlRound && persisted && options.includes(persisted)) nextRound = persisted;
        setSelectedRound(nextRound);
        initializedRoundRef.current = true;

        // Load matches for current round
        if (nextRound) {
          const matchesResponse = await apiClient.getTournamentMatches(id, nextRound);
          if (matchesResponse.success && matchesResponse.data) {
            setCurrentMatches(matchesResponse.data);
          }
        }
      }
    } catch (err) {
      setError('Failed to load tournament data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let pollInterval: any;
    loadTournamentData();

    // Establish SSE stream for realtime updates
    if (id && typeof window !== 'undefined') {
      const es = new EventSource(`/api/tournaments/${id}/stream`);
      eventSourceRef.current = es;

      const handleSnapshot = (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data);
          const live = (payload?.data as any) ?? (payload?.live as any) ?? null;
          if (live) {
            const liveData = live as LiveTournament;
            setLiveTournament(liveData);
            const bt = liveData.bracketType;
            const options = getRoundOptions(bt).map(o => o.value);
            let round = selectedRound;
            if (!initializedRoundRef.current) {
              round = liveData.phase.currentRound || getDefaultRoundFor(bt);
              initializedRoundRef.current = true;
              setSelectedRound(round);
            } else if (!options.includes(round)) {
              round = getDefaultRoundFor(bt);
              setSelectedRound(round);
            }
            const matches = (liveData.matches || []).filter((m: any) => m.round === round);
            setCurrentMatches(matches);
          }
        } catch (e) {
          // ignore parse errors
        }
      };

      const handleUpdate = (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data);
          const live = payload?.payload?.live ?? payload?.live ?? null;
          if (live) {
            const liveData = live as LiveTournament;
            setLiveTournament(liveData);
            const bt = liveData.bracketType;
            const options = getRoundOptions(bt).map(o => o.value);
            let round = selectedRound;
            if (!initializedRoundRef.current) {
              round = liveData.phase.currentRound || getDefaultRoundFor(bt);
              initializedRoundRef.current = true;
              setSelectedRound(round);
            } else if (!options.includes(round)) {
              round = getDefaultRoundFor(bt);
              setSelectedRound(round);
            }
            const matches = (liveData.matches || []).filter((m: any) => m.round === round);
            setCurrentMatches(matches);
          } else {
            // Fallback: refresh minimal data
            loadTournamentData();
          }
        } catch {
          loadTournamentData();
        }
      };

      es.addEventListener('open', () => { streamConnectedRef.current = true; });
      es.addEventListener('error', () => { streamConnectedRef.current = false; });
      es.addEventListener('snapshot', handleSnapshot as any);
      es.addEventListener('update', handleUpdate as any);

      // Poll as a safety net if stream drops
      pollInterval = setInterval(() => {
        if (!streamConnectedRef.current) loadTournamentData();
      }, 30000);

      return () => {
        clearInterval(pollInterval);
        streamConnectedRef.current = false;
        try { es.close(); } catch { }
        eventSourceRef.current = null;
      };
    }

    return () => { if (pollInterval) clearInterval(pollInterval); };
  }, [id, loadTournamentData]);

  // Execute tournament action
  const executeTournamentAction = async (action: TournamentAction) => {
    if (!id) return;

    try {
      setLoading(true);
      const response = await apiClient.executeTournamentAction(id, action);
      if (response.success && response.data) {
        setLiveTournament(response.data);
        await loadTournamentData(); // Refresh all data
      }
    } catch (err: any) {
      const backendMsg = err?.response?.data?.error || err?.response?.data?.message || err?.message;
      setError(backendMsg ? `Failed to ${action.action.replace('_', ' ')}: ${backendMsg}` : `Failed to ${action.action.replace('_', ' ')}`);
      console.error('Execute action error:', err?.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

  // Update match score
  const updateMatchScore = async (matchUpdate: MatchUpdate) => {
    try {
      setLoading(true);
      const response = await apiClient.updateMatch(matchUpdate);
      if (response.success) {
        // Refresh current matches
        if (liveTournament?.phase.currentRound) {
          const matchesResponse = await apiClient.getTournamentMatches(id!, liveTournament.phase.currentRound);
          if (matchesResponse.success && matchesResponse.data) {
            setCurrentMatches(matchesResponse.data);
          }
        }
        // Refresh tournament data for standings update
        await loadTournamentData();
      }
    } catch (err: any) {
      // Surface backend validation errors to the user
      const backendMsg = err?.response?.data?.error || err?.response?.data?.message || err?.message;
      setError(backendMsg ? `Failed to update match: ${backendMsg}` : 'Failed to update match score');
      console.error('Update match error:', err?.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

  // Generate matches for selected round (helper for empty rounds)
  const generateMatchesForSelectedRound = async () => {
    if (!id || !selectedRound) return;
    try {
      setLoading(true);
      const res = await apiClient.generateMatches(id, selectedRound);
      if (res.success) {
        await loadTournamentData();
      }
    } catch (err: any) {
      const backendMsg = err?.response?.data?.error || err?.response?.data?.message || err?.message;
      setError(backendMsg ? `Failed to generate matches: ${backendMsg}` : 'Failed to generate matches for this round');
      console.error('Generate matches error:', err?.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

  // Removed explicit starting; completing a match via scores is the primary action.

  // Batch: confirm all completed (not yet confirmed)
  const confirmAllCompletedInRound = async () => {
    if (!currentMatches || currentMatches.length === 0) return;
    try {
      setLoading(true);
      const completed = currentMatches.filter(m => (m.status as any) === 'completed');
      for (const m of completed) {
        await apiClient.updateMatch({
          matchId: (m._id || (m as any).id) as string,
          status: 'confirmed',
        });
      }
      await loadTournamentData();
    } catch (err) {
      setError('Failed to confirm all completed matches');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Check in team
  const checkInTeam = async (teamId: string, present: boolean) => {
    if (!id) return;

    try {
      const response = await apiClient.checkInTeam(id, teamId, present);
      if (response.success && response.data) {
        setLiveTournament(response.data);
      }
    } catch (err) {
      setError('Failed to update check-in status');
      console.error(err);
    }
  };

  // Get phase display info
  const getPhaseDisplayInfo = (phase: string) => {
    const phaseMap = {
      'setup': { label: 'Setup', color: 'bg-gray-100 text-gray-800', icon: '⚙️' },
      'registration': { label: 'Registration Open', color: 'bg-blue-100 text-blue-800', icon: '📝' },
      'check_in': { label: 'Check-In', color: 'bg-yellow-100 text-yellow-800', icon: '✅' },
      'round_robin': { label: 'Round Robin', color: 'bg-orange-100 text-orange-800', icon: '🔄' },
      'bracket': { label: 'Bracket Play', color: 'bg-red-100 text-red-800', icon: '🏆' },
      'completed': { label: 'Completed', color: 'bg-green-100 text-green-800', icon: '🎉' }
    };
    return phaseMap[phase as keyof typeof phaseMap] || phaseMap.setup;
  };

  // Get round display info
  const getRoundDisplayInfo = (round: string) => {
    const roundMap: Record<string, string> = {
      'RR_R1': 'Round Robin - Round 1',
      'RR_R2': 'Round Robin - Round 2',
      'RR_R3': 'Round Robin - Round 3',
      'quarterfinal': 'Quarterfinals',
      'semifinal': 'Semifinals',
      'final': 'Final',
      'lbr-round-1': 'Losers R1',
      'lbr-round-2': 'Losers R2',
      'lbr-quarterfinal': 'Losers Quarterfinal',
      'lbr-semifinal': 'Losers Semifinal',
      'lbr-final': 'Losers Final',
      'grand-final': 'Grand Final'
    };
    return roundMap[round] || round;
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600 mb-4">You need admin privileges to manage tournaments.</p>
      </div>
    );
  }

  if (loading && !liveTournament) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-500">Loading tournament...</span>
      </div>
    );
  }

  if (!liveTournament) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Tournament Not Found</h2>
        <p className="text-gray-600 mb-4">Could not load tournament management data.</p>
        <button onClick={() => navigate('/tournaments')} className="btn btn-primary">
          Back to Tournaments
        </button>
      </div>
    );
  }

  const phaseInfo = getPhaseDisplayInfo(liveTournament.phase.phase);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-gray-900">Tournament Management</h1>
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${phaseInfo.color}`}>
              {phaseInfo.icon} {phaseInfo.label}
            </span>
          </div>
          <p className="text-gray-600 mt-1">
            {liveTournament.location} • {new Date(liveTournament.date).toLocaleDateString()} • BOD #{liveTournament.bodNumber}
          </p>
          {liveTournament.phase.currentRound && (
            <p className="text-sm text-gray-500">
              Current: {getRoundDisplayInfo(liveTournament.phase.currentRound)}
              ({liveTournament.phase.completedMatches}/{liveTournament.phase.totalMatches} matches completed)
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate(`/tournaments/${id}`)}
            className="btn btn-outline btn-sm"
          >
            View Details
          </button>
          <button
            onClick={() => navigate('/tournaments')}
            className="btn btn-secondary btn-sm"
          >
            Back to List
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center">
            <span className="text-red-500 text-xl mr-2">⚠️</span>
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Control Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tournament Control Panel */}
          <div className="bg-red-100 p-2 mb-4 border border-red-400 text-red-700">DEBUG: bracketType="{liveTournament.bracketType}" (isRR: {String(isRoundRobin(liveTournament.bracketType))})</div>
          <EditableCard title="Tournament Controls" showEditButton={false}>
            <div className="space-y-4">
              {/* Phase Actions */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {liveTournament.phase.phase === 'setup' && (() => {
                  const preselectedPlayerCount = (liveTournament.players?.length ?? 0) +
                    (liveTournament.teams?.reduce((sum, team) => sum + (team.players?.length || 0), 0) ?? 0);
                  const maxPlayers = liveTournament.maxPlayers ?? 0;
                  const isFullyPreselected = maxPlayers > 0 && preselectedPlayerCount >= maxPlayers;
                  const bt = liveTournament.bracketType;

                  return (
                    <>
                      {isFullyPreselected ? (
                        isRoundRobin(bt) ? (
                          <button
                            onClick={() => executeTournamentAction({ action: 'start_round_robin' })}
                            className="btn btn-primary btn-sm"
                            disabled={loading}
                            title="Start immediately with preselected players/teams"
                          >
                            Start Round Robin
                          </button>
                        ) : (
                          <button
                            onClick={() => executeTournamentAction({ action: 'start_bracket' })}
                            className="btn btn-primary btn-sm"
                            disabled={loading}
                            title="Start bracket play with current teams"
                          >
                            Start Bracket
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => executeTournamentAction({ action: 'start_registration' })}
                          className="btn btn-outline btn-sm"
                          disabled={loading}
                          title="Open tournament for first-come, first-served registration"
                        >
                          Open Registration
                        </button>
                      )}
                    </>
                  );
                })()}

                {liveTournament.phase.phase === 'registration' && (
                  <>
                    <button
                      onClick={() => executeTournamentAction({ action: 'close_registration' })}
                      className="btn btn-outline btn-sm"
                      disabled={loading}
                    >
                      Close Registration
                    </button>
                    <button
                      onClick={() => executeTournamentAction({ action: 'start_checkin' })}
                      className="btn btn-primary btn-sm"
                      disabled={loading}
                    >
                      Start Check-In
                    </button>
                  </>
                )}

                {liveTournament.phase.phase === 'check_in' && (() => {
                  const bt = liveTournament.bracketType;
                  const action = isRoundRobin(bt) ? 'start_round_robin' : 'start_bracket';
                  const label = isRoundRobin(bt) ? 'Start Round Robin' : 'Start Bracket';
                  return (
                    <button
                      onClick={() => executeTournamentAction({ action: action as any })}
                      className="btn btn-primary btn-sm"
                      disabled={loading}
                    >
                      {label}
                    </button>
                  );
                })()}

                {liveTournament.phase.phase === 'round_robin' && (
                  <>
                    {liveTournament.phase.canAdvance && liveTournament.phase.currentRound !== 'RR_R3' && (
                      <button
                        onClick={() => executeTournamentAction({ action: 'advance_round' })}
                        className="btn btn-primary btn-sm"
                        disabled={loading}
                      >
                        Next Round
                      </button>
                    )}
                    {liveTournament.phase.canAdvance && liveTournament.phase.currentRound === 'RR_R3' && (
                      <button
                        onClick={() => executeTournamentAction({ action: 'start_bracket' })}
                        className="btn btn-primary btn-sm"
                        disabled={loading}
                      >
                        Start Bracket
                      </button>
                    )}
                  </>
                )}

                {liveTournament.phase.phase === 'bracket' && (
                  <>
                    {liveTournament.phase.canAdvance && (
                      <button
                        onClick={() => executeTournamentAction({ action: 'advance_round' })}
                        className="btn btn-primary btn-sm"
                        disabled={loading}
                      >
                        Next Round
                      </button>
                    )}
                    {liveTournament.phase.currentRound === 'final' && liveTournament.phase.canAdvance && (
                      <button
                        onClick={() => executeTournamentAction({ action: 'complete_tournament' })}
                        className="btn btn-success btn-sm"
                        disabled={loading}
                      >
                        Complete Tournament
                      </button>
                    )}
                  </>
                )}

                {/* Emergency Controls */}
                <button
                  onClick={() => executeTournamentAction({ action: 'reset_tournament' })}
                  className="btn btn-danger btn-sm"
                  disabled={loading}
                  title="Reset tournament to setup phase"
                >
                  Emergency Reset
                </button>
              </div>

              {/* Round Progress */}
              {liveTournament.phase.currentRound && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {getRoundDisplayInfo(liveTournament.phase.currentRound)} Progress
                    </span>
                    <span className="text-sm text-gray-500">
                      {liveTournament.phase.completedMatches} / {liveTournament.phase.totalMatches}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(liveTournament.phase.completedMatches / liveTournament.phase.totalMatches) * 100}%`
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </EditableCard>

          {/* Match Management */}
          <EditableCard title={`${getRoundDisplayInfo(selectedRound)} Matches`} showEditButton={false}>
            <div className="space-y-4">
              {/* Round Selector */}
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">Round:</label>
                <select
                  value={selectedRound}
                  onChange={async (e) => {
                    setSelectedRound(e.target.value);
                    persistSelectedRound(e.target.value);
                    const params = new URLSearchParams(location.search);
                    params.set('round', e.target.value);
                    navigate({ search: params.toString() }, { replace: true });
                    // Persist globally on the server
                    try {
                      await apiClient.executeTournamentAction(id!, { action: 'set_round', parameters: { targetRound: e.target.value } });
                    } catch (err) {
                      console.warn('Failed to persist selected round to server', err);
                    }
                    const matchesResponse = await apiClient.getTournamentMatches(id!, e.target.value);
                    if (matchesResponse.success && matchesResponse.data) {
                      setCurrentMatches(matchesResponse.data);
                    }
                  }}
                  className="select select-sm"
                >
                  {getRoundOptions(((liveTournament as any).bracketType as any)).map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Matches Grid */}
              {/* Grid Toolbar */}
              <MatchesToolbar
                matchCount={currentMatches.length}
                compactListView={compactListView}
                onToggleCompact={(v) => { setCompactListView(v); persistToggle('compact', v); }}
                requirePerPlayerScores={requirePerPlayerScores}
                onToggleRequirePerPlayer={(v) => { setRequirePerPlayerScores(v); persistToggle('requirePerPlayerScores', v); }}
                strictTotals={strictTotals}
                onToggleStrictTotals={(v) => { setStrictTotals(v); persistToggle('strictTotals', v); }}
                canConfirmAll={isAdmin && currentMatches.some(m => (m.status as any) === "completed")}
                onConfirmAll={confirmAllCompletedInRound}
                loading={loading}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentMatches.length === 0 && (
                  <div className="col-span-full flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <span className="text-sm text-yellow-800">No matches found for this round.</span>
                    {isAdmin && (
                      <button
                        onClick={generateMatchesForSelectedRound}
                        className="btn btn-sm btn-primary"
                        disabled={loading}
                      >
                        Generate Matches
                      </button>
                    )}
                  </div>
                )}
                {uniqueMatches.map((match, idx) => (
                  <div
                    key={`${(match as any)._id || (match as any).id || `${(match as any).tournamentId}-${(match as any).round}-${(match as any).matchNumber}`
                      }-${idx}`}
                    className={`p-4 border rounded-lg ${match.status === 'completed' ? 'bg-green-50 border-green-200' :
                      (match.status as any) === 'in-progress' ? 'bg-yellow-50 border-yellow-200' :
                        'bg-white border-gray-200'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-900">
                        Match {match.matchNumber}
                      </span>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${match.status === 'completed' ? 'bg-green-100 text-green-800' :
                          (match.status as any) === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                            match.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                          }`}
                      >
                        {match.status.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Match Scoring with Individual Player Scores */}
                    <MatchScoring
                      match={match}
                      onUpdateMatch={updateMatchScore}
                      compact={compactListView}
                      requirePerPlayerScores={requirePerPlayerScores}
                      strictTotals={strictTotals}
                    />

                    {/* Match Details */}
                    {(match.court || match.startTime || match.notes) && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="space-y-1 text-xs text-gray-500">
                          {match.court && <p>Court: {match.court}</p>}
                          {match.startTime && <p>Started: {new Date(match.startTime).toLocaleTimeString()}</p>}
                          {match.notes && <p>Notes: {match.notes}</p>}
                        </div>
                      </div>
                    )}

                    {/* Quick Actions */}
                    <div className="mt-3 flex space-x-2">
                      {/* Removed per-match Start; enter scores below to complete */}
                      {((match.status as any) === 'completed') && (
                        <button
                          onClick={() => updateMatchScore({
                            matchId: (match._id || (match as any).id) as string,
                            status: 'confirmed'
                          })}
                          className="btn btn-primary btn-xs"
                        >
                          Confirm Result
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Generate Matches Button */}
              {currentMatches.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No matches generated for this round</p>
                  <button
                    onClick={async () => {
                      const response = await apiClient.generateMatches(id!, selectedRound);
                      if (response.success && response.data) {
                        setCurrentMatches(response.data);
                      }
                    }}
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    Generate Matches
                  </button>
                </div>
              )}
            </div>
          </EditableCard>

          {/* Bracket Visualization */}
          {liveTournament.phase.phase === 'bracket' && liveTournament.matches.length > 0 && (
            <EditableCard title="Tournament Bracket" showEditButton={false}>
              <BracketView
                matches={liveTournament.matches.filter(m => ['quarterfinal', 'semifinal', 'final'].includes(m.round))}
                teams={liveTournament.teams}
                currentRound={liveTournament.phase.currentRound}
                onMatchClick={(match) => {
                  // Handle match click for editing
                  console.log('Match clicked:', match);
                }}
                showScores={true}
                editable={true}
              />
            </EditableCard>
          )}
        </div>

        {/* Sidebar - Live Stats & Teams */}
        <div className="space-y-6">
          {/* Live Tournament Statistics */}
          <LiveStats
            tournamentId={id!}
            refreshInterval={15000}
            compact={true}
            bracketType={liveTournament.bracketType}
          />
          <PlayerLeaderboard tournamentId={id!} />
          {/* Check-In Status */}
          {liveTournament.phase.phase === 'check_in' && (
            <EditableCard title="Team Check-In" showEditButton={false}>
              <div className="space-y-3">
                {liveTournament.teams.map((team) => {
                  const checkInStatus = liveTournament.checkInStatus[team.teamId];
                  return (
                    <div
                      key={team.teamId}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-sm">{team.teamName}</p>
                        <p className="text-xs text-gray-500">
                          {team.players.map(p => p.playerName).join(' & ')}
                        </p>
                      </div>
                      <button
                        onClick={() => checkInTeam(team.teamId, !checkInStatus?.checkedIn)}
                        className={`btn btn-xs ${checkInStatus?.checkedIn
                          ? 'btn-success'
                          : 'btn-outline'
                          }`}
                      >
                        {checkInStatus?.checkedIn ? '✓ Checked In' : 'Check In'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </EditableCard>
          )}

          {/* Current Standings */}
          {liveTournament.currentStandings.length > 0 && (
            <EditableCard title="Current Standings" showEditButton={false}>
              <div className="space-y-2">
                {liveTournament.currentStandings
                  .sort((a, b) => (a.totalStats.bodFinish || 999) - (b.totalStats.bodFinish || 999))
                  .slice(0, 8)
                  .map((result, index) => (
                    <div
                      key={result.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm">#{index + 1}</span>
                        <div>
                          <p className="text-sm font-medium">{(result as any).teamName}</p>
                          <p className="text-xs text-gray-500">
                            {result.totalStats.totalWon}-{result.totalStats.totalLost}
                            ({((result.totalStats.winPercentage || 0) * 100).toFixed(0)}%)
                          </p>
                        </div>
                      </div>
                      {index < 3 && (
                        <span className="text-lg">
                          {index === 0 ? '🏆' : index === 1 ? '🥈' : '🥉'}
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            </EditableCard>
          )}

          {/* Tournament Info */}
          <EditableCard title="Tournament Info" showEditButton={false}>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Format:</span>
                <span className="font-medium">{liveTournament.format}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Teams:</span>
                <span className="font-medium">{liveTournament.teams.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Max Players:</span>
                <span className="font-medium">{liveTournament.maxPlayers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${phaseInfo.color}`}>
                  {phaseInfo.label}
                </span>
              </div>
            </div>
          </EditableCard>
        </div>
      </div>
    </div>
  );
};

export default TournamentManage;



