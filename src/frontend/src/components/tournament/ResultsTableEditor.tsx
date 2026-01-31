import React, { useState } from 'react';
import apiClient from '../../services/api';
import LoadingSpinner from '../ui/LoadingSpinner';
import type { TournamentResult, TournamentResultInput } from '../../types/api';

type ResultsTableEditorProps = {
  tournamentId: string;
  results: TournamentResult[];
  onResultsChanged: () => void;
};

type EditingResult = {
  resultId: string;
  totalWon: number;
  totalLost: number;
  finalRank: number;
};

const ResultsTableEditor: React.FC<ResultsTableEditorProps> = ({
  tournamentId,
  results,
  onResultsChanged,
}) => {
  const [editingResult, setEditingResult] = useState<EditingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleEdit = (result: TournamentResult) => {
    setEditingResult({
      resultId: result._id || result.id,
      totalWon: result.totalStats?.totalWon || 0,
      totalLost: result.totalStats?.totalLost || 0,
      finalRank: result.totalStats?.finalRank || result.totalStats?.bodFinish || 0,
    });
    setError(null);
    setSuccess(null);
  };

  const handleSave = async () => {
    if (!editingResult) return;

    try {
      setLoading(true);
      const totalPlayed = editingResult.totalWon + editingResult.totalLost;
      const winPct = totalPlayed > 0 ? editingResult.totalWon / totalPlayed : 0;

      const updateData: Partial<TournamentResultInput> = {
        totalStats: {
          totalWon: editingResult.totalWon,
          totalLost: editingResult.totalLost,
          totalPlayed: totalPlayed,
          winPercentage: winPct,
          finalRank: editingResult.finalRank,
          bodFinish: editingResult.finalRank,
        },
      };

      const res = await apiClient.updateTournamentResult(editingResult.resultId, updateData);
      
      if (res.success) {
        setSuccess('Result updated successfully');
        setEditingResult(null);
        onResultsChanged();
      } else {
        setError(res.message || 'Failed to update result');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update result');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (resultId: string) => {
    if (!window.confirm('Are you sure you want to delete this result? This cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      const res = await apiClient.deleteTournamentResult(resultId);
      
      if (res.success) {
        setSuccess('Result deleted');
        onResultsChanged();
      } else {
        setError(res.message || 'Failed to delete result');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to delete result');
    } finally {
      setLoading(false);
    }
  };

  const sortedResults = [...results].sort(
    (a, b) => (a.totalStats?.finalRank || 99) - (b.totalStats?.finalRank || 99)
  );

  return (
    <div className="bg-surface-dark rounded-2xl border border-white/5 overflow-hidden">
      {error && (
        <div className="m-4 bg-red-500/10 border border-red-500/30 p-3 rounded-lg flex items-center justify-between">
          <span className="text-sm text-red-400">{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-white">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {success && (
        <div className="m-4 bg-green-500/10 border border-green-500/30 p-3 rounded-lg flex items-center justify-between">
          <span className="text-sm text-green-400">{success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-white">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      <table className="w-full">
        <thead className="bg-background-dark">
          <tr>
            <th className="text-left p-4 text-xs text-slate-500 uppercase">Rank</th>
            <th className="text-left p-4 text-xs text-slate-500 uppercase">Team</th>
            <th className="text-center p-4 text-xs text-slate-500 uppercase">W</th>
            <th className="text-center p-4 text-xs text-slate-500 uppercase">L</th>
            <th className="text-center p-4 text-xs text-slate-500 uppercase">Win %</th>
            <th className="text-right p-4 text-xs text-slate-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedResults.map((result, idx) => {
            const isEditing = editingResult?.resultId === (result._id || result.id);
            
            return (
              <tr key={result._id || idx} className="border-t border-white/5">
                <td className="p-4">
                  {isEditing ? (
                    <input
                      type="number"
                      min="1"
                      value={editingResult.finalRank}
                      onChange={(e) => setEditingResult({
                        ...editingResult,
                        finalRank: parseInt(e.target.value) || 0,
                      })}
                      className="w-16 bg-background-dark border border-white/10 rounded px-2 py-1 text-white text-center"
                    />
                  ) : (
                    <span className={`font-bold ${
                      result.totalStats?.finalRank === 1 ? 'text-yellow-400' :
                      result.totalStats?.finalRank === 2 ? 'text-slate-300' :
                      result.totalStats?.finalRank === 3 ? 'text-amber-600' :
                      'text-slate-500'
                    }`}>
                      #{result.totalStats?.finalRank || result.totalStats?.bodFinish || '-'}
                    </span>
                  )}
                </td>
                <td className="p-4">
                  <div className="font-medium text-white">{result.teamName}</div>
                  <div className="text-xs text-slate-500">
                    {Array.isArray(result.players) 
                      ? result.players.map((p: any) => p.name || p).join(', ')
                      : '-'
                    }
                  </div>
                </td>
                <td className="p-4 text-center">
                  {isEditing ? (
                    <input
                      type="number"
                      min="0"
                      value={editingResult.totalWon}
                      onChange={(e) => setEditingResult({
                        ...editingResult,
                        totalWon: parseInt(e.target.value) || 0,
                      })}
                      className="w-16 bg-background-dark border border-white/10 rounded px-2 py-1 text-white text-center"
                    />
                  ) : (
                    <span className="text-green-400 font-mono">
                      {result.totalStats?.totalWon || 0}
                    </span>
                  )}
                </td>
                <td className="p-4 text-center">
                  {isEditing ? (
                    <input
                      type="number"
                      min="0"
                      value={editingResult.totalLost}
                      onChange={(e) => setEditingResult({
                        ...editingResult,
                        totalLost: parseInt(e.target.value) || 0,
                      })}
                      className="w-16 bg-background-dark border border-white/10 rounded px-2 py-1 text-white text-center"
                    />
                  ) : (
                    <span className="text-red-400 font-mono">
                      {result.totalStats?.totalLost || 0}
                    </span>
                  )}
                </td>
                <td className="p-4 text-center font-mono">
                  {isEditing ? (
                    <span className="text-slate-400">
                      {editingResult.totalWon + editingResult.totalLost > 0
                        ? ((editingResult.totalWon / (editingResult.totalWon + editingResult.totalLost)) * 100).toFixed(0)
                        : 0}%
                    </span>
                  ) : (
                    ((result.totalStats?.winPercentage || 0) * 100).toFixed(0) + '%'
                  )}
                </td>
                <td className="p-4 text-right">
                  {isEditing ? (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-3 py-1 rounded bg-primary text-white text-xs font-bold"
                      >
                        {loading ? <LoadingSpinner size="sm" /> : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingResult(null)}
                        className="px-3 py-1 rounded bg-white/10 text-white text-xs font-bold"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(result)}
                        className="size-7 rounded bg-white/5 flex items-center justify-center hover:bg-white/10"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(result._id || result.id)}
                        className="size-7 rounded bg-red-500/10 flex items-center justify-center hover:bg-red-500/20 text-red-400"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {results.length === 0 && (
        <div className="p-8 text-center text-slate-500">
          No results recorded for this tournament
        </div>
      )}
    </div>
  );
};

export default ResultsTableEditor;
