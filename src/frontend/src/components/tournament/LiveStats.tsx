import React, { useState, useEffect, useCallback } from 'react';
import type { LiveTournamentStats } from '../../types/api';
import apiClient from '../../services/api';
import LoadingSpinner from '../ui/LoadingSpinner';
import Card from '../ui/Card';

import type { BracketType } from '../../utils/bracket';

interface LiveStatsProps {
  tournamentId: string;
  refreshInterval?: number; // in milliseconds
  compact?: boolean;
  bracketType?: BracketType; // Prefer bracket-type based UI over counts when provided
}

const LiveStats: React.FC<LiveStatsProps> = ({ 
  tournamentId, 
  refreshInterval = 30000, // 30 seconds default
  compact = false,
  bracketType,
}) => {
  const [stats, setStats] = useState<LiveTournamentStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.getLiveStats(tournamentId);
      if (response.success && response.data) {
        setStats(response.data);
        setLastUpdated(new Date());
      } else {
        setError(response.error || 'Failed to fetch live statistics');
      }
    } catch (err) {
      setError('Network error while fetching live statistics');
      console.error('Live stats fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchStats();
    
    // Set up automatic refresh
    const interval = setInterval(fetchStats, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchStats, refreshInterval]);

  const getPhaseDisplayInfo = (phase: string) => {
    const phaseMap: Record<string, { label: string; color: string; icon: string }> = {
      'setup': { label: 'Setup', color: 'bg-gray-100 text-gray-800', icon: '⚙️' },
      'registration': { label: 'Registration', color: 'bg-blue-100 text-blue-800', icon: '📝' },
      'check_in': { label: 'Check-In', color: 'bg-yellow-100 text-yellow-800', icon: '✅' },
      'round_robin': { label: 'Round Robin', color: 'bg-orange-100 text-orange-800', icon: '🔄' },
      'bracket': { label: 'Bracket Play', color: 'bg-red-100 text-red-800', icon: '🏆' },
      'completed': { label: 'Completed', color: 'bg-green-100 text-green-800', icon: '🎉' }
    };
    return phaseMap[phase] || phaseMap.setup;
  };

  const getPerformanceGradeColor = (grade: string) => {
    const gradeColors: Record<string, string> = {
      'A': 'text-green-600 bg-green-100',
      'B': 'text-blue-600 bg-blue-100',
      'C': 'text-yellow-600 bg-yellow-100',
      'D': 'text-orange-600 bg-orange-100',
      'F': 'text-red-600 bg-red-100',
    };
    return gradeColors[grade] || 'text-gray-600 bg-gray-100';
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center p-6">
        <LoadingSpinner size="md" />
        <span className="ml-2 text-gray-500">Loading live statistics...</span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="text-center py-6">
        <div className="text-red-500 mb-2">⚠️ {error || 'No statistics available'}</div>
        <button 
          onClick={fetchStats}
          className="btn btn-sm btn-outline"
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Retry'}
        </button>
      </div>
    );
  }

  const phaseInfo = getPhaseDisplayInfo(stats.currentPhase);
  const progressPercentage = stats.totalMatches > 0 
    ? Math.round((stats.completedMatches / stats.totalMatches) * 100) 
    : 0;

  if (compact) {
    return (
      <Card className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${phaseInfo.color}`}>
              {phaseInfo.icon} {phaseInfo.label}
            </span>
            {lastUpdated && (
              <span className="text-xs text-gray-500">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>

          {/* Progress Bar */}
          {stats.totalMatches > 0 && (
            <div>
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>{stats.completedMatches}/{stats.totalMatches} matches</span>
                <span>{progressPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    stats.inProgressMatches > 0 ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'
                  }`}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-lg font-bold text-gray-900">{stats.totalTeams}</div>
              <div className="text-xs text-gray-500">Teams</div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-600">{stats.inProgressMatches}</div>
              <div className="text-xs text-gray-500">Live</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600">{stats.completedMatches}</div>
              <div className="text-xs text-gray-500">Done</div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tournament Overview */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Live Tournament Status</h3>
        
        <div className="space-y-4">
          {/* Phase and Progress */}
          <div className="flex items-center justify-between">
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${phaseInfo.color}`}>
              {phaseInfo.icon} {phaseInfo.label}
              {stats.currentRound && ` - ${stats.currentRound}`}
            </span>
            {lastUpdated && (
              <span className="text-sm text-gray-500">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>

          {/* Overall Progress */}
          <div>
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Tournament Progress</span>
              <span>{stats.completedMatches} / {stats.totalMatches} matches completed</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${
                  stats.inProgressMatches > 0 ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'
                }`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="text-center text-sm text-gray-500 mt-1">
              {progressPercentage}% Complete
            </div>
          </div>

          {/* Match Summary */}
          <div className="grid grid-cols-2 gap-4">
            {(
              // Prefer explicit bracketType when provided; otherwise fallback to counts
              (bracketType ? bracketType === 'round_robin_playoff' : stats.matchSummary.roundRobin.total > 0)
            ) && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Round Robin</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <div>Completed: {stats.matchSummary.roundRobin.completed}</div>
                  <div>In Progress: {stats.matchSummary.roundRobin.inProgress}</div>
                  <div>Total: {stats.matchSummary.roundRobin.total}</div>
                </div>
              </div>
            )}

            <div className="bg-red-50 p-3 rounded-lg">
              <h4 className="font-medium text-red-900 mb-2">Bracket</h4>
              <div className="text-sm text-red-700 space-y-1">
                <div>Completed: {stats.matchSummary.bracket.completed}</div>
                <div>In Progress: {stats.matchSummary.bracket.inProgress}</div>
                <div>Total: {stats.matchSummary.bracket.total}</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Team Standings */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Live Standings</h3>
          <button 
            onClick={fetchStats}
            className="btn btn-sm btn-outline"
            disabled={loading}
            title="Refresh statistics"
          >
            {loading ? '🔄' : '↻'} Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2 font-medium text-gray-700">Rank</th>
                <th className="text-left p-2 font-medium text-gray-700">Team</th>
                <th className="text-center p-2 font-medium text-gray-700">W-L</th>
                <th className="text-center p-2 font-medium text-gray-700">Win %</th>
                <th className="text-center p-2 font-medium text-gray-700">+/-</th>
                <th className="text-center p-2 font-medium text-gray-700">RR</th>
                <th className="text-center p-2 font-medium text-gray-700">Bracket</th>
                <th className="text-center p-2 font-medium text-gray-700">Grade</th>
              </tr>
            </thead>
            <tbody>
              {stats.teamStandings.slice(0, 10).map((team) => (
                <tr key={team.teamId} className="border-t border-gray-200 hover:bg-gray-50">
                  <td className="p-2 font-medium">#{team.currentRank}</td>
                  <td className="p-2">
                    <div>
                      <div className="font-medium text-gray-900">{team.teamName}</div>
                      <div className="text-xs text-gray-500">
                        {team.players.map(p => p.playerName).join(' & ')}
                      </div>
                    </div>
                  </td>
                  <td className="p-2 text-center font-medium">
                    <span className="text-green-600">{team.matchesWon}</span>-<span className="text-red-600">{team.matchesLost}</span>
                  </td>
                  <td className="p-2 text-center">
                    {(team.winPercentage * 100).toFixed(1)}%
                  </td>
                  <td className={`p-2 text-center font-medium ${
                    team.pointDifferential > 0 ? 'text-green-600' : 
                    team.pointDifferential < 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {team.pointDifferential > 0 ? '+' : ''}{team.pointDifferential}
                  </td>
                  <td className="p-2 text-center">
                    <span className="text-xs">
                      {team.roundRobinRecord.won}-{team.roundRobinRecord.lost}
                    </span>
                  </td>
                  <td className="p-2 text-center">
                    {team.bracketRecord.eliminated ? (
                      <span className="text-red-600 text-xs">Eliminated</span>
                    ) : team.bracketRecord.advancedTo ? (
                      <span className="text-green-600 text-xs">{team.bracketRecord.advancedTo}</span>
                    ) : (
                      <span className="text-gray-500 text-xs">
                        {team.bracketRecord.won}-{team.bracketRecord.lost}
                      </span>
                    )}
                  </td>
                  <td className="p-2 text-center">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPerformanceGradeColor(team.performanceGrade)}`}>
                      {team.performanceGrade}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default LiveStats;
