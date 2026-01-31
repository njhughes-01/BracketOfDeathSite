import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../services/api';
import LoadingSpinner from '../ui/LoadingSpinner';
import ResultsTableEditor from './ResultsTableEditor';
import type { Tournament, Match, TournamentResult } from '../../types/api';

type HistoricalTournamentEditorProps = {
  tournamentId: string;
  tournament: Tournament;
};

type EditingMatch = {
  matchId: string;
  team1Score: number;
  team2Score: number;
  notes: string;
  editReason: string;
};

const HistoricalTournamentEditor: React.FC<HistoricalTournamentEditorProps> = ({ 
  tournamentId, 
  tournament 
}) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [results, setResults] = useState<TournamentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingMatch, setEditingMatch] = useState<EditingMatch | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [activeTab, setActiveTab] = useState<'matches' | 'results' | 'overview'>('overview');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [matchesRes, resultsRes] = await Promise.all([
        apiClient.getTournamentMatches(tournamentId),
        apiClient.getResultsByTournament(tournamentId),
      ]);
      
      if (matchesRes.success && matchesRes.data) {
        setMatches(matchesRes.data);
      }
      if (resultsRes.success && resultsRes.data) {
        setResults((resultsRes.data as any).results || []);
      }
    } catch (err) {
      setError('Failed to load tournament data');
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEditMatch = (match: Match) => {
    setEditingMatch({
      matchId: match._id || match.id,
      team1Score: match.team1.score ?? 0,
      team2Score: match.team2.score ?? 0,
      notes: match.notes || '',
      editReason: '',
    });
    setError(null);
    setSuccess(null);
  };

  const handleSaveMatch = async () => {
    if (!editingMatch) return;
    
    if (!editingMatch.editReason.trim()) {
      setError('Please provide a reason for this historical edit');
      return;
    }

    try {
      setLoading(true);
      const res = await apiClient.updateHistoricalMatchScore(
        editingMatch.matchId,
        editingMatch.team1Score,
        editingMatch.team2Score,
        editingMatch.editReason,
        editingMatch.notes
      );
      
      if (res.success) {
        setSuccess('Match score updated successfully');
        setEditingMatch(null);
        await loadData();
      } else {
        setError(res.message || 'Failed to update match');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update match');
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculateStats = async () => {
    if (!window.confirm('This will recalculate all player statistics based on this tournament\'s results. Continue?')) {
      return;
    }

    try {
      setRecalculating(true);
      setError(null);
      const res = await apiClient.recalculatePlayerStats(tournamentId);
      
      if (res.success) {
        setSuccess(`Stats recalculated: ${res.data?.playersUpdated} players updated from ${res.data?.resultsProcessed} results`);
      } else {
        setError(res.message || 'Failed to recalculate stats');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to recalculate stats');
    } finally {
      setRecalculating(false);
    }
  };

  const getRoundDisplayName = (round: string): string => {
    const names: Record<string, string> = {
      'RR_R1': 'Round Robin 1',
      'RR_R2': 'Round Robin 2',
      'RR_R3': 'Round Robin 3',
      'quarterfinal': 'Quarterfinals',
      'semifinal': 'Semifinals',
      'final': 'Final',
    };
    return names[round] || round;
  };

  const matchesByRound = matches.reduce((acc, match) => {
    const round = match.round;
    if (!acc[round]) acc[round] = [];
    acc[round].push(match);
    return acc;
  }, {} as Record<string, Match[]>);

  if (loading && matches.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark text-white pb-20">
      <div className="sticky top-0 z-20 bg-background-dark/95 backdrop-blur-md border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold truncate">{`BOD #${tournament.bodNumber}`}</h1>
              <div className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-amber-500/20 text-amber-400 border border-amber-500/50">
                Historical Edit Mode
              </div>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
              <span>{new Date(tournament.date).toLocaleDateString()}</span>
              <span>•</span>
              <span>{tournament.location}</span>
              <span>•</span>
              <span className="text-green-400">Completed</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link 
              to={`/tournaments/${tournamentId}`} 
              className="size-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined text-white text-[20px]">visibility</span>
            </Link>
            <Link 
              to="/tournaments" 
              className="size-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined text-white text-[20px]">close</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-6xl mx-auto">
        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-red-500">error</span>
              <span className="text-sm text-red-400">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-white">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-500/10 border border-green-500/30 p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-green-500">check_circle</span>
              <span className="text-sm text-green-400">{success}</span>
            </div>
            <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-white">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        )}

        <div className="flex gap-4 border-b border-white/10 mb-6">
          {(['overview', 'matches', 'results'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-1 text-sm font-bold capitalize transition-colors relative ${
                activeTab === tab ? 'text-primary' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-surface-dark rounded-2xl border border-white/5 p-6">
              <h3 className="text-lg font-bold mb-4">Tournament Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-background-dark rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-white">{matches.length}</div>
                  <div className="text-xs text-slate-500 uppercase">Total Matches</div>
                </div>
                <div className="bg-background-dark rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-white">{results.length}</div>
                  <div className="text-xs text-slate-500 uppercase">Team Results</div>
                </div>
                <div className="bg-background-dark rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-primary">{tournament.format}</div>
                  <div className="text-xs text-slate-500 uppercase">Format</div>
                </div>
                <div className="bg-background-dark rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {tournament.champion?.playerName || '-'}
                  </div>
                  <div className="text-xs text-slate-500 uppercase">Champion</div>
                </div>
              </div>
            </div>

            <div className="bg-surface-dark rounded-2xl border border-white/5 p-6">
              <h3 className="text-lg font-bold mb-4">Admin Actions</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleRecalculateStats}
                  disabled={recalculating}
                  className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400 font-bold hover:bg-amber-500/30 text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {recalculating ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <span className="material-symbols-outlined text-lg">calculate</span>
                  )}
                  Recalculate Player Stats
                </button>
                <Link
                  to={`/tournaments/${tournamentId}/edit`}
                  className="px-4 py-2 rounded-lg bg-white/10 text-white font-bold hover:bg-white/20 text-sm flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">edit</span>
                  Edit Tournament Details
                </Link>
              </div>
              <p className="text-xs text-slate-500 mt-3">
                Recalculating stats will update all player career statistics based on this tournament's results.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'matches' && (
          <div className="space-y-6">
            {Object.entries(matchesByRound).map(([round, roundMatches]) => (
              <div key={round} className="bg-surface-dark rounded-2xl border border-white/5 p-5">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
                  {getRoundDisplayName(round)}
                </h3>
                <div className="space-y-3">
                  {roundMatches.map((match) => (
                    <div
                      key={match._id || match.id}
                      className="bg-background-dark rounded-xl p-4 border border-white/5"
                    >
                      {editingMatch?.matchId === (match._id || match.id) ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">
                                {match.team1.teamName}
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={editingMatch.team1Score}
                                onChange={(e) => setEditingMatch({
                                  ...editingMatch,
                                  team1Score: parseInt(e.target.value) || 0,
                                })}
                                className="w-full bg-surface-dark border border-white/10 rounded-lg px-3 py-2 text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">
                                {match.team2.teamName}
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={editingMatch.team2Score}
                                onChange={(e) => setEditingMatch({
                                  ...editingMatch,
                                  team2Score: parseInt(e.target.value) || 0,
                                })}
                                className="w-full bg-surface-dark border border-white/10 rounded-lg px-3 py-2 text-white"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">
                              Reason for Edit *
                            </label>
                            <input
                              type="text"
                              value={editingMatch.editReason}
                              onChange={(e) => setEditingMatch({
                                ...editingMatch,
                                editReason: e.target.value,
                              })}
                              placeholder="e.g., Score correction, data entry error"
                              className="w-full bg-surface-dark border border-white/10 rounded-lg px-3 py-2 text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Notes</label>
                            <input
                              type="text"
                              value={editingMatch.notes}
                              onChange={(e) => setEditingMatch({
                                ...editingMatch,
                                notes: e.target.value,
                              })}
                              className="w-full bg-surface-dark border border-white/10 rounded-lg px-3 py-2 text-white"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={handleSaveMatch}
                              disabled={loading}
                              className="px-4 py-2 rounded-lg bg-primary text-white font-bold text-sm"
                            >
                              Save Changes
                            </button>
                            <button
                              onClick={() => setEditingMatch(null)}
                              className="px-4 py-2 rounded-lg bg-white/10 text-white font-bold text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-4">
                              <div className="flex-1">
                                <div className={`font-medium ${
                                  match.team1.score !== undefined && 
                                  match.team2.score !== undefined && 
                                  match.team1.score > match.team2.score 
                                    ? 'text-white' : 'text-slate-400'
                                }`}>
                                  {match.team1.teamName}
                                </div>
                              </div>
                              <div className="text-xl font-mono font-bold">
                                <span className={match.team1.score !== undefined && match.team2.score !== undefined && match.team1.score > match.team2.score ? 'text-primary' : 'text-slate-500'}>
                                  {match.team1.score ?? '-'}
                                </span>
                                <span className="text-slate-600 mx-2">:</span>
                                <span className={match.team1.score !== undefined && match.team2.score !== undefined && match.team2.score > match.team1.score ? 'text-primary' : 'text-slate-500'}>
                                  {match.team2.score ?? '-'}
                                </span>
                              </div>
                              <div className="flex-1 text-right">
                                <div className={`font-medium ${
                                  match.team1.score !== undefined && 
                                  match.team2.score !== undefined && 
                                  match.team2.score > match.team1.score 
                                    ? 'text-white' : 'text-slate-400'
                                }`}>
                                  {match.team2.teamName}
                                </div>
                              </div>
                            </div>
                            {match.notes && (
                              <div className="text-xs text-slate-500 mt-2">{match.notes}</div>
                            )}
                            {(match as any).adminOverride?.isHistoricalEdit && (
                              <div className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">history</span>
                                Edited: {(match as any).adminOverride.reason}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleEditMatch(match)}
                            className="ml-4 size-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                          >
                            <span className="material-symbols-outlined text-lg">edit</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'results' && (
          <ResultsTableEditor
            tournamentId={tournamentId}
            results={results}
            onResultsChanged={loadData}
          />
        )}
      </div>
    </div>
  );
};

export default HistoricalTournamentEditor;
