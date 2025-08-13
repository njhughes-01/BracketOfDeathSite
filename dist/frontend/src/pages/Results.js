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
const Results = () => {
    const [page, setPage] = (0, react_1.useState)(1);
    const [filters, setFilters] = (0, react_1.useState)({
        tournamentId: '',
        playerId: '',
        division: '',
        year: '',
        sort: '-tournament.date',
    });
    const getTournamentResults = (0, react_1.useCallback)(() => api_1.default.getTournamentResults({
        page,
        limit: 20,
        ...filters
    }), [page, filters]);
    const { data: results, loading, error } = (0, useApi_1.useApi)(getTournamentResults, {
        immediate: true,
        dependencies: [page, filters]
    });
    const getTournaments = (0, react_1.useCallback)(() => api_1.default.getTournaments({ limit: 100 }), []);
    const { data: tournaments } = (0, useApi_1.useApi)(getTournaments, { immediate: true });
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(1);
    };
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };
    const getPlacementColor = (placement) => {
        switch (placement) {
            case 1:
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 2:
                return 'bg-gray-100 text-gray-800 border-gray-200';
            case 3:
                return 'bg-orange-100 text-orange-800 border-orange-200';
            default:
                return 'bg-blue-100 text-blue-800 border-blue-200';
        }
    };
    const getPlacementIcon = (placement) => {
        switch (placement) {
            case 1:
                return '🥇';
            case 2:
                return '🥈';
            case 3:
                return '🥉';
            default:
                return '🏅';
        }
    };
    return (<div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tournament Results</h1>
          <p className="text-gray-600">View player performance and tournament outcomes</p>
        </div>
        <react_router_dom_1.Link to="/tournaments" className="btn btn-primary">
          View Tournaments
        </react_router_dom_1.Link>
      </div>

      
      <Card_1.default>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tournament
            </label>
            <select value={filters.tournamentId} onChange={(e) => handleFilterChange('tournamentId', e.target.value)} className="input">
              <option value="">All Tournaments</option>
              {tournaments && 'data' in tournaments && Array.isArray(tournaments.data) ? tournaments.data.map((tournament) => (<option key={tournament.id} value={tournament.id}>
                  BOD #{tournament.bodNumber} - {tournament.location}
                </option>)) : null}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Year
            </label>
            <select value={filters.year} onChange={(e) => handleFilterChange('year', e.target.value)} className="input">
              <option value="">All Years</option>
              {Array.from({ length: 16 }, (_, i) => 2024 - i).map(year => (<option key={year} value={year}>{year}</option>))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Division
            </label>
            <input type="text" value={filters.division} onChange={(e) => handleFilterChange('division', e.target.value)} placeholder="Filter by division..." className="input"/>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort By
            </label>
            <select value={filters.sort} onChange={(e) => handleFilterChange('sort', e.target.value)} className="input">
              <option value="-tournament.date">Date (Newest First)</option>
              <option value="tournament.date">Date (Oldest First)</option>
              <option value="totalStats.bodFinish">Best Finish First</option>
              <option value="-totalStats.bodFinish">Worst Finish First</option>
              <option value="-totalStats.winPercentage">Win % (High to Low)</option>
              <option value="totalStats.winPercentage">Win % (Low to High)</option>
              <option value="-totalStats.totalWon">Most Games Won</option>
              <option value="tournament.bodNumber">BOD Number</option>
            </select>
          </div>
        </div>
      </Card_1.default>

      
      <Card_1.default>
        {loading ? (<div className="flex items-center justify-center py-12">
            <LoadingSpinner_1.default size="lg"/>
            <span className="ml-3 text-gray-500">Loading results...</span>
          </div>) : error ? (<div className="text-center py-12">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-500 text-2xl">⚠️</span>
            </div>
            <p className="text-red-600 font-medium mb-2">Error loading results</p>
            <p className="text-gray-500 text-sm">{error}</p>
          </div>) : (results && 'data' in results && Array.isArray(results.data) && results.data.length > 0) ? (<div className="space-y-4">
            {results.data.map((result) => (<div key={result.id} className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-16 h-16 rounded-lg flex items-center justify-center border-2 ${getPlacementColor(result.totalStats?.bodFinish || 0)}`}>
                      <span className="text-2xl">
                        {getPlacementIcon(result.totalStats?.bodFinish || 0)}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium text-gray-900">
                          {result.teamName || 'Team'}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPlacementColor(result.totalStats?.bodFinish || 0)}`}>
                          {result.totalStats?.bodFinish === 1 ? 'Champion' :
                    result.totalStats?.bodFinish === 2 ? 'Runner-up' :
                        result.totalStats?.bodFinish === 3 ? 'Third Place' :
                            `${result.totalStats?.bodFinish || 0}th Place`}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Tournament: BOD #{result.tournament?.bodNumber} - {result.tournament?.location}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(result.tournament?.date || result.createdAt)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-8">
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">
                        {result.totalStats?.totalWon || 0}
                      </p>
                      <p className="text-xs text-gray-500">Games Won</p>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">
                        {result.totalStats?.totalPlayed || 0}
                      </p>
                      <p className="text-xs text-gray-500">Games Played</p>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">
                        {result.totalStats?.totalPlayed > 0 ?
                    ((result.totalStats?.totalWon / result.totalStats?.totalPlayed) * 100).toFixed(1) + '%' :
                    '0%'}
                      </p>
                      <p className="text-xs text-gray-500">Win Rate</p>
                    </div>
                    
                    <div className="flex flex-col space-y-2">
                      <react_router_dom_1.Link to={`/tournaments/${result.tournamentId || result.tournament?.id || result.tournament?._id}`} className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                        View Tournament →
                      </react_router_dom_1.Link>
                      <div className="text-sm text-gray-600">
                        {result.division || 'No Division'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>))}
          </div>) : (<div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-gray-400 text-2xl">📊</span>
            </div>
            <p className="text-gray-500 mb-4">No results found</p>
            <react_router_dom_1.Link to="/tournaments" className="btn btn-primary">
              View Tournaments
            </react_router_dom_1.Link>
          </div>)}
      </Card_1.default>

      
      {results && 'data' in results && Array.isArray(results.data) && results.data.length > 0 && (<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card_1.default padding="md">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {results.data.filter((r) => r.totalStats?.bodFinish === 1).length}
              </div>
              <div className="text-sm text-gray-600">Championships</div>
              <div className="text-xs text-gray-400 mt-1">
                {results.pagination?.total ? `${((results.data.filter((r) => r.totalStats?.bodFinish === 1).length / results.pagination.total) * 100).toFixed(1)}%` : '0%'} of results
              </div>
            </div>
          </Card_1.default>
          
          <Card_1.default padding="md">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {results.data.filter((r) => r.totalStats?.bodFinish === 2).length}
              </div>
              <div className="text-sm text-gray-600">Runner-ups</div>
              <div className="text-xs text-gray-400 mt-1">
                {results.pagination?.total ? `${((results.data.filter((r) => r.totalStats?.bodFinish === 2).length / results.pagination.total) * 100).toFixed(1)}%` : '0%'} of results
              </div>
            </div>
          </Card_1.default>
          
          <Card_1.default padding="md">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {results.data.filter((r) => r.totalStats?.bodFinish === 3).length}
              </div>
              <div className="text-sm text-gray-600">Third Places</div>
              <div className="text-xs text-gray-400 mt-1">
                {results.pagination?.total ? `${((results.data.filter((r) => r.totalStats?.bodFinish === 3).length / results.pagination.total) * 100).toFixed(1)}%` : '0%'} of results
              </div>
            </div>
          </Card_1.default>
          
          <Card_1.default padding="md">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {results.data.reduce((sum, r) => sum + (r.totalStats?.totalWon || 0), 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total Games Won</div>
              <div className="text-xs text-gray-400 mt-1">
                Across {results.data.length} team results
              </div>
            </div>
          </Card_1.default>
        </div>)}

      
      {results && 'pagination' in results && results.pagination && results.pagination.pages > 1 && (<div className="flex items-center justify-center space-x-2">
          <button onClick={() => setPage(page - 1)} disabled={page === 1} className="btn btn-secondary disabled:opacity-50">
            Previous
          </button>
          
          <span className="text-sm text-gray-700">
            Page {page} of {results && 'pagination' in results && results.pagination ? results.pagination.pages : 1}
          </span>
          
          <button onClick={() => setPage(page + 1)} disabled={results && 'pagination' in results ? page === results.pagination.pages : true} className="btn btn-secondary disabled:opacity-50">
            Next
          </button>
        </div>)}
    </div>);
};
exports.default = Results;
//# sourceMappingURL=Results.js.map