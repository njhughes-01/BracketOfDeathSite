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
const AuthContext_1 = require("../contexts/AuthContext");
const usePermissions_1 = require("../hooks/usePermissions");
const LoadingSpinner_1 = __importDefault(require("../components/ui/LoadingSpinner"));
const Card_1 = __importDefault(require("../components/ui/Card"));
const api_1 = __importDefault(require("../services/api"));
const tournamentStatus_1 = require("../utils/tournamentStatus");
const Admin = () => {
    const { isAdmin } = (0, AuthContext_1.useAuth)();
    const { canViewAdmin, canCreateTournaments, canManageUsers } = (0, usePermissions_1.usePermissions)();
    const [tournaments, setTournaments] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        const fetchTournaments = async () => {
            try {
                const response = await api_1.default.getTournaments({
                    sort: '-date',
                    limit: 50
                });
                const tournamentsData = response.docs || response.data || [];
                console.log('Tournaments response:', response);
                console.log('Tournaments data:', tournamentsData);
                setTournaments(tournamentsData);
            }
            catch (err) {
                setError('Failed to load tournaments');
                console.error(err);
            }
            finally {
                setLoading(false);
            }
        };
        if (canViewAdmin) {
            fetchTournaments();
        }
    }, [canViewAdmin]);
    if (!canViewAdmin) {
        return (<div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Card_1.default>
          <div className="text-center py-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600">You need administrative privileges to access this page.</p>
          </div>
        </Card_1.default>
      </div>);
    }
    if (loading) {
        return (<div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center">
          <LoadingSpinner_1.default />
        </div>
      </div>);
    }
    const tournamentsWithStatus = tournaments.map(tournament => ({
        ...tournament,
        actualStatus: (0, tournamentStatus_1.getTournamentStatus)(tournament.date)
    }));
    const groupedTournaments = {
        scheduled: tournamentsWithStatus.filter(t => t.actualStatus === 'scheduled'),
        completed: tournamentsWithStatus.filter(t => t.actualStatus === 'completed'),
    };
    return (<div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Tournament Administration</h1>
        <p className="mt-2 text-gray-600">
          Manage tournaments, players, and match results
        </p>
      </div>

      {error && (<div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600">{error}</p>
        </div>)}

      
      <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card_1.default>
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Tournament</h3>
            {canCreateTournaments ? (<react_router_dom_1.Link to="/tournaments/create" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                New Tournament
              </react_router_dom_1.Link>) : (<p className="text-sm text-gray-500">You don't have permission to create tournaments</p>)}
          </div>
        </Card_1.default>

        <Card_1.default>
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Tournament Statistics</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div>Scheduled: {groupedTournaments.scheduled.length}</div>
              <div>Completed: {groupedTournaments.completed.length}</div>
              <div>Total: {tournaments.length}</div>
            </div>
          </div>
        </Card_1.default>

        <Card_1.default>
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Links</h3>
            <div className="space-y-2">
              <react_router_dom_1.Link to="/players" className="block text-sm text-blue-600 hover:text-blue-800">
                Manage Players
              </react_router_dom_1.Link>
              <react_router_dom_1.Link to="/results" className="block text-sm text-blue-600 hover:text-blue-800">
                View Results
              </react_router_dom_1.Link>
              {canManageUsers && (<react_router_dom_1.Link to="/admin/users" className="block text-sm text-blue-600 hover:text-blue-800">
                  User Management
                </react_router_dom_1.Link>)}
            </div>
          </div>
        </Card_1.default>
      </div>

      
      <div className="space-y-8">
        {Object.entries(groupedTournaments).map(([status, tournamentList]) => (<div key={status}>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 capitalize">
              {status} Tournaments ({tournamentList.length})
            </h2>
            
            {tournamentList.length === 0 ? (<Card_1.default>
                <div className="p-6 text-center text-gray-500">
                  No {status} tournaments
                </div>
              </Card_1.default>) : (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tournamentList.map((tournament) => {
                    const statusInfo = (0, tournamentStatus_1.getStatusDisplayInfo)(tournament.actualStatus);
                    return (<Card_1.default key={tournament._id || tournament.id}>
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-medium text-gray-900">
                            BOD #{tournament.bodNumber}
                          </h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        
                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                          <div><strong>Date:</strong> {new Date(tournament.date).toLocaleDateString()}</div>
                          <div><strong>Format:</strong> {tournament.format}</div>
                          <div><strong>Location:</strong> {tournament.location}</div>
                        </div>

                        <div className="flex space-x-2">
                          <react_router_dom_1.Link to={`/tournaments/${tournament._id || tournament.id}`} className="flex-1 text-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100">
                            View Details
                          </react_router_dom_1.Link>
                          {canViewAdmin && (<react_router_dom_1.Link to={`/tournaments/${tournament._id || tournament.id}/bracket`} className="flex-1 text-center px-3 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-md hover:bg-green-100">
                              View Bracket
                            </react_router_dom_1.Link>)}
                        </div>
                      </div>
                    </Card_1.default>);
                })}
              </div>)}
          </div>))}
      </div>
    </div>);
};
exports.default = Admin;
//# sourceMappingURL=Admin.js.map