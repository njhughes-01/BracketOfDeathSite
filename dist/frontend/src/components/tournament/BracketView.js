"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const BracketView = ({ matches, teams, currentRound, onMatchClick, showScores = true, editable = false }) => {
    const matchesByRound = matches.reduce((acc, match) => {
        const round = match.round;
        if (!acc[round])
            acc[round] = [];
        acc[round].push(match);
        return acc;
    }, {});
    const roundOrder = ['QF', 'SF', 'Finals'];
    const roundNames = {
        'QF': 'Quarter Finals',
        'SF': 'Semi Finals',
        'Finals': 'Championship'
    };
    const getTeamName = (teamId) => {
        const team = teams.find(t => t.teamId === teamId);
        return team?.teamName || 'Unknown Team';
    };
    const renderMatch = (match, isActive = false) => {
        const isCompleted = match.status === 'completed' || match.status === 'confirmed';
        const isInProgress = match.status === 'in_progress';
        const team1Score = match.team1.score;
        const team2Score = match.team2.score;
        const team1Won = isCompleted && team1Score !== undefined && team2Score !== undefined && team1Score > team2Score;
        const team2Won = isCompleted && team1Score !== undefined && team2Score !== undefined && team2Score > team1Score;
        return (<div key={match._id} className={`
          p-3 border rounded-lg cursor-pointer transition-all duration-200
          ${isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}
          ${isInProgress ? 'border-yellow-500 bg-yellow-50' : ''}
          ${isCompleted ? 'border-green-500 bg-green-50' : ''}
          ${editable ? 'hover:border-blue-400 hover:shadow-md' : ''}
        `} onClick={() => onMatchClick?.(match)} title={editable ? 'Click to edit match' : ''}>
        <div className="space-y-2">
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600">
              Match {match.matchNumber}
            </span>
            <div className="flex items-center space-x-2">
              {isInProgress && (<span className="flex items-center">
                  <span className="animate-pulse w-2 h-2 bg-yellow-500 rounded-full mr-1"></span>
                </span>)}
              <span className={`
                px-2 py-1 text-xs font-medium rounded-full
                ${isCompleted ? 'bg-green-100 text-green-800' :
                isInProgress ? 'bg-yellow-100 text-yellow-800 animate-pulse' :
                    'bg-gray-100 text-gray-600'}
              `}>
                {match.status === 'confirmed' ? 'Final' :
                match.status === 'completed' ? 'Done' :
                    match.status === 'in_progress' ? '🔴 Live' : 'Scheduled'}
              </span>
            </div>
          </div>

          
          <div className={`
            flex items-center justify-between p-2 rounded
            ${team1Won ? 'bg-green-100 border border-green-200' : 'bg-gray-50'}
          `}>
            <span className={`text-sm font-medium ${team1Won ? 'text-green-800' : 'text-gray-800'}`}>
              {match.team1.teamName}
            </span>
            {showScores && (<span className={`
                text-lg font-bold
                ${team1Won ? 'text-green-600' : 'text-gray-600'}
              `}>
                {team1Score ?? '-'}
              </span>)}
          </div>

          
          <div className="text-center">
            <span className="text-xs text-gray-400">vs</span>
          </div>

          
          <div className={`
            flex items-center justify-between p-2 rounded
            ${team2Won ? 'bg-green-100 border border-green-200' : 'bg-gray-50'}
          `}>
            <span className={`text-sm font-medium ${team2Won ? 'text-green-800' : 'text-gray-800'}`}>
              {match.team2.teamName}
            </span>
            {showScores && (<span className={`
                text-lg font-bold
                ${team2Won ? 'text-green-600' : 'text-gray-600'}
              `}>
                {team2Score ?? '-'}
              </span>)}
          </div>

          
          {(match.court || match.startTime) && (<div className="pt-2 border-t border-gray-200">
              <div className="space-y-1 text-xs text-gray-500">
                {match.court && <p>Court: {match.court}</p>}
                {match.startTime && (<p>
                    {isCompleted ? 'Completed' : isInProgress ? 'Started' : 'Scheduled'}: {' '}
                    {new Date(match.startTime).toLocaleTimeString()}
                  </p>)}
              </div>
            </div>)}
        </div>
      </div>);
    };
    const renderConnections = (roundIndex, matchCount) => {
        if (roundIndex === roundOrder.length - 1)
            return null;
        return (<div className="flex flex-col justify-center h-full px-4">
        {Array.from({ length: Math.floor(matchCount / 2) }).map((_, i) => (<div key={i} className="flex-1 flex items-center">
            <div className="w-8 border-t-2 border-gray-300"></div>
          </div>))}
      </div>);
    };
    const getTournamentStats = () => {
        const totalMatches = matches.length;
        const completedMatches = matches.filter(m => m.status === 'completed' || m.status === 'confirmed').length;
        const inProgressMatches = matches.filter(m => m.status === 'in_progress').length;
        return {
            totalMatches,
            completedMatches,
            inProgressMatches,
            progressPercentage: totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0
        };
    };
    const stats = getTournamentStats();
    return (<div className="space-y-6">
      
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Tournament Bracket</h3>
        {currentRound && (<div className="space-y-2">
            <p className="text-sm text-gray-600">
              Current Round: <span className="font-semibold">{roundNames[currentRound] || currentRound}</span>
            </p>
            
            
            <div className="max-w-md mx-auto">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>{stats.completedMatches} completed</span>
                <span>{stats.inProgressMatches > 0 && `${stats.inProgressMatches} live`}</span>
                <span>{stats.totalMatches} total</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className={`h-2 rounded-full transition-all duration-500 ${stats.inProgressMatches > 0 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${stats.progressPercentage}%` }}/>
              </div>
              <div className="text-xs text-gray-500 mt-1 text-center">
                {stats.progressPercentage}% Complete
              </div>
            </div>
          </div>)}
      </div>

      
      <div className="overflow-x-auto">
        <div className="flex items-start space-x-6 min-w-max p-4">
          {roundOrder.map((round, roundIndex) => {
            const roundMatches = matchesByRound[round] || [];
            const isCurrentRound = round === currentRound;
            if (roundMatches.length === 0)
                return null;
            return (<div key={round} className="flex items-center">
                
                <div className="space-y-4">
                  
                  <div className="text-center mb-4">
                    <h4 className={`
                      text-sm font-semibold px-3 py-1 rounded-full
                      ${isCurrentRound ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}
                    `}>
                      {roundNames[round]}
                    </h4>
                  </div>

                  
                  <div className="space-y-8">
                    {roundMatches
                    .sort((a, b) => a.matchNumber - b.matchNumber)
                    .map(match => renderMatch(match, isCurrentRound))}
                  </div>
                </div>

                
                {renderConnections(roundIndex, roundMatches.length)}
              </div>);
        })}
        </div>
      </div>

      
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
        {editable && (<p className="text-xs text-gray-500 mt-2">
            💡 Click on any match to edit scores and details
          </p>)}
      </div>

      
      {roundOrder.every(round => !matchesByRound[round] || matchesByRound[round].length === 0) && (<div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-gray-400 text-2xl">🏆</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Bracket Matches</h3>
          <p className="text-gray-500">
            Bracket matches will appear here once the tournament reaches the bracket phase.
          </p>
        </div>)}
    </div>);
};
exports.default = BracketView;
//# sourceMappingURL=BracketView.js.map