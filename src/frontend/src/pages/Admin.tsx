import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Card from '../components/ui/Card';
import apiClient from '../services/api';
import { getTournamentStatus, getStatusDisplayInfo } from '../utils/tournamentStatus';
import type { Tournament } from '../types/api';

const Admin: React.FC = () => {
  const { isAdmin } = useAuth();
  const { canViewAdmin, canCreateTournaments, canManageUsers } = usePermissions();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response = await apiClient.getTournaments({ 
          sort: '-date',
          limit: 50 
        });
        
        // Handle both paginated and direct array responses
        const tournamentsData = response.docs || response.data || [];
        console.log('Tournaments response:', response);
        console.log('Tournaments data:', tournamentsData);
        
        setTournaments(tournamentsData);
      } catch (err) {
        setError('Failed to load tournaments');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (canViewAdmin) {
      fetchTournaments();
    }
  }, [canViewAdmin]);

  if (!canViewAdmin) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Card>
          <div className="text-center py-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600">You need administrative privileges to access this page.</p>
          </div>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  // Use date-based status instead of database status
  const tournamentsWithStatus = tournaments.map(tournament => ({
    ...tournament,
    actualStatus: getTournamentStatus(tournament.date)
  }));

  const groupedTournaments = {
    scheduled: tournamentsWithStatus.filter(t => t.actualStatus === 'scheduled'),
    completed: tournamentsWithStatus.filter(t => t.actualStatus === 'completed'),
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Tournament Administration</h1>
        <p className="mt-2 text-gray-600">
          Manage tournaments, players, and match results
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Tournament</h3>
            {canCreateTournaments ? (
              <Link
                to="/tournaments/create"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                New Tournament
              </Link>
            ) : (
              <p className="text-sm text-gray-500">You don't have permission to create tournaments</p>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Tournament Statistics</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div>Scheduled: {groupedTournaments.scheduled.length}</div>
              <div>Completed: {groupedTournaments.completed.length}</div>
              <div>Total: {tournaments.length}</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Links</h3>
            <div className="space-y-2">
              <Link
                to="/players"
                className="block text-sm text-blue-600 hover:text-blue-800"
              >
                Manage Players
              </Link>
              <Link
                to="/results"
                className="block text-sm text-blue-600 hover:text-blue-800"
              >
                View Results
              </Link>
              {canManageUsers && (
                <Link
                  to="/admin/users"
                  className="block text-sm text-blue-600 hover:text-blue-800"
                >
                  User Management
                </Link>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Tournaments by Status */}
      <div className="space-y-8">
        {Object.entries(groupedTournaments).map(([status, tournamentList]) => (
          <div key={status}>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 capitalize">
              {status} Tournaments ({tournamentList.length})
            </h2>
            
            {tournamentList.length === 0 ? (
              <Card>
                <div className="p-6 text-center text-gray-500">
                  No {status} tournaments
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tournamentList.map((tournament) => {
                  const statusInfo = getStatusDisplayInfo(tournament.actualStatus);
                  return (
                    <Card key={tournament._id || tournament.id}>
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-medium text-gray-900">
                            BOD #{tournament.bodNumber}
                          </h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        
                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                          <div><strong>Date:</strong> {new Date(tournament.date).toLocaleDateString()}</div>
                          <div><strong>Format:</strong> {tournament.format}</div>
                          <div><strong>Location:</strong> {tournament.location}</div>
                        </div>

                        <div className="flex space-x-2">
                          <Link
                            to={`/tournaments/${tournament._id || tournament.id}`}
                            className="flex-1 text-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
                          >
                            View Details
                          </Link>
                          {canViewAdmin && (
                            <Link
                              to={`/tournaments/${tournament._id || tournament.id}/bracket`}
                              className="flex-1 text-center px-3 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-md hover:bg-green-100"
                            >
                              View Bracket
                            </Link>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Admin;