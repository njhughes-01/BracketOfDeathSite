import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../services/api';
// import Card from '../components/ui/Card'; // Replaced
import LoadingSpinner from '../components/ui/LoadingSpinner';
// import { EditableCard, EditableNumber } from '../components/admin'; // Replaced
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
  MatchUpdate
} from '../types/api';

const TournamentManage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();

  // Helpers for persistence
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
  const uniqueMatches = useMemo(() => {
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
        const params = new URLSearchParams(location.search);
        const urlRound = params.get('round') || '';
        const options = getRoundOptions(bt).map(o => o.value);
        let nextRound = response.data.phase.currentRound || getDefaultRoundFor(bt);
        const serverRound = (response.data as any).managementState?.currentRound as string | undefined;
        if (serverRound && options.includes(serverRound)) nextRound = serverRound as any;
        if (urlRound && options.includes(urlRound)) nextRound = urlRound as any;
        const persisted = readPersistedRound();
        if (!urlRound && persisted && options.includes(persisted)) nextRound = persisted as any;
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
  }, [id, location.search]);

  useEffect(() => {
    let pollInterval: any;
    loadTournamentData();

    // Establish SSE stream for realtime updates
    if (id && typeof window !== 'undefined') {
      const es = new EventSource(`/api/tournaments/${id}/stream`);
      eventSourceRef.current = es;

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

            // Should we switch round? Only if not initialized or actively following
            if (!initializedRoundRef.current) {
              round = liveData.phase.currentRound || getDefaultRoundFor(bt);
              initializedRoundRef.current = true;
              setSelectedRound(round);
            } else if (!options.includes(round)) {
              // Current selected round is invalid for this tournament type? (unlikely but safe)
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
      // Listen for both snapshot and update (snapshot logic is similar to update usually)
      es.addEventListener('snapshot', handleUpdate as any);
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
  }, [id, loadTournamentData, selectedRound]);

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
        // We will get update via SSE, but also manually refresh for immediate feedback
        if (liveTournament?.phase.currentRound) {
          // Optimistically or explicitly refresh
          await loadTournamentData();
        }
      }
    } catch (err: any) {
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

  // Batch: confirm all completed (not yet confirmed)
  const confirmAllCompletedInRound = async () => {
    if (!currentMatches || currentMatches.length === 0) return;
    try {
      setLoading(true);
      const completed = currentMatches.filter(m => (m.status as any) === 'completed');
      if (completed.length === 0) return;

      const response = await apiClient.confirmCompletedMatches(id!);
      if (response.success && response.data) {
        // Refresh data
        await loadTournamentData();
      }
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
      'setup': { label: 'Setup', color: 'bg-gray-700 text-gray-300', icon: 'settings' },
      'registration': { label: 'Registration Open', color: 'bg-blue-500/20 text-blue-400 border border-blue-500/50', icon: 'app_registration' },
      'check_in': { label: 'Check-In', color: 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50', icon: 'check_circle' },
      'round_robin': { label: 'Round Robin', color: 'bg-orange-500/20 text-orange-400 border border-orange-500/50', icon: 'sync' },
      'bracket': { label: 'Bracket Play', color: 'bg-purple-500/20 text-purple-400 border border-purple-500/50', icon: 'emoji_events' },
      'completed': { label: 'Completed', color: 'bg-green-500/20 text-green-400 border border-green-500/50', icon: 'celebration' }
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
    };
    return roundMap[round] || round.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background-dark text-center px-4">
        <span className="material-symbols-outlined text-red-500 text-5xl mb-4">lock</span>
        <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-slate-400 mb-6">You need admin privileges to manage tournaments.</p>
        <Link to="/tournaments" className="btn btn-primary">Back to Tournaments</Link>
      </div>
    );
  }

  if (loading && !liveTournament) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background-dark">
        <LoadingSpinner size="lg" />
        <span className="mt-4 text-slate-500 animate-pulse">Loading tournament data...</span>
      </div>
    );
  }

  if (!liveTournament) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background-dark text-center px-4">
        <span className="material-symbols-outlined text-slate-500 text-5xl mb-4">error</span>
        <h2 className="text-xl font-bold text-white mb-2">Tournament Not Found</h2>
        <p className="text-slate-400 mb-6">Could not load tournament management data.</p>
        <Link to="/tournaments" className="btn btn-primary">Back to Tournaments</Link>
      </div>
    );
  }

  const phaseInfo = getPhaseDisplayInfo(liveTournament.phase.phase);

  return (
    <div className="min-h-screen bg-background-dark text-white pb-20">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-background-dark/95 backdrop-blur-md border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold truncate">{`BOD #${liveTournament.bodNumber}`}</h1>
              <div className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold flex items-center gap-1 ${phaseInfo.color}`}>
                <span className="material-symbols-outlined text-[12px]">{phaseInfo.icon}</span>
                {phaseInfo.label}
              </div>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
              <span>{new Date(liveTournament.date).toLocaleDateString()}</span>
              <span>•</span>
              <span>{liveTournament.location}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to={`/tournaments/${id}`} className="size-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors" title="View Public Page">
              <span className="material-symbols-outlined text-white text-[20px]">visibility</span>
            </Link>
            <Link to="/tournaments" className="size-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors" title="Back to List">
              <span className="material-symbols-outlined text-white text-[20px]">close</span>
            </Link>
          </div>
        </div>

        {/* Phase Progress Bar for Current Phase */}
        {liveTournament.phase.currentRound && (
          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-slate-500 uppercase font-bold mb-1">
              <span>{getRoundDisplayInfo(liveTournament.phase.currentRound)}</span>
              <span>{liveTournament.phase.completedMatches}/{liveTournament.phase.totalMatches} Matches</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-500" style={{ width: `${(liveTournament.phase.completedMatches / Math.max(1, liveTournament.phase.totalMatches)) * 100}%` }}></div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">

        {/* Main Control Area */}
        <div className="lg:col-span-2 space-y-6">

          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-red-500">error</span>
              <span className="text-sm text-red-400">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-white"><span className="material-symbols-outlined">close</span></button>
          </div>


          {/* Actions Panel */}
          <div className="bg-surface-dark rounded-2xl border border-white/5 p-5 shadow-lg">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Phase Controls</h3>
            <div className="flex flex-wrap gap-3">
              {/* Logic for buttons based on phase */}
              {liveTournament.phase.phase === 'setup' && (
                <>
                  {/* Only show open registration if we don't have a pre-filled roster */}
                  {(!liveTournament.teams?.length && !liveTournament.players?.length) && (
                    <button onClick={() => executeTournamentAction({ action: 'start_registration' })} className="btn btn-primary btn-sm rounded-lg shadow-lg hover:shadow-primary/20" disabled={loading}>Open Registration</button>
                  )}
                  {(liveTournament.teams?.length || 0) > 0 && <button onClick={() => executeTournamentAction({ action: 'start_bracket' })} className="btn btn-secondary btn-sm rounded-lg" disabled={loading}>Start with Current Teams</button>}
                </>
              )}
              {liveTournament.phase.phase === 'registration' && (
                <>
                  <button onClick={() => executeTournamentAction({ action: 'close_registration' })} className="px-4 py-2 rounded-lg bg-orange-500/20 text-orange-500 font-bold hover:bg-orange-500/30 text-sm" disabled={loading}>Close Reg</button>
                  <button onClick={() => executeTournamentAction({ action: 'start_checkin' })} className="px-4 py-2 rounded-lg bg-primary text-white font-bold hover:bg-primary-hover text-sm" disabled={loading}>Start Check-In</button>
                </>
              )}
              {liveTournament.phase.phase === 'check_in' && (
                <button onClick={() => executeTournamentAction({ action: isRoundRobin(liveTournament.bracketType) ? 'start_round_robin' : 'start_bracket' as any })} className="px-4 py-2 rounded-lg bg-accent text-background-dark font-bold hover:brightness-110 text-sm shadow-glow-accent" disabled={loading}>
                  {isRoundRobin(liveTournament.bracketType) ? 'Start Round Robin' : 'Start Bracket'}
                </button>
              )}
              {(liveTournament.phase.phase === 'round_robin' || liveTournament.phase.phase === 'bracket') && (
                <>
                  {liveTournament.phase.canAdvance && (
                    <button onClick={() => executeTournamentAction({ action: liveTournament.phase.currentRound === 'final' ? 'complete_tournament' : 'advance_round' })} className="px-4 py-2 rounded-lg bg-accent text-background-dark font-bold hover:brightness-110 text-sm shadow-glow-accent" disabled={loading}>
                      {liveTournament.phase.currentRound === 'final' ? 'Complete Tournament' : 'Advance to Next Round'}
                    </button>
                  )}
                  {liveTournament.phase.phase === 'bracket' && liveTournament.phase.totalMatches === 0 && (
                    <button onClick={() => executeTournamentAction({ action: 'start_bracket' })} className="px-4 py-2 rounded-lg bg-primary text-white font-bold hover:bg-primary-hover text-sm" disabled={loading}>
                      Start Bracket
                    </button>
                  )}
                  {liveTournament.phase.phase === 'round_robin' && liveTournament.phase.totalMatches === 0 && (
                    <button onClick={() => executeTournamentAction({ action: 'start_round_robin' })} className="px-4 py-2 rounded-lg bg-primary text-white font-bold hover:bg-primary-hover text-sm" disabled={loading}>
                      Start Round Robin
                    </button>
                  )}
                  {/* Removed redundant/harmful Start Bracket Play button for RR_R3 - advance_round handles this correctly */}
                </>
              )}

              {/* Danger Zone */}
              <button onClick={() => { if (window.confirm('Are you sure you want to reset? This is destructive.')) executeTournamentAction({ action: 'reset_tournament' }) }} className="ml-auto px-3 py-2 rounded-lg bg-red-500/10 text-red-500 font-bold hover:bg-red-500 hover:text-white text-xs" disabled={loading}>
                Force Reset
              </button>
            </div>
          </div>

          {/* Matches Management */}
          <div className="bg-surface-dark rounded-2xl border border-white/5 p-5 shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
              <h3 className="text-lg font-bold text-white">Matches</h3>

              {/* Round Selector */}
              <select
                value={selectedRound}
                onChange={(e) => {
                  setSelectedRound(e.target.value);
                  persistSelectedRound(e.target.value);
                }}
                className="bg-background-dark border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary appearance-none"
              >
                {getRoundOptions(liveTournament.bracketType).map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Toolbar */}
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

            {/* Grid */}
            <div className={`mt-4 grid gap-3 ${compactListView ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-2'}`}>
              {currentMatches.length === 0 && (
                <div className="col-span-full py-10 text-center border-2 border-dashed border-white/5 rounded-xl">
                  <p className="text-slate-500 mb-2">No matches scheduled for this round</p>
                  <button onClick={generateMatchesForSelectedRound} className="text-primary font-bold text-sm hover:underline">Generate Matches</button>
                </div>
              )}

              {uniqueMatches.map((match, idx) => (
                <div
                  key={`${(match as any).id || idx}`}
                  className={`rounded-xl border transition-all ${match.status === 'completed' ? 'bg-surface-dark border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.1)]' :
                    (match.status as any) === 'in-progress' ? 'bg-surface-dark border-yellow-500/30' :
                      'bg-surface-dark border-white/5'
                    }`}
                >
                  <div className="p-3 border-b border-white/5 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase">Match {match.matchNumber}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${match.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                      (match.status as any) === 'in-progress' ? 'bg-yellow-500/20 text-yellow-500' :
                        'bg-slate-700 text-slate-400'
                      }`}>
                      {match.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Scoring Component */}
                  <div className="p-3 text-white">
                    <MatchScoring
                      match={match}
                      onUpdateMatch={updateMatchScore}
                      compact={compactListView}
                      requirePerPlayerScores={requirePerPlayerScores}
                      strictTotals={strictTotals}
                    />
                  </div>
                </div>
              ))}
            </div>

          </div>

          {/* Bracket Visualization (Only for bracket phase) */}
          {liveTournament.phase.phase === 'bracket' && (
            <div className="bg-surface-dark rounded-2xl border border-white/5 p-5 overflow-x-auto shadow-lg">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Bracket View</h3>
              <BracketView
                matches={liveTournament.matches.filter(m => ['quarterfinal', 'semifinal', 'final'].includes(m.round))}
                teams={liveTournament.teams}
                currentRound={liveTournament.phase.currentRound}
                onMatchClick={() => { }}
                showScores={true}
                editable={true}
              />
            </div>
          )}

        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <LiveStats
            tournamentId={id!}
            refreshInterval={15000}
            compact={true}
            bracketType={liveTournament.bracketType}
          />

          <PlayerLeaderboard tournamentId={id!} />

          {/* Check-In list if active */}
          {liveTournament.phase.phase === 'check_in' && (
            <div className="bg-surface-dark rounded-2xl border border-white/5 p-4 shadow-lg">
              <h3 className="text-sm font-bold text-white mb-3">Check-In Status</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                {liveTournament.teams.map((team) => {
                  const checkInStatus = liveTournament.checkInStatus[team.teamId];
                  const checkedIn = checkInStatus?.checkedIn;
                  return (
                    <div key={team.teamId} className="flex items-center justify-between p-2 rounded-lg bg-background-dark border border-white/5 transition-colors hover:bg-white/5">
                      <div>
                        <p className="text-sm font-bold text-white">{team.teamName}</p>
                        <p className="text-[10px] text-slate-500">{team.players.map(p => p.playerName).join(', ')}</p>
                      </div>
                      <button
                        onClick={() => checkInTeam(team.teamId, !checkedIn)}
                        className={`size-8 rounded flex items-center justify-center transition-colors ${checkedIn ? 'bg-green-500 text-black' : 'bg-white/10 text-slate-500 hover:bg-white/20'}`}
                      >
                        <span className="material-symbols-outlined text-lg">{checkedIn ? 'check' : 'login'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default TournamentManage;
