import React, { useEffect, useState } from 'react';
import Card from '../../components/ui/Card';
import apiClient from '../../services/api';

interface PlayerStat {
  playerId: string;
  playerName?: string;
  totalPoints: number;
  matchesWithPoints: number;
  wins: number;
  losses: number;
}

const PlayerLeaderboard: React.FC<{ tournamentId: string }> = ({ tournamentId }) => {
  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const res: any = await apiClient.getTournamentPlayerStats(tournamentId);
        if (mounted) {
          if (res.success && Array.isArray(res.data)) {
            setStats(res.data);
          } else {
            setError(res.error || 'Failed to load player stats');
          }
        }
      } catch (e) {
        if (mounted) setError('Network error loading player stats');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [tournamentId]);

  return (
    <div className="bg-surface-dark rounded-2xl border border-white/5 p-4 shadow-lg">
      <h3 className="text-sm font-bold text-white mb-3">Player Leaderboard</h3>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm">
            <thead className="bg-black/20 text-slate-400 font-bold uppercase text-[10px]">
              <tr>
                <th className="text-left p-2 rounded-l-lg">Player</th>
                <th className="text-right p-2">Points</th>
                <th className="text-right p-2">Matches</th>
                <th className="text-right p-2 hidden sm:table-cell">W</th>
                <th className="text-right p-2 rounded-r-lg hidden sm:table-cell">L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {stats.slice(0, 10).map((s, idx) => (
                <tr key={s.playerId} className="group hover:bg-white/5 transition-colors">
                  <td className="p-2 flex items-center gap-2">
                    <span className={`text-[10px] w-4 text-slate-500 font-mono ${(idx < 3) ? 'text-accent' : ''}`}>{idx + 1}</span>
                    <span className="font-medium text-white group-hover:text-primary transition-colors truncate max-w-[100px]">{s.playerName || s.playerId}</span>
                  </td>
                  <td className="p-2 text-right font-bold text-primary">{s.totalPoints}</td>
                  <td className="p-2 text-right text-slate-400">{s.matchesWithPoints}</td>
                  <td className="p-2 text-right text-green-500 hidden sm:table-cell">{s.wins}</td>
                  <td className="p-2 text-right text-red-500 hidden sm:table-cell">{s.losses}</td>
                </tr>
              ))}
              {stats.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500 text-xs">No stats available</td>
                </tr>
              )}
            </tbody>
          </table>
          {stats.length > 10 && (
            <div className="text-center mt-2">
              <button className="text-xs text-primary hover:text-white transition-colors">View All</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlayerLeaderboard;

