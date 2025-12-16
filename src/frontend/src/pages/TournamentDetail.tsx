import React, { useState, useCallback, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import apiClient from '../services/api';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { getTournamentStatus, getStatusDisplayInfo } from '../utils/tournamentStatus';
import { EditableText, EditableNumber, EditableSelect, EditableDate, EditableCard } from '../components/admin';
import LiveStats from '../components/tournament/LiveStats';
import type { Tournament, TournamentUpdate } from '../types/api';

const TournamentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { isAdmin } = useAuth();
  const { canViewAdmin } = usePermissions();
  const [activeTab, setActiveTab] = useState<'overview' | 'results' | 'bracket'>('overview');
  const [tournamentData, setTournamentData] = useState<Tournament | null>(null);

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

  // Set initial tab based on URL
  useEffect(() => {
    if (location.pathname.includes('/bracket')) {
      setActiveTab('bracket');
    } else {
      setActiveTab('overview');
    }
  }, [location.pathname]);

  const getTournament = useCallback(
    () => apiClient.getTournament(id!),
    [id]
  );

  const { data: tournament, loading: tournamentLoading, error: tournamentError, execute: refetchTournament } = useApi(
    getTournament,
    { immediate: true }
  );

  // Update local state when tournament data changes
  useEffect(() => {
    console.log('Tournament data received:', tournament);
    if (tournament) {
      if ('data' in tournament && tournament.data) {
        console.log('Setting tournament data from tournament.data:', tournament.data);
        setTournamentData(tournament.data as Tournament);
      } else if (tournament.success === false) {
        console.log('Tournament API returned success=false');
        setTournamentData(null);
      } else {
        console.log('Using tournament directly as data:', tournament);
        setTournamentData(tournament as any);
      }
    } else {
      console.log('No tournament data received');
    }
  }, [tournament]);

  const getResults = useCallback(
    () => apiClient.getResultsByTournament(id!),
    [id]
  );

  const { data: results, loading: resultsLoading } = useApi(
    getResults,
    { immediate: true }
  );

  // Function to update tournament field
  const updateTournamentField = async <K extends keyof TournamentUpdate>(
    field: K,
    value: TournamentUpdate[K]
  ): Promise<void> => {
    if (!tournamentData || !id) return;

    try {
      const updateData: TournamentUpdate = { [field]: value } as TournamentUpdate;
      const response = await apiClient.updateTournament(id, updateData);

      if (response.success && response.data) {
        setTournamentData(response.data);
        // Optionally refetch to ensure consistency
        // await refetchTournament();
      }
    } catch (error) {
      console.error(`Failed to update ${String(field)}:`, error);
      throw error;
    }
  };

  // Function to update tournament result field
  const updateTournamentResultField = async (
    resultId: string,
    field: string,
    value: any
  ): Promise<void> => {
    try {
      const updateData = { [field]: value };
      await apiClient.updateTournamentResult(resultId, updateData);

      // Refetch results to get updated data with recalculated values
      const resultsResponse = await getResults();
      console.log('Results updated:', resultsResponse);
    } catch (error) {
      console.error(`Failed to update result ${field}:`, error);
      throw error;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getFormatDisplayName = (format: string) => {
    if (!format) return '';
    switch (format.toUpperCase()) {
      case 'M': return "Men's";
      case 'W': return "Women's";
      case 'MIXED': return "Mixed";
      default: return format;
    }
  };

  const getFormatBadgeColor = (format: string) => {
    switch (format) {
      case 'M': return 'bg-blue-100 text-blue-800';
      case 'W': return 'bg-pink-100 text-pink-800';
      case 'Mixed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Debug logging to help diagnose the issue
  console.log('TournamentDetail Debug:', {
    id,
    tournamentLoading,
    tournamentError,
    tournament,
    tournamentData
  });

  if (tournamentError) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-red-500 text-2xl">⚠️</span>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Error loading tournament</h2>
        <p className="text-gray-600 mb-4">{tournamentError}</p>
        <Link to="/tournaments" className="btn btn-primary">
          Back to Tournaments
        </Link>
      </div>
    );
  }

  // Show loading state while tournament is being fetched
  if (tournamentLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-500">Loading tournament...</span>
      </div>
    );
  }

  // Show not found if loading is complete but no data exists
  if (!tournamentData) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-gray-400 text-2xl">🏆</span>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Tournament not found</h2>
        <p className="text-gray-600 mb-4">The requested tournament could not be found.</p>
        <p className="text-xs text-gray-400 mb-4">Debug: Loading={String(tournamentLoading)}, Error={tournamentError || 'none'}, ID={id}</p>
        <Link to="/tournaments" className="btn btn-primary">
          Back to Tournaments
        </Link>
      </div>
    );
  }

  const actualStatus = getTournamentStatus(tournamentData.date);
  const statusInfo = getStatusDisplayInfo(actualStatus);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-primary-600 font-bold text-xl">
              #{tournamentData.bodNumber}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{tournamentData.name || `${getFormatDisplayName(tournamentData.format)} Tournament`}</h1>
            <div className="flex items-center space-x-3 text-gray-600 mt-1">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getFormatBadgeColor(tournamentData.format)}`}>
                {getFormatDisplayName(tournamentData.format)}
              </span>
              <span>•</span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
              <span>•</span>
              <span>{tournamentData.location}</span>
              <span>•</span>
              <span>{formatDate(tournamentData.date)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {canViewAdmin && (
            <div className="flex items-center space-x-2">
              <Link
                to={`/tournaments/${id}/manage`}
                className="btn btn-secondary btn-sm"
              >
                Manage Live Tournament
              </Link>
              <Link
                to="/admin"
                className="text-sm text-blue-600 hover:text-blue-800 px-3 py-1 border border-blue-200 rounded-md hover:bg-blue-50"
              >
                Admin Dashboard
              </Link>
              <Link
                to="/admin/users"
                className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1 border border-gray-200 rounded-md hover:bg-gray-50"
              >
                Manage Users
              </Link>
            </div>
          )}
          <Link to="/tournaments" className="btn btn-outline">
            Back to Tournaments
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'results', label: 'Results' },
            { key: 'bracket', label: 'Bracket' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === tab.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Live Tournament Statistics - show for active tournaments */}
          {(actualStatus === 'in-progress' || tournamentData.status === 'in_progress') && (
            <LiveStats
              tournamentId={id!}
              refreshInterval={20000}
              compact={false}
              bracketType={tournamentData.bracketType as any}
            />
          )}
          {/* Final Standings */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Final Standings</h3>
            <div className="flex justify-center items-end space-x-4 md:space-x-8 pt-4">
              {/* Second Place */}
              {(() => {
                const secondPlace = ((results as any)?.results || []).find((r: any) => r.totalStats?.bodFinish === 2);
                return secondPlace ? (
                  <div className="text-center">
                    <div className="w-24 h-20 bg-gray-200 rounded-t-lg flex items-center justify-center mb-2">
                      <span className="text-4xl">🥈</span>
                    </div>
                    <div className="font-bold text-gray-800">{secondPlace.teamName}</div>
                    <div className="text-sm text-gray-600">2nd Place</div>
                  </div>
                ) : <div className="w-24" />;
              })()}

              {/* First Place */}
              {(() => {
                const firstPlace = ((results as any)?.results || []).find((r: any) => r.totalStats?.bodFinish === 1);
                return firstPlace ? (
                  <div className="text-center">
                    <div className="w-28 h-24 bg-yellow-300 rounded-t-lg flex items-center justify-center mb-2">
                      <span className="text-5xl">🏆</span>
                    </div>
                    <div className="font-bold text-gray-800">{firstPlace.teamName}</div>
                    <div className="text-sm text-gray-600">Champion</div>
                  </div>
                ) : <div className="w-28" />;
              })()}

              {/* Third Place */}
              {(() => {
                const thirdPlace = ((results as any)?.results || []).find((r: any) => r.totalStats?.bodFinish === 3);
                return thirdPlace ? (
                  <div className="text-center">
                    <div className="w-24 h-16 bg-orange-300 rounded-t-lg flex items-center justify-center mb-2">
                      <span className="text-4xl">🥉</span>
                    </div>
                    <div className="font-bold text-gray-800">{thirdPlace.teamName}</div>
                    <div className="text-sm text-gray-600">3rd Place</div>
                  </div>
                ) : <div className="w-24" />;
              })()}
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tournament Info */}
            <div className="md:col-span-2">
              <EditableCard title="Tournament Information" showEditButton={false}>
                <div className="space-y-4">
                  {/* Basic Tournament Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-1">Date</label>
                      <EditableDate
                        value={tournamentData.date}
                        onSave={(value) => updateTournamentField('date', value)}
                        required
                        displayClassName="text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-1">BOD Number</label>
                      <EditableNumber
                        value={tournamentData.bodNumber}
                        onSave={(value) => updateTournamentField('bodNumber', value)}
                        required
                        min={1}
                        integer
                        displayClassName="text-gray-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-1">Format</label>
                      <EditableSelect
                        value={tournamentData.format}
                        options={formatOptions}
                        onSave={(value) => updateTournamentField('format', value as Tournament['format'])}
                        required
                        displayClassName="text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-1">Status</label>
                      <EditableSelect
                        value={tournamentData.status}
                        options={statusOptions}
                        onSave={(value) => updateTournamentField('status', value as Tournament['status'])}
                        required
                        displayClassName="text-gray-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-1">Location</label>
                    <EditableText
                      value={tournamentData.location}
                      onSave={(value) => updateTournamentField('location', value)}
                      required
                      displayClassName="text-gray-900"
                      validator={(value) => {
                        if (value.length < 2) return 'Location must be at least 2 characters';
                        if (value.length > 100) return 'Location must be less than 100 characters';
                        return null;
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-1">Max Players</label>
                    <EditableNumber
                      value={tournamentData.maxPlayers}
                      onSave={(value) => updateTournamentField('maxPlayers', value)}
                      min={2}
                      max={64}
                      integer
                      displayClassName="text-gray-900"
                      placeholder="Not set"
                      validator={(value) => {
                        // Must be a power of 2 for bracket tournaments
                        if (value && !Number.isInteger(Math.log2(value))) {
                          return 'Maximum players must be a power of 2 (2, 4, 8, 16, 32, 64)';
                        }
                        return null;
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-1">Advancement Criteria</label>
                    <EditableText
                      value={tournamentData.advancementCriteria}
                      onSave={(value) => updateTournamentField('advancementCriteria', value)}
                      required
                      multiline
                      displayClassName="text-gray-900"
                      validator={(value) => {
                        if (value.length < 5) return 'Advancement criteria must be at least 5 characters';
                        if (value.length > 500) return 'Advancement criteria must be less than 500 characters';
                        return null;
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-1">Notes</label>
                    <EditableText
                      value={tournamentData.notes || ''}
                      onSave={(value) => updateTournamentField('notes', value || undefined)}
                      multiline
                      displayClassName="text-gray-900"
                      placeholder="No notes"
                      validator={(value) => {
                        if (value && value.length > 1000) return 'Notes must be less than 1000 characters';
                        return null;
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-1">Photo Albums URL</label>
                    <EditableText
                      value={tournamentData.photoAlbums || ''}
                      onSave={(value) => updateTournamentField('photoAlbums', value || undefined)}
                      displayClassName="text-gray-900"
                      placeholder="No photo album"
                      validator={(value) => {
                        if (value) {
                          const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
                          if (!urlRegex.test(value)) {
                            return 'Please enter a valid URL';
                          }
                        }
                        return null;
                      }}
                    />
                    {tournamentData.photoAlbums && (
                      <a
                        href={tournamentData.photoAlbums}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary btn-sm mt-2"
                      >
                        View Photo Album
                      </a>
                    )}
                  </div>
                </div>
              </EditableCard>
            </div>
            {/* Quick Stats */}
            <div className="space-y-4">
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status</span>
                    <span className="font-medium text-green-600">
                      {actualStatus === 'completed' ? 'Completed' :
                        actualStatus === 'active' ? 'In Progress' :
                          actualStatus === 'upcoming' ? 'Upcoming' : 'Scheduled'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Teams</span>
                    <span className="font-medium">
                      {(results as any)?.results?.length || tournamentData?.generatedTeams?.length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Players</span>
                    <span className="font-medium">
                      {tournamentData?.players?.length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Games Played</span>
                    <span className="font-medium">
                      {((results as any)?.results || []).reduce((sum: number, r: any) => sum + (r.totalStats?.totalPlayed || 0), 0)}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Selected Players */}
              {tournamentData?.players && tournamentData.players.length > 0 && (
                <Card>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Selected Players</h3>
                  <div className="text-sm text-gray-600 mb-3">
                    {tournamentData.players.length} players selected for this tournament
                  </div>
                  <div className="max-h-32 overflow-y-auto">
                    <div className="text-sm text-gray-700 space-y-1">
                      {/* Note: Player names would be populated from the API when players are populated */}
                      <div className="text-xs text-gray-500">
                        Player details will be shown when the tournament loads with populated player data
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'results' && (
        <div className="space-y-6">
          {/* Tournament Summary */}
          {results && (results as any).results && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tournament Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{(results as any).results.length}</div>
                  <div className="text-sm text-gray-600">Teams</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {(results as any).results.filter((r: any) => r.totalStats?.bodFinish === 1).length}
                  </div>
                  <div className="text-sm text-gray-600">Champions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {(results as any).results.reduce((sum: number, r: any) => sum + (r.totalStats?.totalWon || 0), 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total Games Won</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">
                    {(results as any).results.reduce((sum: number, r: any) => sum + (r.totalStats?.totalPlayed || 0), 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total Games Played</div>
                </div>
              </div>
            </Card>
          )}

          {/* Results Table */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tournament Results</h3>
            {resultsLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="md" />
                <span className="ml-2 text-gray-500">Loading results...</span>
              </div>
            ) : results && (results as any).results && (results as any).results.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Division</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seed</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RR Record</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bracket Record</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Record</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Win %</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {((results as any).results as any[]).sort((a, b) => (a.totalStats?.bodFinish || 999) - (b.totalStats?.bodFinish || 999)).map((result) => (
                      <tr key={result.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="font-medium text-gray-900">#</span>
                            <EditableNumber
                              value={result.totalStats?.bodFinish}
                              onSave={(value) => updateTournamentResultField(result.id, 'totalStats.bodFinish', value)}
                              min={1}
                              integer
                              placeholder="N/A"
                              className="ml-1"
                              displayClassName="font-medium text-gray-900"
                            />
                            {result.totalStats?.bodFinish === 1 && <span className="ml-2">🏆</span>}
                            {result.totalStats?.bodFinish === 2 && <span className="ml-2">🥈</span>}
                            {result.totalStats?.bodFinish === 3 && <span className="ml-2">🥉</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{result.teamName}</div>
                          <div className="text-sm text-gray-500">
                            {result.players?.map((player: any, index: number) => (
                              <React.Fragment key={player._id}>
                                <Link to={`/players/${player._id}`} className="hover:text-primary-600 hover:underline">
                                  {player.name}
                                </Link>
                                {index < result.players.length - 1 && ' & '}
                              </React.Fragment>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <EditableText
                            value={result.division || ''}
                            onSave={(value) => updateTournamentResultField(result.id, 'division', value || undefined)}
                            placeholder="N/A"
                            displayClassName="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                            validator={(value) => {
                              if (value && value.length > 10) return 'Division must be 10 characters or less';
                              return null;
                            }}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span>#</span>
                          <EditableNumber
                            value={result.seed}
                            onSave={(value) => updateTournamentResultField(result.id, 'seed', value)}
                            min={1}
                            integer
                            placeholder="N/A"
                            className="ml-1"
                            displayClassName="text-gray-900"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center space-x-1">
                              <EditableNumber
                                value={result.roundRobinScores?.rrWon}
                                onSave={(value) => updateTournamentResultField(result.id, 'roundRobinScores.rrWon', value)}
                                min={0}
                                integer
                                placeholder="0"
                                displayClassName="font-medium"
                              />
                              <span>-</span>
                              <EditableNumber
                                value={result.roundRobinScores?.rrLost}
                                onSave={(value) => updateTournamentResultField(result.id, 'roundRobinScores.rrLost', value)}
                                min={0}
                                integer
                                placeholder="0"
                                displayClassName="font-medium"
                              />
                            </div>
                            <span className="text-xs text-gray-500">
                              ({((result.roundRobinScores?.rrWinPercentage || 0) * 100).toFixed(1)}%)
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center space-x-1">
                              <EditableNumber
                                value={result.bracketScores?.bracketWon}
                                onSave={(value) => updateTournamentResultField(result.id, 'bracketScores.bracketWon', value)}
                                min={0}
                                integer
                                placeholder="0"
                                displayClassName="font-medium"
                              />
                              <span>-</span>
                              <EditableNumber
                                value={result.bracketScores?.bracketLost}
                                onSave={(value) => updateTournamentResultField(result.id, 'bracketScores.bracketLost', value)}
                                min={0}
                                integer
                                placeholder="0"
                                displayClassName="font-medium"
                              />
                            </div>
                            <span className="text-xs text-gray-500">
                              ({result.bracketScores?.bracketPlayed || 0} games)
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">
                              {result.totalStats?.totalWon || 0}-{result.totalStats?.totalLost || 0}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({result.totalStats?.totalPlayed || 0} games)
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-medium text-gray-900">
                            {result.totalStats?.totalPlayed > 0 ?
                              ((result.totalStats?.totalWon / result.totalStats?.totalPlayed) * 100).toFixed(1) + '%' :
                              '0%'
                            }
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${result.performanceGrade === 'A' ? 'bg-green-100 text-green-800' :
                              result.performanceGrade === 'B' ? 'bg-blue-100 text-blue-800' :
                                result.performanceGrade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                                  result.performanceGrade === 'D' ? 'bg-orange-100 text-orange-800' :
                                    'bg-red-100 text-red-800'
                            }`}>
                            {result.performanceGrade || 'N/A'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No results found for this tournament</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'bracket' && (
        <div className="space-y-6">
          {/* Tournament Setup Information */}
          {tournamentData?.generatedTeams && tournamentData.generatedTeams.length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tournament Setup</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tournament Configuration */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Configuration</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Max Players:</span>
                      <span className="font-medium">{tournamentData.maxPlayers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Selected Players:</span>
                      <span className="font-medium">{tournamentData.players?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Generated Teams:</span>
                      <span className="font-medium">{tournamentData.generatedTeams?.length || 0}</span>
                    </div>
                    {tournamentData.bracketType && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Bracket Type:</span>
                        <span className="font-medium capitalize">{tournamentData.bracketType.replace('_', ' ')}</span>
                      </div>
                    )}
                    {tournamentData.seedingConfig && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Seeding Method:</span>
                        <span className="font-medium capitalize">{tournamentData.seedingConfig.method.replace('_', ' ')}</span>
                      </div>
                    )}
                    {tournamentData.teamFormationConfig && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Team Formation:</span>
                        <span className="font-medium capitalize">{tournamentData.teamFormationConfig.method.replace('_', ' ')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Generated Teams */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Generated Teams</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {tournamentData.generatedTeams.map((team: any, index: number) => (
                      <div key={team.teamId} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">Team #{index + 1}</span>
                          <span className="text-xs text-gray-500">Seed #{team.combinedSeed}</span>
                        </div>
                        <div className="text-sm text-gray-700 mb-1">{team.teamName}</div>
                        <div className="text-xs text-gray-600">
                          Win%: {(team.combinedStatistics.combinedWinPercentage * 100).toFixed(1)}% |
                          Avg Finish: {team.combinedStatistics.avgFinish.toFixed(1)} |
                          BODs: {team.combinedStatistics.combinedBodsPlayed}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Player Seeds */}
          {tournamentData?.generatedSeeds && tournamentData.generatedSeeds.length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Player Seeds</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                {tournamentData.generatedSeeds.map((seed: any) => (
                  <div key={seed.playerId} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">#{seed.seed}</span>
                      <span className="text-xs text-gray-500">
                        {(seed.statistics.winningPercentage * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-sm font-medium text-gray-900">{seed.playerName}</div>
                    <div className="text-xs text-gray-600">
                      Avg: {seed.statistics.avgFinish.toFixed(1)} |
                      BODs: {seed.statistics.bodsPlayed} |
                      Champ: {seed.statistics.totalChampionships}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Bracket Header */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tournament Bracket</h3>
            {results && (results as any).results ? (
              <div className="text-sm text-gray-600 mb-4">
                Showing bracket progression for {(results as any).results.length} teams
              </div>
            ) : tournamentData?.generatedTeams && tournamentData.generatedTeams.length > 0 ? (
              <div className="text-sm text-gray-600 mb-4">
                Tournament ready with {tournamentData.generatedTeams.length} teams. Start tournament to see live bracket progression.
              </div>
            ) : null}
          </Card>

          {/* Bracket Visualization */}
          {results && (results as any).results && (results as any).results.length > 0 ? (
            <div className="space-y-6">
              {/* Bracket Rounds */}
              <Card>
                <h4 className="text-md font-semibold text-gray-900 mb-4">Bracket Results</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Team</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">R16</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">QF</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SF</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Finals</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {((results as any).results as any[])
                        .sort((a, b) => (a.totalStats?.bodFinish || 999) - (b.totalStats?.bodFinish || 999))
                        .filter(result => (result.bracketScores?.bracketPlayed || 0) > 0)
                        .map((result) => (
                          <tr key={result.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 whitespace-nowrap">
                              <div className="flex items-center">
                                <span className="font-medium text-sm">{result.teamName}</span>
                                {result.totalStats?.bodFinish === 1 && <span className="ml-2">🏆</span>}
                                {result.totalStats?.bodFinish === 2 && <span className="ml-2">🥈</span>}
                                {result.totalStats?.bodFinish === 3 && <span className="ml-2">🥉</span>}
                              </div>
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm">
                              {(result.bracketScores?.r16Won || 0) > 0 || (result.bracketScores?.r16Lost || 0) > 0 ? (
                                <div className="flex items-center space-x-1">
                                  <EditableNumber
                                    value={result.bracketScores?.r16Won}
                                    onSave={(value) => updateTournamentResultField(result.id, 'bracketScores.r16Won', value)}
                                    min={0}
                                    integer
                                    placeholder="0"
                                    displayClassName={result.bracketScores.r16Won > result.bracketScores.r16Lost ? 'text-green-600 font-medium' : 'text-red-600'}
                                  />
                                  <span>-</span>
                                  <EditableNumber
                                    value={result.bracketScores?.r16Lost}
                                    onSave={(value) => updateTournamentResultField(result.id, 'bracketScores.r16Lost', value)}
                                    min={0}
                                    integer
                                    placeholder="0"
                                    displayClassName={result.bracketScores.r16Won > result.bracketScores.r16Lost ? 'text-green-600 font-medium' : 'text-red-600'}
                                  />
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm">
                              {(result.bracketScores?.qfWon || 0) > 0 || (result.bracketScores?.qfLost || 0) > 0 ? (
                                <div className="flex items-center space-x-1">
                                  <EditableNumber
                                    value={result.bracketScores?.qfWon}
                                    onSave={(value) => updateTournamentResultField(result.id, 'bracketScores.qfWon', value)}
                                    min={0}
                                    integer
                                    placeholder="0"
                                    displayClassName={result.bracketScores.qfWon > result.bracketScores.qfLost ? 'text-green-600 font-medium' : 'text-red-600'}
                                  />
                                  <span>-</span>
                                  <EditableNumber
                                    value={result.bracketScores?.qfLost}
                                    onSave={(value) => updateTournamentResultField(result.id, 'bracketScores.qfLost', value)}
                                    min={0}
                                    integer
                                    placeholder="0"
                                    displayClassName={result.bracketScores.qfWon > result.bracketScores.qfLost ? 'text-green-600 font-medium' : 'text-red-600'}
                                  />
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm">
                              {(result.bracketScores?.sfWon || 0) > 0 || (result.bracketScores?.sfLost || 0) > 0 ? (
                                <div className="flex items-center space-x-1">
                                  <EditableNumber
                                    value={result.bracketScores?.sfWon}
                                    onSave={(value) => updateTournamentResultField(result.id, 'bracketScores.sfWon', value)}
                                    min={0}
                                    integer
                                    placeholder="0"
                                    displayClassName={result.bracketScores.sfWon > result.bracketScores.sfLost ? 'text-green-600 font-medium' : 'text-red-600'}
                                  />
                                  <span>-</span>
                                  <EditableNumber
                                    value={result.bracketScores?.sfLost}
                                    onSave={(value) => updateTournamentResultField(result.id, 'bracketScores.sfLost', value)}
                                    min={0}
                                    integer
                                    placeholder="0"
                                    displayClassName={result.bracketScores.sfWon > result.bracketScores.sfLost ? 'text-green-600 font-medium' : 'text-red-600'}
                                  />
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm">
                              {(result.bracketScores?.finalsWon || 0) > 0 || (result.bracketScores?.finalsLost || 0) > 0 ? (
                                <div className="flex items-center space-x-1">
                                  <EditableNumber
                                    value={result.bracketScores?.finalsWon}
                                    onSave={(value) => updateTournamentResultField(result.id, 'bracketScores.finalsWon', value)}
                                    min={0}
                                    integer
                                    placeholder="0"
                                    displayClassName={result.bracketScores.finalsWon > result.bracketScores.finalsLost ? 'text-green-600 font-medium' : 'text-red-600'}
                                  />
                                  <span>-</span>
                                  <EditableNumber
                                    value={result.bracketScores?.finalsLost}
                                    onSave={(value) => updateTournamentResultField(result.id, 'bracketScores.finalsLost', value)}
                                    min={0}
                                    integer
                                    placeholder="0"
                                    displayClassName={result.bracketScores.finalsWon > result.bracketScores.finalsLost ? 'text-green-600 font-medium' : 'text-red-600'}
                                  />
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              <div className="flex items-center">
                                <span className="font-medium text-sm">#{result.totalStats?.bodFinish}</span>
                                <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${result.performanceGrade === 'A' ? 'bg-green-100 text-green-800' :
                                    result.performanceGrade === 'B' ? 'bg-blue-100 text-blue-800' :
                                      result.performanceGrade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                                        result.performanceGrade === 'D' ? 'bg-orange-100 text-orange-800' :
                                          'bg-red-100 text-red-800'
                                  }`}>
                                  {result.performanceGrade || 'F'}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </Card>

            </div>
          ) : (
            <Card>
              <div className="text-center py-8">
                <p className="text-gray-500">No bracket data available for this tournament</p>
                <p className="text-sm text-gray-400 mt-2">
                  Check the Results tab to see team performance data
                </p>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default TournamentDetail;
