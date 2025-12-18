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
const StatCard_1 = __importDefault(require("../components/ui/StatCard"));
const Card_1 = __importDefault(require("../components/ui/Card"));
const LoadingSpinner_1 = __importDefault(require("../components/ui/LoadingSpinner"));
const Home = () => {
    const getPlayerStats = (0, react_1.useCallback)(() => api_1.default.getPlayerStats(), []);
    const getTournamentStats = (0, react_1.useCallback)(() => api_1.default.getTournamentStats(), []);
    const getRecentTournaments = (0, react_1.useCallback)(() => api_1.default.getRecentTournaments(5), []);
    const { data: playerStats, loading: playersLoading } = (0, useApi_1.useApi)(getPlayerStats, { immediate: true });
    const { data: tournamentStats, loading: tournamentsLoading } = (0, useApi_1.useApi)(getTournamentStats, { immediate: true });
    const { data: recentTournaments, loading: recentLoading } = (0, useApi_1.useApi)(getRecentTournaments, { immediate: true });
    return (<div className="space-y-8">
      
      <div className="text-center">
        <h2 className="text-4xl font-bold text-gray-900 sm:text-5xl">
          Welcome to the <span className="text-gradient">Bracket of Death</span>
        </h2>
        <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
          Track tennis tournament scores, player statistics, and championship results
          for the premier doubles tennis tournament series.
        </p>
      </div>

      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard_1.default title="Players" value={playerStats?.overview?.totalPlayers || 0} icon="👥" iconColor="bg-blue-100 text-blue-600" linkTo="/players" linkText="View all players" loading={playersLoading}/>
        
        <StatCard_1.default title="Tournaments" value={tournamentStats?.overview?.totalTournaments || 0} icon="🏆" iconColor="bg-green-100 text-green-600" linkTo="/tournaments" linkText="View tournaments" loading={tournamentsLoading}/>
        
        <StatCard_1.default title="Results" value={`${playerStats?.overview?.totalPlayers || 0} Teams`} icon="📊" iconColor="bg-purple-100 text-purple-600" linkTo="/results" linkText="View results" loading={playersLoading}/>
      </div>

      
      <Card_1.default>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Recent Tournaments</h3>
          <react_router_dom_1.Link to="/tournaments" className="btn btn-secondary btn-sm">
            View All
          </react_router_dom_1.Link>
        </div>
        
        {recentLoading ? (<div className="flex items-center justify-center py-12">
            <LoadingSpinner_1.default size="lg"/>
            <span className="ml-3 text-gray-500">Loading tournaments...</span>
          </div>) : recentTournaments && Array.isArray(recentTournaments) && recentTournaments.length > 0 ? (<div className="space-y-3">
            {recentTournaments.map((tournament) => (<div key={tournament.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200">
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
                        'badge-success'}`}>
                      BOD #{tournament.bodNumber}
                    </span>
                  </div>
                  <react_router_dom_1.Link to={`/tournaments/${tournament.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors duration-200">
                    View details →
                  </react_router_dom_1.Link>
                </div>
              </div>))}
          </div>) : (<div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-gray-400 text-2xl">🏆</span>
            </div>
            <p className="text-gray-500 mb-4">No tournaments found</p>
            <react_router_dom_1.Link to="/tournaments" className="btn btn-primary">
              Add the first tournament
            </react_router_dom_1.Link>
          </div>)}
      </Card_1.default>

      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <react_router_dom_1.Link to="/players">
          <Card_1.default variant="hover" padding="md">
            <div className="text-center">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <span className="text-white text-2xl">👥</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Manage Players</h3>
              <p className="text-sm text-gray-600">View and manage player profiles</p>
            </div>
          </Card_1.default>
        </react_router_dom_1.Link>

        <react_router_dom_1.Link to="/tournaments">
          <Card_1.default variant="hover" padding="md">
            <div className="text-center">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <span className="text-white text-2xl">🏆</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Tournaments</h3>
              <p className="text-sm text-gray-600">Create and manage tournaments</p>
            </div>
          </Card_1.default>
        </react_router_dom_1.Link>

        <react_router_dom_1.Link to="/results">
          <Card_1.default variant="hover" padding="md">
            <div className="text-center">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <span className="text-white text-2xl">📊</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Results</h3>
              <p className="text-sm text-gray-600">View tournament results and stats</p>
            </div>
          </Card_1.default>
        </react_router_dom_1.Link>

        <div className="cursor-pointer">
          <Card_1.default variant="hover" padding="md">
            <div className="text-center">
              <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <span className="text-white text-2xl">📈</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Analytics</h3>
              <p className="text-sm text-gray-600">Player performance analysis</p>
            </div>
          </Card_1.default>
        </div>
      </div>
    </div>);
};
exports.default = Home;
//# sourceMappingURL=Home.js.map