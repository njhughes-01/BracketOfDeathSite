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
const PlayerCreate = () => {
    const navigate = (0, react_router_dom_1.useNavigate)();
    const [formData, setFormData] = (0, react_1.useState)({
        name: '',
        bodsPlayed: 0,
        bestResult: 0,
        avgFinish: 0,
        gamesPlayed: 0,
        gamesWon: 0,
        winningPercentage: 0,
        individualChampionships: 0,
        divisionChampionships: 0,
        totalChampionships: 0,
        pairing: '',
    });
    const { mutate: createPlayer, loading, error } = (0, useApi_1.useMutation)((data) => api_1.default.createPlayer(data), {
        onSuccess: (data) => {
            navigate('/players');
        },
        onError: (error) => {
            console.error('Failed to create player:', error);
        }
    });
    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? (value === '' ? 0 : parseFloat(value)) : value
        }));
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        createPlayer(formData);
    };
    return (<div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Player</h1>
          <p className="text-gray-600">Add a new player to the tournament system</p>
        </div>
        <button onClick={() => navigate('/players')} className="btn btn-secondary">
          Cancel
        </button>
      </div>

      <Card_1.default>
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Player Name *
                </label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required className="input" placeholder="Enter player name"/>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pairing Partner
                </label>
                <input type="text" name="pairing" value={formData.pairing || ''} onChange={handleChange} className="input" placeholder="Enter partner name"/>
              </div>
            </div>
          </div>

          
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tournament Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  BODs Played
                </label>
                <input type="number" name="bodsPlayed" value={formData.bodsPlayed} onChange={handleChange} min="0" className="input"/>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Best Result
                </label>
                <input type="number" name="bestResult" value={formData.bestResult} onChange={handleChange} min="0" className="input"/>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Average Finish
                </label>
                <input type="number" name="avgFinish" value={formData.avgFinish} onChange={handleChange} min="0" step="0.1" className="input"/>
              </div>
            </div>
          </div>

          
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Game Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Games Played
                </label>
                <input type="number" name="gamesPlayed" value={formData.gamesPlayed} onChange={handleChange} min="0" className="input"/>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Games Won
                </label>
                <input type="number" name="gamesWon" value={formData.gamesWon} onChange={handleChange} min="0" className="input"/>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Winning Percentage
                </label>
                <input type="number" name="winningPercentage" value={formData.winningPercentage} onChange={handleChange} min="0" max="1" step="0.01" className="input" placeholder="0.00 - 1.00"/>
              </div>
            </div>
          </div>

          
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Championships</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Individual Championships
                </label>
                <input type="number" name="individualChampionships" value={formData.individualChampionships} onChange={handleChange} min="0" className="input"/>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Division Championships
                </label>
                <input type="number" name="divisionChampionships" value={formData.divisionChampionships} onChange={handleChange} min="0" className="input"/>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Championships
                </label>
                <input type="number" name="totalChampionships" value={formData.totalChampionships} onChange={handleChange} min="0" className="input"/>
              </div>
            </div>
          </div>

          
          {error && (<div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-red-500 text-xl">⚠️</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error creating player</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>)}

          
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <button type="button" onClick={() => navigate('/players')} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading || !formData.name.trim()} className="btn btn-primary disabled:opacity-50">
              {loading ? (<>
                  <LoadingSpinner_1.default size="sm"/>
                  <span className="ml-2">Creating...</span>
                </>) : ('Create Player')}
            </button>
          </div>
        </form>
      </Card_1.default>
    </div>);
};
exports.default = PlayerCreate;
//# sourceMappingURL=PlayerCreate.js.map