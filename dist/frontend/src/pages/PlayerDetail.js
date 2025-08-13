"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const react_router_dom_1 = require("react-router-dom");
const useApi_1 = require("../hooks/useApi");
const api_1 = __importDefault(require("../services/api"));
const Card_1 = __importDefault(require("../components/ui/Card"));
const LoadingSpinner_1 = __importDefault(require("../components/ui/LoadingSpinner"));
const StatCard_1 = __importDefault(require("../components/ui/StatCard"));
const PlayerDetail = () => {
    const { id } = (0, react_router_dom_1.useParams)();
    const navigate = (0, react_router_dom_1.useNavigate)();
    const [activeTab, setActiveTab] = (0, react_1.useState)('tournaments');
    const getPlayer = (0, react_1.useCallback)(() => api_1.default.getPlayer(id), [id]);
    const { data: playerResponse, loading, error } = (0, useApi_1.useApi)(getPlayer, { immediate: true });
    const getPlayerResults = (0, react_1.useCallback)(() => api_1.default.getResultsByPlayer(id), [id]);
    const { data: resultsResponse, loading: resultsLoading } = (0, useApi_1.useApi)(getPlayerResults, { immediate: true });
    if (loading) {
        return (<div className="flex items-center justify-center min-h-96">
        <LoadingSpinner_1.default size="lg"/>
        <span className="ml-3 text-gray-500">Loading player details...</span>
      </div>);
    }
    if (error) {
        return (<div className="text-center py-12">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-red-500 text-2xl">⚠️</span>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Player not found</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <react_router_dom_1.Link to="/players" className="btn btn-primary">
          Back to Players
        </react_router_dom_1.Link>
      </div>);
    }
    const player = playerResponse;
    const resultsData = resultsResponse;
    const results = resultsData?.results || [];
    const playerStats = resultsData?.stats;
    if (!player) {
        return (<div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-gray-400 text-2xl">👤</span>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Player not found</h2>
        <p className="text-gray-600 mb-4">The requested player could not be found.</p>
        <react_router_dom_1.Link to="/players" className="btn btn-primary">
          Back to Players
        </react_router_dom_1.Link>
      </div>);
    }
    return (<div className="space-y-6">
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-xl">
              {player.name?.split(' ').map(n => n[0]).join('') || 'P'}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{player.name}</h1>
            <p className="text-gray-600">
              {player.pairing ? `Partners with ${player.pairing}` : 'Individual Player'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={() => navigate(`/players/${id}/edit`)} className="btn btn-outline">
            Edit Player
          </button>
          <button onClick={() => navigate('/players')} className="btn btn-secondary">
            Back to Players
          </button>
        </div>
      </div>

      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard_1.default title="BODs Played" value={player.bodsPlayed || 0} icon="🏆" iconColor="bg-blue-100 text-blue-600"/>
        
        <StatCard_1.default title="Best Result" value={player.bestResult || 0} icon="🥇" iconColor="bg-yellow-100 text-yellow-600"/>
        
        <StatCard_1.default title="Win Rate" value={`${((player.winningPercentage || 0) * 100).toFixed(1)}%`} icon="📊" iconColor="bg-green-100 text-green-600"/>
        
        <StatCard_1.default title="Championships" value={player.totalChampionships || 0} icon="🏅" iconColor="bg-purple-100 text-purple-600"/>
      </div>

      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <Card_1.default>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tournament Performance</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Average Finish</span>
              <span className="font-medium">{player.avgFinish?.toFixed(1) || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">BODs Played</span>
              <span className="font-medium">{player.bodsPlayed || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Best Result</span>
              <span className="font-medium">{player.bestResult || 0}</span>
            </div>
          </div>
        </Card_1.default>

        
        <Card_1.default>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Game Statistics</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Games Played</span>
              <span className="font-medium">{playerStats?.totalGames || player.gamesPlayed || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Games Won</span>
              <span className="font-medium">{playerStats?.totalWins || player.gamesWon || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Games Lost</span>
              <span className="font-medium">{playerStats?.totalLosses || (player.gamesPlayed - player.gamesWon) || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Winning Percentage</span>
              <span className="font-medium">{((playerStats?.overallWinPercentage || player.winningPercentage || 0) * 100).toFixed(1)}%</span>
            </div>
          </div>
        </Card_1.default>
      </div>

      
      <Card_1.default>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Championships</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {player.individualChampionships || 0}
            </div>
            <div className="text-sm text-gray-600">Individual Championships</div>
          </div>
          
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {player.divisionChampionships || 0}
            </div>
            <div className="text-sm text-gray-600">Division Championships</div>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {player.totalChampionships || 0}
            </div>
            <div className="text-sm text-gray-600">Total Championships</div>
          </div>
        </div>
      </Card_1.default>

      
      <Card_1.default>
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button onClick={() => setActiveTab('tournaments')} className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'tournaments'
            ? 'border-blue-500 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              Tournament Results
            </button>
            <button onClick={() => setActiveTab('matches')} className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'matches'
            ? 'border-blue-500 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              Match History
            </button>
          </nav>
        </div>
        
        <div className="mt-4">
          {activeTab === 'tournaments' ? (<div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tournament Results</h3>
        {resultsLoading ? (<div className="flex items-center justify-center py-8">
            <LoadingSpinner_1.default size="md"/>
            <span className="ml-2 text-gray-500">Loading tournament history...</span>
          </div>) : Array.isArray(results) && results.length > 0 ? (<div className="space-y-3">
            {results.map((result) => {
                    const partner = result.players?.find((p) => p._id !== id);
                    const tournament = result.tournamentId;
                    const getRankIndicatorClass = (rank) => {
                        switch (rank) {
                            case 1: return 'border-l-4 border-yellow-400';
                            case 2: return 'border-l-4 border-gray-400';
                            case 3: return 'border-l-4 border-orange-500';
                            default: return 'border-l-4 border-transparent';
                        }
                    };
                    return (<react_router_dom_1.Link key={result.id} to={`/tournaments/${tournament?.id || tournament?._id}`} className={`block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all ${getRankIndicatorClass(result.totalStats?.finalRank)}`}>
                  <div className="grid grid-cols-3 gap-4 items-center">
                    
                    <div className="col-span-2">
                      <p className="font-medium text-gray-900 hover:text-primary-600 transition-colors">
                        {tournament.name}
                      </p>
                      <div className="text-sm text-gray-600 space-y-1 mt-1">
                        <p>
                          <span className="font-semibold">Date:</span> {new Date(tournament.date).toLocaleDateString()}
                        </p>
                        <p>
                          <span className="font-semibold">Location:</span> {tournament.location}
                        </p>
                        <p>
                          <span className="font-semibold">Format:</span> {tournament.format}
                        </p>
                        {partner && (<p>
                            <span className="font-semibold">Partner:</span> {partner.name}
                          </p>)}
                      </div>
                    </div>

                    
                    <div className="text-right">
                      <p className="font-bold text-lg text-gray-800">
                        Rank: {result.totalStats?.finalRank || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-600">
                        (Seed: {result.seed || 'N/A'})
                      </p>
                      <div className="mt-2">
                        <p className="font-medium text-gray-700">
                          {result.totalStats?.totalWon || 0}W - {result.totalStats?.totalLost || 0}L
                        </p>
                        <p className="text-xs text-gray-500">
                          {result.totalStats.winPercentage != null
                            ? `${(result.totalStats.winPercentage * 100).toFixed(0)}% Win Rate`
                            : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                </react_router_dom_1.Link>);
                })}
          </div>) : (<div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-gray-400 text-xl">🏆</span>
                  </div>
                  <p className="text-gray-500">No tournament history found for this player.</p>
                </div>)}
            </div>) : (<div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Match History</h3>
              {resultsLoading ? (<div className="flex items-center justify-center py-8">
                  <LoadingSpinner_1.default size="md"/>
                  <span className="ml-2 text-gray-500">Loading match history...</span>
                </div>) : Array.isArray(results) && results.length > 0 ? (<div className="space-y-4">
                  {results.map((result) => {
                    const partner = result.players?.find((p) => p._id !== id);
                    const tournament = result.tournamentId;
                    const matches = [];
                    if (result.roundRobinScores) {
                        const rr = result.roundRobinScores;
                        if (rr.round1 > 0)
                            matches.push({ type: 'Round Robin 1', score: rr.round1, isWin: rr.round1 > 10 });
                        if (rr.round2 > 0)
                            matches.push({ type: 'Round Robin 2', score: rr.round2, isWin: rr.round2 > 10 });
                        if (rr.round3 > 0)
                            matches.push({ type: 'Round Robin 3', score: rr.round3, isWin: rr.round3 > 10 });
                    }
                    if (result.bracketScores) {
                        const bracket = result.bracketScores;
                        if (bracket.r16Won > 0 || bracket.r16Lost > 0)
                            matches.push({ type: 'Round of 16', won: bracket.r16Won, lost: bracket.r16Lost });
                        if (bracket.qfWon > 0 || bracket.qfLost > 0)
                            matches.push({ type: 'Quarter Finals', won: bracket.qfWon, lost: bracket.qfLost });
                        if (bracket.sfWon > 0 || bracket.sfLost > 0)
                            matches.push({ type: 'Semi Finals', won: bracket.sfWon, lost: bracket.sfLost });
                        if (bracket.finalsWon > 0 || bracket.finalsLost > 0)
                            matches.push({ type: 'Finals', won: bracket.finalsWon, lost: bracket.finalsLost });
                    }
                    return (<div key={result.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <react_router_dom_1.Link to={`/tournaments/${tournament?.id || tournament?._id}`} className="font-medium text-gray-900 hover:text-blue-600">
                            BOD #{tournament?.bodNumber} - {tournament?.format}
                          </react_router_dom_1.Link>
                          <div className="text-sm text-gray-500">
                            {new Date(tournament?.date).toLocaleDateString()}
                          </div>
                        </div>
                        
                        {partner && (<p className="text-sm text-gray-600 mb-3">
                            <span className="font-medium">Partner:</span> {partner.name}
                          </p>)}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {matches.map((match, idx) => (<div key={idx} className="bg-white rounded p-3 border">
                              <div className="text-sm font-medium text-gray-700">{match.type}</div>
                              {match.score !== undefined ? (<div className={`text-lg font-bold ${match.isWin ? 'text-green-600' : 'text-red-600'}`}>
                                  {match.score} {match.isWin ? 'W' : 'L'}
                                </div>) : (<div className="text-lg font-bold text-gray-700">
                                  {match.won}W - {match.lost}L
                                </div>)}
                            </div>))}
                        </div>
                        
                        {matches.length === 0 && (<p className="text-sm text-gray-500 italic">No detailed match data available</p>)}
                      </div>);
                })}
                </div>) : (<div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-gray-400 text-xl">🎾</span>
                  </div>
                  <p className="text-gray-500">No match history found for this player.</p>
                </div>)}
            </div>)}
        </div>
      </Card_1.default>
    </div>);
};
exports.default = PlayerDetail;
//# sourceMappingURL=PlayerDetail.js.map