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
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">Player Leaderboard</h3>
      </div>
      {loading && <p className="text-sm text-gray-500">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2">Player</th>
                <th className="text-right p-2">Points</th>
                <th className="text-right p-2">Matches</th>
                <th className="text-right p-2">W</th>
                <th className="text-right p-2">L</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.playerId} className="border-t border-gray-200">
                  <td className="p-2">{s.playerName || s.playerId}</td>
                  <td className="p-2 text-right font-medium">{s.totalPoints}</td>
                  <td className="p-2 text-right">{s.matchesWithPoints}</td>
                  <td className="p-2 text-right text-green-700">{s.wins}</td>
                  <td className="p-2 text-right text-red-700">{s.losses}</td>
                </tr>
              ))}
              {stats.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-3 text-center text-gray-500">No player stats yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};

export default PlayerLeaderboard;

