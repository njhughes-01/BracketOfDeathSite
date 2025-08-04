import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../services/api';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { EditableCard, EditableNumber } from '../components/admin';
import BracketView from '../components/tournament/BracketView';
import type { 
  LiveTournament, 
  Match, 
  TournamentAction, 
  MatchUpdate,
  TournamentResult 
} from '../types/api';

const TournamentManage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [liveTournament, setLiveTournament] = useState<LiveTournament | null>(null);
  const [currentMatches, setCurrentMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRound, setSelectedRound] = useState<string>('');

  // Load live tournament data
  const loadTournamentData = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const response = await apiClient.getLiveTournament(id);
      if (response.success && response.data) {
        setLiveTournament(response.data);
        setSelectedRound(response.data.phase.currentRound || 'RR_R1');
        
        // Load matches for current round
        if (response.data.phase.currentRound) {
          const matchesResponse = await apiClient.getTournamentMatches(id, response.data.phase.currentRound);
          if (matchesResponse.success && matchesResponse.data) {
            setCurrentMatches(matchesResponse.data);
          }
        }
      }
    } catch (err) {
      setError('Failed to load tournament data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTournamentData();
    
    // Set up polling for real-time updates
    const interval = setInterval(loadTournamentData, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [loadTournamentData]);

  // Execute tournament action
  const executeTournamentAction = async (action: TournamentAction) => {
    if (!id) return;
    
    try {
      setLoading(true);
      const response = await apiClient.executeTournamentAction(id, action);
      if (response.success && response.data) {
        setLiveTournament(response.data);
        await loadTournamentData(); // Refresh all data
      }
    } catch (err) {
      setError(`Failed to ${action.action.replace('_', ' ')}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Update match score
  const updateMatchScore = async (matchUpdate: MatchUpdate) => {
    try {
      setLoading(true);
      const response = await apiClient.updateMatch(matchUpdate);
      if (response.success) {
        // Refresh current matches
        if (liveTournament?.phase.currentRound) {
          const matchesResponse = await apiClient.getTournamentMatches(id!, liveTournament.phase.currentRound);
          if (matchesResponse.success && matchesResponse.data) {
            setCurrentMatches(matchesResponse.data);
          }
        }
        // Refresh tournament data for standings update
        await loadTournamentData();
      }
    } catch (err) {
      setError('Failed to update match score');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Check in team
  const checkInTeam = async (teamId: string, present: boolean) => {
    if (!id) return;
    
    try {
      const response = await apiClient.checkInTeam(id, teamId, present);
      if (response.success && response.data) {
        setLiveTournament(response.data);
      }
    } catch (err) {
      setError('Failed to update check-in status');
      console.error(err);
    }
  };

  // Get phase display info
  const getPhaseDisplayInfo = (phase: string) => {
    const phaseMap = {
      'setup': { label: 'Setup', color: 'bg-gray-100 text-gray-800', icon: '⚙️' },
      'registration': { label: 'Registration Open', color: 'bg-blue-100 text-blue-800', icon: '📝' },
      'check_in': { label: 'Check-In', color: 'bg-yellow-100 text-yellow-800', icon: '✅' },
      'round_robin': { label: 'Round Robin', color: 'bg-orange-100 text-orange-800', icon: '🔄' },
      'bracket': { label: 'Bracket Play', color: 'bg-red-100 text-red-800', icon: '🏆' },
      'completed': { label: 'Completed', color: 'bg-green-100 text-green-800', icon: '🎉' }
    };
    return phaseMap[phase as keyof typeof phaseMap] || phaseMap.setup;
  };

  // Get round display info
  const getRoundDisplayInfo = (round: string) => {
    const roundMap = {
      'RR_R1': 'Round Robin - Round 1',
      'RR_R2': 'Round Robin - Round 2', 
      'RR_R3': 'Round Robin - Round 3',
      'QF': 'Quarter Finals',
      'SF': 'Semi Finals',
      'Finals': 'Championship'
    };
    return roundMap[round as keyof typeof roundMap] || round;
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600 mb-4">You need admin privileges to manage tournaments.</p>
      </div>
    );
  }

  if (loading && !liveTournament) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-500">Loading tournament...</span>
      </div>
    );
  }

  if (!liveTournament) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Tournament Not Found</h2>
        <p className="text-gray-600 mb-4">Could not load tournament management data.</p>
        <button onClick={() => navigate('/tournaments')} className="btn btn-primary">
          Back to Tournaments
        </button>
      </div>
    );
  }

  const phaseInfo = getPhaseDisplayInfo(liveTournament.phase.phase);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-gray-900">Tournament Management</h1>
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${phaseInfo.color}`}>
              {phaseInfo.icon} {phaseInfo.label}
            </span>
          </div>
          <p className="text-gray-600 mt-1">
            {liveTournament.location} • {new Date(liveTournament.date).toLocaleDateString()} • BOD #{liveTournament.bodNumber}
          </p>
          {liveTournament.phase.currentRound && (
            <p className="text-sm text-gray-500">
              Current: {getRoundDisplayInfo(liveTournament.phase.currentRound)} 
              ({liveTournament.phase.completedMatches}/{liveTournament.phase.totalMatches} matches completed)
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate(`/tournaments/${id}`)}
            className="btn btn-outline btn-sm"
          >
            View Details
          </button>
          <button
            onClick={() => navigate('/tournaments')}
            className="btn btn-secondary btn-sm"
          >
            Back to List
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center">
            <span className="text-red-500 text-xl mr-2">⚠️</span>
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Control Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tournament Control Panel */}
          <EditableCard title="Tournament Controls">
            <div className="space-y-4">
              {/* Phase Actions */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {liveTournament.phase.phase === 'setup' && (
                  <button
                    onClick={() => executeTournamentAction({ action: 'start_registration' })}
                    className="btn btn-primary btn-sm"
                    disabled={loading}
                  >
                    Open Registration
                  </button>
                )}
                
                {liveTournament.phase.phase === 'registration' && (
                  <>
                    <button
                      onClick={() => executeTournamentAction({ action: 'close_registration' })}
                      className="btn btn-outline btn-sm"
                      disabled={loading}
                    >
                      Close Registration
                    </button>
                    <button
                      onClick={() => executeTournamentAction({ action: 'start_checkin' })}
                      className="btn btn-primary btn-sm"
                      disabled={loading}
                    >
                      Start Check-In
                    </button>
                  </>
                )}

                {liveTournament.phase.phase === 'check_in' && (
                  <button
                    onClick={() => executeTournamentAction({ action: 'start_round_robin' })}
                    className="btn btn-primary btn-sm"
                    disabled={loading}
                  >
                    Start Round Robin
                  </button>
                )}

                {liveTournament.phase.phase === 'round_robin' && (
                  <>
                    {liveTournament.phase.canAdvance && liveTournament.phase.currentRound !== 'RR_R3' && (
                      <button
                        onClick={() => executeTournamentAction({ action: 'advance_round' })}
                        className="btn btn-primary btn-sm"
                        disabled={loading}
                      >
                        Next Round
                      </button>
                    )}
                    {liveTournament.phase.canAdvance && liveTournament.phase.currentRound === 'RR_R3' && (
                      <button
                        onClick={() => executeTournamentAction({ action: 'start_bracket' })}
                        className="btn btn-primary btn-sm"
                        disabled={loading}
                      >
                        Start Bracket
                      </button>
                    )}
                  </>
                )}

                {liveTournament.phase.phase === 'bracket' && (
                  <>
                    {liveTournament.phase.canAdvance && (
                      <button
                        onClick={() => executeTournamentAction({ action: 'advance_round' })}
                        className="btn btn-primary btn-sm"
                        disabled={loading}
                      >
                        Next Round
                      </button>
                    )}
                    {liveTournament.phase.currentRound === 'Finals' && liveTournament.phase.canAdvance && (
                      <button
                        onClick={() => executeTournamentAction({ action: 'complete_tournament' })}
                        className="btn btn-success btn-sm"
                        disabled={loading}
                      >
                        Complete Tournament
                      </button>
                    )}
                  </>
                )}

                {/* Emergency Controls */}
                <button
                  onClick={() => executeTournamentAction({ action: 'reset_tournament' })}
                  className="btn btn-danger btn-sm"
                  disabled={loading}
                  title="Reset tournament to setup phase"
                >
                  Emergency Reset
                </button>
              </div>

              {/* Round Progress */}
              {liveTournament.phase.currentRound && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {getRoundDisplayInfo(liveTournament.phase.currentRound)} Progress
                    </span>
                    <span className="text-sm text-gray-500">
                      {liveTournament.phase.completedMatches} / {liveTournament.phase.totalMatches}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${(liveTournament.phase.completedMatches / liveTournament.phase.totalMatches) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </EditableCard>

          {/* Match Management */}
          {currentMatches.length > 0 && (
            <EditableCard title={`${getRoundDisplayInfo(selectedRound)} Matches`}>
              <div className="space-y-4">
                {/* Round Selector */}
                <div className="flex items-center space-x-4">
                  <label className="text-sm font-medium text-gray-700">Round:</label>
                  <select
                    value={selectedRound}
                    onChange={async (e) => {
                      setSelectedRound(e.target.value);
                      const matchesResponse = await apiClient.getTournamentMatches(id!, e.target.value);
                      if (matchesResponse.success && matchesResponse.data) {
                        setCurrentMatches(matchesResponse.data);
                      }
                    }}
                    className="select select-sm"
                  >
                    <option value="RR_R1">Round Robin - Round 1</option>
                    <option value="RR_R2">Round Robin - Round 2</option>
                    <option value="RR_R3">Round Robin - Round 3</option>
                    <option value="QF">Quarter Finals</option>
                    <option value="SF">Semi Finals</option>
                    <option value="Finals">Championship</option>
                  </select>
                </div>

                {/* Matches Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentMatches.map((match) => (
                    <div
                      key={match._id}
                      className={`p-4 border rounded-lg ${
                        match.status === 'completed' ? 'bg-green-50 border-green-200' :
                        match.status === 'in_progress' ? 'bg-yellow-50 border-yellow-200' : 
                        'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-900">
                          Match {match.matchNumber}
                        </span>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            match.status === 'completed' ? 'bg-green-100 text-green-800' :
                            match.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                            match.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {match.status.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Team 1 vs Team 2 */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{match.team1.teamName}</span>
                          <EditableNumber
                            value={match.team1.score}
                            onSave={(score) => updateMatchScore({
                              matchId: match._id,
                              team1Score: score,
                              status: score !== undefined ? 'completed' : 'scheduled'
                            })}
                            min={0}
                            integer
                            placeholder="0"
                            displayClassName="text-lg font-bold text-blue-600 min-w-[2rem] text-center"
                          />
                        </div>
                        <div className="text-center text-gray-400 text-sm">vs</div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{match.team2.teamName}</span>
                          <EditableNumber
                            value={match.team2.score}
                            onSave={(score) => updateMatchScore({
                              matchId: match._id,
                              team2Score: score,
                              status: score !== undefined ? 'completed' : 'scheduled'
                            })}
                            min={0}
                            integer
                            placeholder="0"
                            displayClassName="text-lg font-bold text-blue-600 min-w-[2rem] text-center"
                          />
                        </div>
                      </div>

                      {/* Match Details */}
                      {(match.court || match.startTime || match.notes) && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="space-y-1 text-xs text-gray-500">
                            {match.court && <p>Court: {match.court}</p>}
                            {match.startTime && <p>Started: {new Date(match.startTime).toLocaleTimeString()}</p>}
                            {match.notes && <p>Notes: {match.notes}</p>}
                          </div>
                        </div>
                      )}

                      {/* Quick Actions */}
                      <div className="mt-3 flex space-x-2">
                        {match.status === 'scheduled' && (
                          <button
                            onClick={() => updateMatchScore({
                              matchId: match._id,
                              status: 'in_progress',
                              startTime: new Date().toISOString()
                            })}
                            className="btn btn-outline btn-xs"
                          >
                            Start Match
                          </button>
                        )}
                        {match.status === 'completed' && (
                          <button
                            onClick={() => updateMatchScore({
                              matchId: match._id,
                              status: 'confirmed'
                            })}
                            className="btn btn-primary btn-xs"
                          >
                            Confirm Result
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Generate Matches Button */}
                {currentMatches.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">No matches generated for this round</p>
                    <button
                      onClick={async () => {
                        const response = await apiClient.generateMatches(id!, selectedRound);
                        if (response.success && response.data) {
                          setCurrentMatches(response.data);
                        }
                      }}
                      className="btn btn-primary"
                      disabled={loading}
                    >
                      Generate Matches
                    </button>
                  </div>
                )}
              </div>
            </EditableCard>
          )}

          {/* Bracket Visualization */}
          {liveTournament.phase.phase === 'bracket' && liveTournament.matches.length > 0 && (
            <EditableCard title="Tournament Bracket">
              <BracketView
                matches={liveTournament.matches.filter(m => ['QF', 'SF', 'Finals'].includes(m.round))}
                teams={liveTournament.teams}
                currentRound={liveTournament.phase.currentRound}
                onMatchClick={(match) => {
                  // Handle match click for editing
                  console.log('Match clicked:', match);
                }}
                showScores={true}
                editable={true}
              />
            </EditableCard>
          )}
        </div>

        {/* Sidebar - Teams & Standings */}
        <div className="space-y-6">
          {/* Check-In Status */}
          {liveTournament.phase.phase === 'check_in' && (
            <EditableCard title="Team Check-In">
              <div className="space-y-3">
                {liveTournament.teams.map((team) => {
                  const checkInStatus = liveTournament.checkInStatus[team.teamId];
                  return (
                    <div
                      key={team.teamId}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-sm">{team.teamName}</p>
                        <p className="text-xs text-gray-500">
                          {team.players.map(p => p.playerName).join(' & ')}
                        </p>
                      </div>
                      <button
                        onClick={() => checkInTeam(team.teamId, !checkInStatus?.checkedIn)}
                        className={`btn btn-xs ${
                          checkInStatus?.checkedIn 
                            ? 'btn-success' 
                            : 'btn-outline'
                        }`}
                      >
                        {checkInStatus?.checkedIn ? '✓ Checked In' : 'Check In'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </EditableCard>
          )}

          {/* Current Standings */}
          {liveTournament.currentStandings.length > 0 && (
            <EditableCard title="Current Standings">
              <div className="space-y-2">
                {liveTournament.currentStandings
                  .sort((a, b) => (a.totalStats.bodFinish || 999) - (b.totalStats.bodFinish || 999))
                  .slice(0, 8)
                  .map((result, index) => (
                    <div
                      key={result.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm">#{index + 1}</span>
                        <div>
                          <p className="text-sm font-medium">{(result as any).teamName}</p>
                          <p className="text-xs text-gray-500">
                            {result.totalStats.totalWon}-{result.totalStats.totalLost} 
                            ({((result.totalStats.winPercentage || 0) * 100).toFixed(0)}%)
                          </p>
                        </div>
                      </div>
                      {index < 3 && (
                        <span className="text-lg">
                          {index === 0 ? '🏆' : index === 1 ? '🥈' : '🥉'}
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            </EditableCard>
          )}

          {/* Tournament Info */}
          <EditableCard title="Tournament Info">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Format:</span>
                <span className="font-medium">{liveTournament.format}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Teams:</span>
                <span className="font-medium">{liveTournament.teams.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Max Players:</span>
                <span className="font-medium">{liveTournament.maxPlayers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${phaseInfo.color}`}>
                  {phaseInfo.label}
                </span>
              </div>
            </div>
          </EditableCard>
        </div>
      </div>
    </div>
  );
};

export default TournamentManage;