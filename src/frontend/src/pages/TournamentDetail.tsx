import React, { useState, useCallback, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import apiClient from '../services/api';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { getTournamentStatus, getStatusDisplayInfo } from '../utils/tournamentStatus';

const TournamentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { isAdmin } = useAuth();
  const { canViewAdmin } = usePermissions();
  const [activeTab, setActiveTab] = useState<'overview' | 'results' | 'bracket'>('overview');

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

  const { data: tournament, loading: tournamentLoading, error: tournamentError } = useApi(
    getTournament,
    { immediate: true }
  );

  const getResults = useCallback(
    () => apiClient.getResultsByTournament(id!),
    [id]
  );

  const { data: results, loading: resultsLoading } = useApi(
    getResults,
    { immediate: true }
  );

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

  if (tournamentLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-500">Loading tournament...</span>
      </div>
    );
  }

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

  if (!tournament) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-gray-400 text-2xl">🏆</span>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Tournament not found</h2>
        <p className="text-gray-600 mb-4">The requested tournament could not be found.</p>
        <Link to="/tournaments" className="btn btn-primary">
          Back to Tournaments
        </Link>
      </div>
    );
  }

  const tournamentData = tournament as any;
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
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
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
                ) : <div className="w-24"/>;
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
                ) : <div className="w-28"/>;
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
                ) : <div className="w-24"/>;
              })()}
            </div>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tournament Info */}
            <div className="md:col-span-2">
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Tournament Information</h3>
                {tournamentData.notes && (
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-700">Notes</p>
                    <p className="text-gray-600">{tournamentData.notes}</p>
                  </div>
                )}
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-700">Advancement Criteria</p>
                  <p className="text-gray-600">{tournamentData.advancementCriteria}</p>
                </div>

                {tournamentData.photoAlbums && (
                  <div className="mt-6">
                    <a
                      href={tournamentData.photoAlbums}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary w-full md:w-auto"
                    >
                      View Photo Album
                    </a>
                  </div>
                )}
              </Card>
            </div>
            {/* Quick Stats */}
            <div className="space-y-4">
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status</span>
                    <span className="font-medium text-green-600">Completed</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Teams</span>
                    <span className="font-medium">
                      {(results as any)?.results?.length || 0}
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
                            <span className="font-medium text-gray-900">#{result.totalStats?.bodFinish || 'N/A'}</span>
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
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            {result.division || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          #{result.seed || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {result.roundRobinScores?.rrWon || 0}-{result.roundRobinScores?.rrLost || 0}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({((result.roundRobinScores?.rrWinPercentage || 0) * 100).toFixed(1)}%)
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {result.bracketScores?.bracketWon || 0}-{result.bracketScores?.bracketLost || 0}
                            </span>
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
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            result.performanceGrade === 'A' ? 'bg-green-100 text-green-800' :
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
          {/* Bracket Header */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tournament Bracket</h3>
            {results && (results as any).results ? (
              <div className="text-sm text-gray-600 mb-4">
                Showing bracket progression for {(results as any).results.length} teams
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
                                <span className={result.bracketScores.r16Won > result.bracketScores.r16Lost ? 'text-green-600 font-medium' : 'text-red-600'}>
                                  {result.bracketScores.r16Won}-{result.bracketScores.r16Lost}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm">
                              {(result.bracketScores?.qfWon || 0) > 0 || (result.bracketScores?.qfLost || 0) > 0 ? (
                                <span className={result.bracketScores.qfWon > result.bracketScores.qfLost ? 'text-green-600 font-medium' : 'text-red-600'}>
                                  {result.bracketScores.qfWon}-{result.bracketScores.qfLost}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm">
                              {(result.bracketScores?.sfWon || 0) > 0 || (result.bracketScores?.sfLost || 0) > 0 ? (
                                <span className={result.bracketScores.sfWon > result.bracketScores.sfLost ? 'text-green-600 font-medium' : 'text-red-600'}>
                                  {result.bracketScores.sfWon}-{result.bracketScores.sfLost}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm">
                              {(result.bracketScores?.finalsWon || 0) > 0 || (result.bracketScores?.finalsLost || 0) > 0 ? (
                                <span className={result.bracketScores.finalsWon > result.bracketScores.finalsLost ? 'text-green-600 font-medium' : 'text-red-600'}>
                                  {result.bracketScores.finalsWon}-{result.bracketScores.finalsLost}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              <div className="flex items-center">
                                <span className="font-medium text-sm">#{result.totalStats?.bodFinish}</span>
                                <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
                                  result.performanceGrade === 'A' ? 'bg-green-100 text-green-800' :
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