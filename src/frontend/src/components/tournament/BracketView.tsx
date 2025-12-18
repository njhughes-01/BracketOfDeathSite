import React from 'react';
import type { Match, TeamSeed } from '../../types/api';

interface BracketViewProps {
  matches: Match[];
  teams: TeamSeed[];
  currentRound?: string;
  onMatchClick?: (match: Match) => void;
  showScores?: boolean;
  editable?: boolean;
}

const BracketView: React.FC<BracketViewProps> = ({
  matches,
  teams,
  currentRound,
  onMatchClick,
  showScores = true,
  editable = false
}) => {
  // Group matches by round
  const matchesByRound = matches.reduce((acc, match) => {
    const round = match.round;
    if (!acc[round]) acc[round] = [];
    acc[round].push(match);
    return acc;
  }, {} as Record<string, Match[]>);

  // Define round orders and display names (backend-compatible keys)
  const winnersOrder = ['quarterfinal', 'semifinal', 'final', 'grand-final'];
  const losersOrder = ['lbr-round-1', 'lbr-semifinal', 'lbr-final'];
  const roundOrder = [...winnersOrder, ...losersOrder];
  const roundNames: Record<string, string> = {
    'quarterfinal': 'Quarterfinals',
    'semifinal': 'Semifinals',
    'final': 'Final',
    'grand-final': 'Grand Final',
    'lbr-round-1': 'Losers R1',
    'lbr-round-2': 'Losers R2',
    'lbr-quarterfinal': 'Losers Quarterfinal',
    'lbr-semifinal': 'Losers Semifinal',
    'lbr-final': 'Losers Final',
  };

  // Get team name from seed list or match fields
  const getTeamName = (teamId: string, fallback?: { playerNames?: string[]; players?: any[] }) => {
    const team = teams.find(t => t.teamId === teamId);
    if (team?.teamName) return team.teamName;
    if (fallback?.playerNames && fallback.playerNames.length > 0) return fallback.playerNames.join(' & ');
    if (fallback?.players && Array.isArray(fallback.players)) {
      const names = (fallback.players as any[]).map((p: any) => p?.name || p?.playerName).filter(Boolean);
      if (names.length > 0) return names.join(' & ');
    }
    return 'Unknown Team';
  };

  // Render a single match
  const renderMatch = (match: Match, isActive: boolean = false) => {
    const status = (match.status as any);
    const isCompleted = status === 'completed' || status === 'confirmed';
    const isInProgress = status === 'in_progress' || status === 'in-progress';
    const team1Score = match.team1.score;
    const team2Score = match.team2.score;
    const team1Won = isCompleted && team1Score !== undefined && team2Score !== undefined && team1Score > team2Score;
    const team2Won = isCompleted && team1Score !== undefined && team2Score !== undefined && team2Score > team1Score;

    return (
      <div
        key={match._id}
        className={`
          p-3 border rounded-lg cursor-pointer transition-all duration-200
          ${isActive ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-white/10 bg-white dark:bg-card-dark'}
          ${isInProgress ? 'border-accent bg-accent/5' : ''}
          ${isCompleted ? 'border-green-500/50 bg-green-500/5' : ''}
          ${editable ? 'hover:border-primary/50 hover:shadow-md' : ''}
        `}
        onClick={() => onMatchClick?.(match)}
        title={editable ? 'Click to edit match' : ''}
      >
        <div className="space-y-2">
          {/* Match Header */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Match {match.matchNumber}
            </span>
            <div className="flex items-center space-x-2">
              {isInProgress && (
                <span className="flex items-center">
                  <span className="animate-pulse w-2 h-2 bg-accent rounded-full mr-1"></span>
                </span>
              )}
              <span className={`
                px-2 py-1 text-xs font-medium rounded-full
                ${isCompleted ? 'bg-green-100 text-green-800' :
                  isInProgress ? 'bg-yellow-100 text-yellow-800 animate-pulse' :
                    'bg-gray-100 text-gray-600'}
              `}>
                {match.status === 'confirmed' ? 'Final' :
                  match.status === 'completed' ? 'Done' :
                    match.status === 'in_progress' ? 'Live' : 'Scheduled'}
              </span>
            </div>
          </div>

          {/* Team 1 */}
          <div className={`
            flex items-center justify-between p-2 rounded
            ${team1Won ? 'bg-green-500/10 border border-green-500/20' : 'bg-slate-50 dark:bg-black/20'}
          `}>
            <span className={`text-sm font-medium ${team1Won ? 'text-green-600 dark:text-green-400' : 'text-slate-800 dark:text-slate-200'}`}>
              {getTeamName(match.team1.teamId, match.team1 as any)}
            </span>
            {showScores && (
              <span className={`
                text-lg font-bold
                ${team1Won ? 'text-green-600' : 'text-gray-600'}
              `}>
                {team1Score ?? '-'}
              </span>
            )}
          </div>

          {/* VS Divider */}
          <div className="text-center">
            <span className="text-xs text-gray-400">vs</span>
          </div>

          {/* Team 2 */}
          <div className={`
            flex items-center justify-between p-2 rounded
            ${team2Won ? 'bg-green-500/10 border border-green-500/20' : 'bg-slate-50 dark:bg-black/20'}
          `}>
            <span className={`text-sm font-medium ${team2Won ? 'text-green-600 dark:text-green-400' : 'text-slate-800 dark:text-slate-200'}`}>
              {getTeamName(match.team2.teamId, match.team2 as any)}
            </span>
            {showScores && (
              <span className={`
                text-lg font-bold
                ${team2Won ? 'text-green-600' : 'text-gray-600'}
              `}>
                {team2Score ?? '-'}
              </span>
            )}
          </div>

          {/* Match Details */}
          {(match.court || match.startTime) && (
            <div className="pt-2 border-t border-gray-200">
              <div className="space-y-1 text-xs text-gray-500">
                {match.court && <p>Court: {match.court}</p>}
                {match.startTime && (
                  <p>
                    {isCompleted ? 'Completed' : isInProgress ? 'Started' : 'Scheduled'}: {' '}
                    {new Date(match.startTime).toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render bracket connections (simplified lines)
  const renderConnections = (roundIndex: number, matchCount: number, totalRounds: number) => {
    if (roundIndex === totalRounds - 1) return null; // No connections after last round

    return (
      <div className="flex flex-col justify-center h-full px-4">
        {Array.from({ length: Math.floor(matchCount / 2) }).map((_, i) => (
          <div key={i} className="flex-1 flex items-center">
            <div className="w-8 border-t-2 border-slate-300 dark:border-white/10"></div>
          </div>
        ))}
      </div>
    );
  };

  // Get tournament progression stats
  const getTournamentStats = () => {
    const totalMatches = matches.length;
    const completedMatches = matches.filter(m => (m.status as any) === 'completed' || (m.status as any) === 'confirmed').length;
    const inProgressMatches = matches.filter(m => (m.status as any) === 'in_progress' || (m.status as any) === 'in-progress').length;

    return {
      totalMatches,
      completedMatches,
      inProgressMatches,
      progressPercentage: totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0
    };
  };

  const stats = getTournamentStats();

  return (
    <div className="space-y-6">
      {/* Bracket Header with Live Stats */}
      <div className="text-center">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Tournament Bracket</h3>
        {currentRound && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Current Round: <span className="font-semibold">{roundNames[currentRound as keyof typeof roundNames] || currentRound}</span>
            </p>

            {/* Live Progress Bar */}
            <div className="max-w-md mx-auto">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>{stats.completedMatches} completed</span>
                <span>{stats.inProgressMatches > 0 && `${stats.inProgressMatches} live`}</span>
                <span>{stats.totalMatches} total</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${stats.inProgressMatches > 0 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                  style={{ width: `${stats.progressPercentage}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-1 text-center">
                {stats.progressPercentage}% Complete
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bracket Grid */}
      <div className="overflow-x-auto">
        {/* Winners Bracket */}
        <div className="flex items-start space-x-6 min-w-max p-4">
          {winnersOrder.map((round, roundIndex) => {
            const roundMatches = matchesByRound[round] || [];
            const isCurrentRound = round === currentRound;

            if (roundMatches.length === 0) return null;

            return (
              <div key={round} className="flex items-center">
                {/* Round Column */}
                <div className="space-y-4">
                  {/* Round Header */}
                  <div className="text-center mb-4">
                    <h4 className={`
                      text-sm font-semibold px-3 py-1 rounded-full
                      ${isCurrentRound ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}
                    `}>
                      {roundNames[round as keyof typeof roundNames]}
                    </h4>
                  </div>

                  {/* Matches */}
                  <div className="space-y-8">
                    {roundMatches
                      .sort((a, b) => a.matchNumber - b.matchNumber)
                      .map(match => renderMatch(match, isCurrentRound))}
                  </div>
                </div>

                {/* Connection Lines */}
                {renderConnections(roundIndex, roundMatches.length, winnersOrder.length)}
              </div>
            );
          })}
        </div>
        {/* Losers Bracket */}
        {losersOrder.some(r => (matchesByRound[r] || []).length > 0) && (
          <>
            <div className="px-4">
              <h4 className="text-sm font-semibold text-gray-700">Losers Bracket</h4>
            </div>
            <div className="flex items-start space-x-6 min-w-max px-4 pb-4">
              {losersOrder.map((round, roundIndex) => {
                const roundMatches = matchesByRound[round] || [];
                const isCurrentRound = round === currentRound;
                if (roundMatches.length === 0) return null;
                return (
                  <div key={round} className="flex items-center">
                    <div className="space-y-4">
                      <div className="text-center mb-4">
                        <h4 className={`
                          text-sm font-semibold px-3 py-1 rounded-full
                          ${isCurrentRound ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}
                        `}>
                          {roundNames[round] || round}
                        </h4>
                      </div>
                      <div className="space-y-8">
                        {roundMatches
                          .sort((a, b) => a.matchNumber - b.matchNumber)
                          .map(match => renderMatch(match, isCurrentRound))}
                      </div>
                    </div>
                    {renderConnections(roundIndex, roundMatches.length, losersOrder.length)}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Bracket Legend */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Legend</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded"></div>
            <span>Scheduled</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></div>
            <span>In Progress</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
            <span>Completed</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
            <span>Current Round</span>
          </div>
        </div>
        {editable && (
          <p className="text-xs text-gray-500 mt-2">
            💡 Click on any match to edit scores and details
          </p>
        )}
      </div>

      {/* Empty State */}
      {roundOrder.every(round => !matchesByRound[round] || matchesByRound[round].length === 0) && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-gray-400 text-2xl">🏆</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Bracket Matches</h3>
          <p className="text-gray-500">
            Bracket matches will appear here once the tournament reaches the bracket phase.
          </p>
        </div>
      )}
    </div>
  );
};

export default BracketView;
