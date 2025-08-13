import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../services/api';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { getTournamentStatus, getStatusDisplayInfo } from '../utils/tournamentStatus';
import { EditableText, EditableNumber, EditableSelect, EditableDate } from '../components/admin';
import type { Tournament, TournamentUpdate } from '../types/api';

const Tournaments: React.FC = () => {
  const { isAdmin } = useAuth();
  const [page, setPage] = useState(1);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [filters, setFilters] = useState({
    format: '',
    location: '',
    year: undefined as number | undefined,
    bodNumber_min: undefined as number | undefined,
    bodNumber_max: undefined as number | undefined,
    sort: '-date',
  });
  
  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    tournament: Tournament | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    tournament: null,
    isLoading: false,
  });
  
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Tournament format options matching backend schema
  const formatOptions = [
    { value: 'M', label: "Men's (Legacy)" },
    { value: 'W', label: "Women's (Legacy)" },
    { value: 'Mixed', label: "Mixed (Legacy)" },
    { value: "Men's Singles", label: "Men's Singles" },
    { value: "Men's Doubles", label: "Men's Doubles" },
    { value: "Women's Doubles", label: "Women's Doubles" },
    { value: "Mixed Doubles", label: "Mixed Doubles" }
  ];

  // Tournament status options matching backend schema
  const statusOptions = [
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'open', label: 'Open for Registration' },
    { value: 'active', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const getTournaments = useCallback(
    () => apiClient.getTournaments({ 
      page, 
      limit: 20, 
      ...filters 
    }),
    [page, filters]
  );

  const { data: tournamentsData, loading, error, execute } = useApi(
    getTournaments,
    { 
      immediate: true,
      dependencies: [page, filters]
    }
  );

  // Update local state when tournament data changes
  React.useEffect(() => {
    if (tournamentsData && 'data' in tournamentsData && Array.isArray(tournamentsData.data)) {
      setTournaments(tournamentsData.data);
    }
  }, [tournamentsData]);

  // Function to update tournament field
  const updateTournamentField = async (
    tournamentId: string,
    field: keyof TournamentUpdate,
    value: any
  ): Promise<void> => {
    try {
      const updateData: TournamentUpdate = { [field]: value } as TournamentUpdate;
      const response = await apiClient.updateTournament(tournamentId, updateData);
      
      if (response.success && response.data) {
        // Update local state
        setTournaments(prev => prev.map(t => 
          t._id === tournamentId || t.id === tournamentId ? response.data! : t
        ));
      }
    } catch (error) {
      console.error(`Failed to update tournament ${field}:`, error);
      throw error;
    }
  };

  // Delete tournament functions
  const openDeleteModal = (tournament: Tournament) => {
    setDeleteModal({
      isOpen: true,
      tournament,
      isLoading: false,
    });
  };

  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      tournament: null,
      isLoading: false,
    });
  };

  const handleDeleteTournament = async () => {
    if (!deleteModal.tournament) return;

    setDeleteModal(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await apiClient.deleteTournamentAdmin(deleteModal.tournament._id || deleteModal.tournament.id);
      
      if (response.success) {
        // Remove tournament from local state
        setTournaments(prev => prev.filter(t => 
          (t._id || t.id) !== (deleteModal.tournament!._id || deleteModal.tournament!.id)
        ));
        
        // Show success message
        setSuccessMessage(response.message || 'Tournament deleted successfully');
        
        // Auto-hide success message after 5 seconds
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (error: any) {
      console.error('Error deleting tournament:', error);
      setErrorMessage(
        error.response?.data?.message || 
        error.message || 
        'Failed to delete tournament'
      );
      
      // Auto-hide error message after 10 seconds
      setTimeout(() => setErrorMessage(null), 10000);
    } finally {
      closeDeleteModal();
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ 
      ...prev, 
      [key]: key === 'year' 
        ? (value === '0' ? undefined : parseInt(value))
        : key.includes('_min') || key.includes('_max')
        ? (value === '' ? undefined : parseInt(value))
        : value 
    }));
    setPage(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format badge helper function (not used in current design but kept for future use)
  // const getFormatBadgeColor = (format: string) => {
  //   switch (format) {
  //     case 'M':
  //       return 'bg-blue-100 text-blue-800';
  //     case 'W':
  //       return 'bg-pink-100 text-pink-800';
  //     case 'Mixed':
  //       return 'bg-green-100 text-green-800';
  //     default:
  //       return 'bg-gray-100 text-gray-800';
  //   }
  // };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tournaments</h1>
          <p className="text-gray-600">Manage tournament events and brackets</p>
        </div>
        <Link to="/tournaments/create" className="btn btn-primary">
          Create Tournament
        </Link>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex items-center">
            <span className="text-green-500 text-xl mr-2">✅</span>
            <div>
              <h3 className="text-sm font-medium text-green-800">Success</h3>
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="ml-auto text-green-500 hover:text-green-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center">
            <span className="text-red-500 text-xl mr-2">⚠️</span>
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Format
            </label>
            <select
              value={filters.format}
              onChange={(e) => handleFilterChange('format', e.target.value)}
              className="select"
            >
              <option value="">All Formats</option>
              <option value="M">Men's (Legacy)</option>
              <option value="W">Women's (Legacy)</option>
              <option value="Mixed">Mixed (Legacy)</option>
              <option value="Men's Singles">Men's Singles</option>
              <option value="Men's Doubles">Men's Doubles</option>
              <option value="Women's Doubles">Women's Doubles</option>
              <option value="Mixed Doubles">Mixed Doubles</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <input
              type="text"
              value={filters.location}
              onChange={(e) => handleFilterChange('location', e.target.value)}
              placeholder="Filter by location..."
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Year
            </label>
            <select
              value={filters.year}
              onChange={(e) => handleFilterChange('year', e.target.value)}
              className="select"
            >
              <option value={0}>All Years</option>
              {Array.from({ length: 2024 - 2009 + 1 }, (_, i) => 2024 - i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Min BOD Number
            </label>
            <input
              type="number"
              value={filters.bodNumber_min || ''}
              onChange={(e) => handleFilterChange('bodNumber_min', e.target.value)}
              placeholder="e.g., 200901"
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max BOD Number
            </label>
            <input
              type="number"
              value={filters.bodNumber_max || ''}
              onChange={(e) => handleFilterChange('bodNumber_max', e.target.value)}
              placeholder="e.g., 202412"
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort By
            </label>
            <select
              value={filters.sort}
              onChange={(e) => handleFilterChange('sort', e.target.value)}
              className="select"
            >
              <option value="-date">Date (Newest First)</option>
              <option value="date">Date (Oldest First)</option>
              <option value="-bodNumber">BOD Number (High to Low)</option>
              <option value="bodNumber">BOD Number (Low to High)</option>
              <option value="location">Location (A-Z)</option>
              <option value="-location">Location (Z-A)</option>
              <option value="format">Format</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Summary Stats */}
      {tournaments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card padding="md">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {tournaments.filter((t: Tournament) => t.format.includes('Men')).length}
              </div>
              <div className="text-sm text-gray-600">Men's Tournaments</div>
            </div>
          </Card>
          
          <Card padding="md">
            <div className="text-center">
              <div className="text-2xl font-bold text-pink-600">
                {tournaments.filter((t: Tournament) => t.format.includes('Women')).length}
              </div>
              <div className="text-sm text-gray-600">Women's Tournaments</div>
            </div>
          </Card>
          
          <Card padding="md">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {tournaments.filter((t: Tournament) => t.format.includes('Mixed')).length}
              </div>
              <div className="text-sm text-gray-600">Mixed Tournaments</div>
            </div>
          </Card>
          
          <Card padding="md">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {[...new Set(tournaments.map((t: Tournament) => new Date(t.date).getFullYear()))].length}
              </div>
              <div className="text-sm text-gray-600">Years Active</div>
            </div>
          </Card>
        </div>
      )}

      {/* Tournaments List */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
            <span className="ml-3 text-gray-500">Loading tournaments...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-500 text-2xl">⚠️</span>
            </div>
            <p className="text-red-600 font-medium mb-2">Error loading tournaments</p>
            <p className="text-gray-500 text-sm">{error}</p>
          </div>
        ) : tournaments.length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            {tournaments.map((tournament: Tournament) => {
              const actualStatus = getTournamentStatus(tournament.date);
              const statusInfo = getStatusDisplayInfo(actualStatus);
              
              return (
                <div key={tournament.id || tournament._id} className="group">
                  <Card variant="hover" padding="lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                          <span className="text-white font-bold text-xl">#</span>
                          {isAdmin ? (
                            <EditableNumber
                              value={tournament.bodNumber}
                              onSave={(value) => updateTournamentField(tournament._id || tournament.id, 'bodNumber', value)}
                              min={1}
                              integer
                              displayClassName="text-white font-bold text-xl"
                              required
                            />
                          ) : (
                            <span className="text-white font-bold text-xl">{tournament.bodNumber}</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                              {isAdmin ? (
                                <EditableSelect
                                  value={tournament.format}
                                  options={formatOptions}
                                  onSave={(value) => updateTournamentField(tournament._id || tournament.id, 'format', value as Tournament['format'])}
                                  required
                                  displayClassName="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200"
                                />
                              ) : (
                                tournament.format
                              )} Tournament
                            </h3>
                            <span className={`badge ${
                              tournament.format.includes('Men') ? 'badge-primary' : 
                              tournament.format.includes('Women') ? 'bg-pink-100 text-pink-800' : 
                              'badge-success'
                            }`}>
                              {tournament.format}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <p className="text-gray-700 font-medium">
                              📍 {isAdmin ? (
                                <EditableText
                                  value={tournament.location}
                                  onSave={(value) => updateTournamentField(tournament._id || tournament.id, 'location', value)}
                                  required
                                  displayClassName="text-gray-700 font-medium"
                                  validator={(value) => {
                                    if (value.length < 2) return 'Location must be at least 2 characters';
                                    if (value.length > 100) return 'Location must be less than 100 characters';
                                    return null;
                                  }}
                                />
                              ) : (
                                tournament.location
                              )}
                            </p>
                            <p className="text-gray-600">
                              📅 {isAdmin ? (
                                <EditableDate
                                  value={tournament.date}
                                  onSave={(value) => updateTournamentField(tournament._id || tournament.id, 'date', value)}
                                  required
                                  displayClassName="text-gray-600"
                                />
                              ) : (
                                formatDate(tournament.date)
                              )}
                            </p>
                            {(tournament.notes || isAdmin) && (
                              <p className="text-sm text-gray-500">
                                📝 {isAdmin ? (
                                  <EditableText
                                    value={tournament.notes || ''}
                                    onSave={(value) => updateTournamentField(tournament._id || tournament.id, 'notes', value || undefined)}
                                    multiline
                                    displayClassName="text-sm text-gray-500"
                                    placeholder="No notes"
                                    validator={(value) => {
                                      if (value && value.length > 1000) return 'Notes must be less than 1000 characters';
                                      return null;
                                    }}
                                  />
                                ) : (
                                  tournament.notes || 'No notes'
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="flex items-center space-x-2 mb-2">
                            {isAdmin ? (
                              <EditableSelect
                                value={tournament.status}
                                options={statusOptions}
                                onSave={(value) => updateTournamentField(tournament._id || tournament.id, 'status', value as Tournament['status'])}
                                required
                                displayClassName={`px-2 py-1 text-xs font-medium rounded-full ${statusInfo.color}`}
                              />
                            ) : (
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusInfo.color}`}>
                                {tournament.status}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            BOD #{tournament.bodNumber}
                          </p>
                        </div>
                      
                      <div className="flex flex-col space-y-2">
                        <Link
                          to={`/tournaments/${tournament.id || tournament._id}`}
                          className="btn btn-primary btn-sm"
                        >
                          View Details
                        </Link>
                        <Link
                          to={`/tournaments/${tournament.id || tournament._id}/bracket`}
                          className="btn btn-outline btn-sm"
                        >
                          View Bracket
                        </Link>
                        {isAdmin && (
                          <Link
                            to={`/tournaments/${tournament.id || tournament._id}/manage`}
                            className="btn btn-secondary btn-sm"
                          >
                            Manage Live
                          </Link>
                        )}
                        {isAdmin && (actualStatus === 'scheduled' || actualStatus === 'completed') && (
                          <button
                            onClick={() => openDeleteModal(tournament)}
                            className="btn btn-danger btn-sm"
                            title={actualStatus === 'scheduled' ? 'Delete scheduled tournament' : 'Delete completed tournament'}
                          >
                            Delete
                          </button>
                        )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-blue-500 text-3xl">🏆</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No tournaments found</h3>
            <p className="text-gray-500 mb-6">Get started by creating your first tournament</p>
            <Link to="/tournaments/create" className="btn btn-primary btn-lg">
              Create Your First Tournament
            </Link>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {tournamentsData && 'pagination' in tournamentsData && (tournamentsData as any).pagination && (tournamentsData as any).pagination.pages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="btn btn-secondary disabled:opacity-50"
          >
            Previous
          </button>
          
          <span className="text-sm text-gray-700">
            Page {page} of {tournamentsData && 'pagination' in tournamentsData && (tournamentsData as any).pagination ? (tournamentsData as any).pagination.pages : 1}
          </span>
          
          <button
            onClick={() => setPage(page + 1)}
            disabled={tournamentsData && 'pagination' in tournamentsData ? page === (tournamentsData as any).pagination.pages : true}
            className="btn btn-secondary disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteTournament}
        title="Delete Tournament"
        message={
          deleteModal.tournament
            ? `Are you sure you want to permanently delete the "${deleteModal.tournament.format}" tournament (BOD #${deleteModal.tournament.bodNumber}) scheduled for ${formatDate(deleteModal.tournament.date)}? This action cannot be undone and will remove all associated data.`
            : ''
        }
        confirmText="Delete Tournament"
        cancelText="Cancel"
        isDangerous={true}
        isLoading={deleteModal.isLoading}
      />
    </div>
  );
};

export default Tournaments;