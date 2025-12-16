import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import apiClient from '../services/api';
import StatCard from '../components/ui/StatCard';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const Home: React.FC = () => {
  const getPlayerStats = useCallback(() => apiClient.getPlayerStats(), []);
  const getTournamentStats = useCallback(() => apiClient.getTournamentStats(), []);
  const getRecentTournaments = useCallback(() => apiClient.getRecentTournaments(5), []);

  const { data: playerStats, loading: playersLoading } = useApi(getPlayerStats, { immediate: true });
  const { data: tournamentStats, loading: tournamentsLoading } = useApi(getTournamentStats, { immediate: true });
  const { data: recentTournaments, loading: recentLoading } = useApi(getRecentTournaments, { immediate: true });

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center">
        <h2 className="text-4xl font-bold text-gray-900 sm:text-5xl">
          Welcome to the <span className="text-gradient">Bracket of Death</span>
        </h2>
        <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
          Track tennis tournament scores, player statistics, and championship results
          for the premier doubles tennis tournament series.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Players"
          value={(playerStats as any)?.overview?.totalPlayers || 0}
          icon="👥"
          iconColor="bg-blue-100 text-blue-600"
          linkTo="/players"
          linkText="View all players"
          loading={playersLoading}
        />

        <StatCard
          title="Tournaments"
          value={(tournamentStats as any)?.overview?.totalTournaments || 0}
          icon="🏆"
          iconColor="bg-green-100 text-green-600"
          linkTo="/tournaments"
          linkText="View tournaments"
          loading={tournamentsLoading}
        />

        <StatCard
          title="Results"
          value={`${(playerStats as any)?.overview?.totalPlayers || 0} Teams`}
          icon="📊"
          iconColor="bg-purple-100 text-purple-600"
          linkTo="/results"
          linkText="View results"
          loading={playersLoading}
        />
      </div>

      {/* Recent Tournaments */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Recent Tournaments</h3>
          <Link to="/tournaments" className="btn btn-secondary btn-sm">
            View All
          </Link>
        </div>

        {recentLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
            <span className="ml-3 text-gray-500">Loading tournaments...</span>
          </div>
        ) : recentTournaments && Array.isArray(recentTournaments) && recentTournaments.length > 0 ? (
          <div className="space-y-3">
            {recentTournaments.map((tournament: any) => (
              <div key={tournament.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                    <span className="text-white font-bold text-sm">#{tournament.bodNumber}</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {tournament.format === 'M' ? "Men's" : tournament.format === 'W' ? "Women's" : "Mixed"} Tournament
                    </h4>
                    <p className="text-sm text-gray-600">{tournament.location}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(tournament.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    <span className={`badge ${tournament.format === 'M' ? 'badge-primary' :
                        tournament.format === 'W' ? 'bg-pink-100 text-pink-800' :
                          'badge-success'
                      }`}>
                      BOD #{tournament.bodNumber}
                    </span>
                  </div>
                  <Link
                    to={`/tournaments/${tournament.id}`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors duration-200"
                  >
                    View details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-gray-400 text-2xl">🏆</span>
            </div>
            <p className="text-gray-500 mb-4">No tournaments found</p>
            <Link to="/tournaments" className="btn btn-primary">
              Add the first tournament
            </Link>
          </div>
        )}
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link to="/players">
          <Card variant="hover" padding="md">
            <div className="text-center">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <span className="text-white text-2xl">👥</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Manage Players</h3>
              <p className="text-sm text-gray-600">View and manage player profiles</p>
            </div>
          </Card>
        </Link>

        <Link to="/tournaments">
          <Card variant="hover" padding="md">
            <div className="text-center">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <span className="text-white text-2xl">🏆</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Tournaments</h3>
              <p className="text-sm text-gray-600">Create and manage tournaments</p>
            </div>
          </Card>
        </Link>

        <Link to="/results">
          <Card variant="hover" padding="md">
            <div className="text-center">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <span className="text-white text-2xl">📊</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Results</h3>
              <p className="text-sm text-gray-600">View tournament results and stats</p>
            </div>
          </Card>
        </Link>

        <div>
          <Card variant="default" padding="md">
            <div className="text-center">
              <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <span className="text-white text-2xl">📈</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Analytics</h3>
              <p className="text-sm text-gray-600">Player performance analysis (Coming Soon)</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Home;