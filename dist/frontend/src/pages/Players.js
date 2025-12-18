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
const Players = () => {
    const [page, setPage] = (0, react_1.useState)(1);
    const [search, setSearch] = (0, react_1.useState)('');
    const [filters, setFilters] = (0, react_1.useState)({
        winningPercentage_min: undefined,
        winningPercentage_max: undefined,
        totalChampionships_min: undefined,
        gamesPlayed_min: undefined,
        bodsPlayed_min: undefined,
        bestResult_max: undefined,
        sort: 'name',
    });
    const getPlayers = (0, react_1.useCallback)(() => {
        if (search.trim()) {
            return api_1.default.searchPlayers(search.trim(), {
                page,
                limit: 20,
                ...filters
            });
        }
        else {
            return api_1.default.getPlayers({
                page,
                limit: 20,
                ...filters
            });
        }
    }, [page, filters, search]);
    const { data: players, loading, error, execute } = (0, useApi_1.useApi)(getPlayers, {
        immediate: true,
        dependencies: [page, filters, search]
    });
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: key.includes('_min') || key.includes('_max')
                ? (value === '' ? undefined : key.includes('winningPercentage') ? parseInt(value) / 100 : parseInt(value))
                : value
        }));
        setPage(1);
    };
    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
    };
    return (<div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Players</h1>
          <p className="text-gray-600">Manage player profiles and statistics</p>
        </div>
        <react_router_dom_1.Link to="/players/create" className="btn btn-primary">
          Add Player
        </react_router_dom_1.Link>
      </div>

      
      <Card_1.default>
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Players
              </label>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name..." className="input"/>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Games Played
              </label>
              <input type="number" value={filters.gamesPlayed_min || ''} onChange={(e) => handleFilterChange('gamesPlayed_min', e.target.value)} placeholder="0+" min="0" className="input"/>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min BODs Played
              </label>
              <input type="number" value={filters.bodsPlayed_min || ''} onChange={(e) => handleFilterChange('bodsPlayed_min', e.target.value)} placeholder="0+" min="0" className="input"/>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Win Rate %
              </label>
              <input type="number" value={filters.winningPercentage_min || ''} onChange={(e) => handleFilterChange('winningPercentage_min', e.target.value)} placeholder="0-100" min="0" max="100" className="input"/>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Win Rate %
              </label>
              <input type="number" value={filters.winningPercentage_max || ''} onChange={(e) => handleFilterChange('winningPercentage_max', e.target.value)} placeholder="0-100" min="0" max="100" className="input"/>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Best Finish (1st = 1)
              </label>
              <input type="number" value={filters.bestResult_max || ''} onChange={(e) => handleFilterChange('bestResult_max', e.target.value)} placeholder="1-20" min="1" className="input"/>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <select value={filters.sort} onChange={(e) => handleFilterChange('sort', e.target.value)} className="select">
                <option value="name">Name (A-Z)</option>
                <option value="-name">Name (Z-A)</option>
                <option value="-winningPercentage">Win Rate (High to Low)</option>
                <option value="winningPercentage">Win Rate (Low to High)</option>
                <option value="-gamesPlayed">Games Played (Most to Least)</option>
                <option value="gamesPlayed">Games Played (Least to Most)</option>
                <option value="-totalChampionships">Championships (Most to Least)</option>
                <option value="totalChampionships">Championships (Least to Most)</option>
                <option value="-bodsPlayed">BODs Played (Most to Least)</option>
                <option value="bodsPlayed">BODs Played (Least to Most)</option>
                <option value="bestResult">Best Finish (1st to Last)</option>
                <option value="-avgFinish">Avg Finish (Best to Worst)</option>
                <option value="avgFinish">Avg Finish (Worst to Best)</option>
              </select>
            </div>
          </div>
          
          <button type="submit" className="btn btn-primary">
            Apply Filters
          </button>
        </form>
      </Card_1.default>

      
      <Card_1.default>
        {loading ? (<div className="flex items-center justify-center py-12">
            <LoadingSpinner_1.default size="lg"/>
            <span className="ml-3 text-gray-500">Loading players...</span>
          </div>) : error ? (<div className="text-center py-12">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-500 text-2xl">⚠️</span>
            </div>
            <p className="text-red-600 font-medium mb-2">Error loading players</p>
            <p className="text-gray-500 text-sm">{error}</p>
          </div>) : (players && 'data' in players && Array.isArray(players.data) && players.data.length > 0) ? (<div className="grid grid-cols-1 gap-4">
            {players.data.map((player) => (<div key={player.id || player._id} className="group">
                <Card_1.default variant="hover" padding="md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
                        <span className="text-white font-bold text-lg">
                          {player.name?.split(' ').map((n) => n[0]).join('') || 'P'}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                          {player.name || 'Unknown Player'}
                        </h3>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-sm text-gray-600">
                            BODs: {player.bodsPlayed || 0}
                          </span>
                          <span className="text-sm text-gray-600">
                            Avg: {player.avgFinish ? player.avgFinish.toFixed(1) : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <p className="text-lg font-bold text-gray-900">
                          {((player.winningPercentage || 0) * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Win Rate</p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-lg font-bold text-gray-900">
                          {player.gamesPlayed || 0}
                        </p>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Games</p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-lg font-bold text-gray-900">
                          {player.totalChampionships || 0}
                        </p>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Championships</p>
                      </div>
                      
                      <react_router_dom_1.Link to={`/players/${player.id || player._id}`} className="btn btn-outline btn-sm">
                        View Details
                      </react_router_dom_1.Link>
                    </div>
                  </div>
                </Card_1.default>
              </div>))}
          </div>) : (<div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-gray-400 text-2xl">👥</span>
            </div>
            <p className="text-gray-500 mb-4">No players found</p>
            <react_router_dom_1.Link to="/players/create" className="btn btn-primary">
              Add Your First Player
            </react_router_dom_1.Link>
          </div>)}
      </Card_1.default>

      
      {players && 'pagination' in players && players.pagination && players.pagination.pages > 1 && (<div className="flex items-center justify-center space-x-2">
          <button onClick={() => setPage(page - 1)} disabled={page === 1} className="btn btn-secondary disabled:opacity-50">
            Previous
          </button>
          
          <span className="text-sm text-gray-700">
            Page {page} of {players && 'pagination' in players && players.pagination ? players.pagination.pages : 1}
          </span>
          
          <button onClick={() => setPage(page + 1)} disabled={players && 'pagination' in players ? page === players.pagination.pages : true} className="btn btn-secondary disabled:opacity-50">
            Next
          </button>
        </div>)}
    </div>);
};
exports.default = Players;
//# sourceMappingURL=Players.js.map