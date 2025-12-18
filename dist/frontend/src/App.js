"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_router_dom_1 = require("react-router-dom");
const AuthContext_1 = require("./contexts/AuthContext");
const Layout_1 = __importDefault(require("./components/layout/Layout"));
const ProtectedRoute_1 = __importDefault(require("./components/common/ProtectedRoute"));
const user_1 = require("./types/user");
const Home_1 = __importDefault(require("./pages/Home"));
const Login_1 = __importDefault(require("./pages/Login"));
const Players_1 = __importDefault(require("./pages/Players"));
const PlayerCreate_1 = __importDefault(require("./pages/PlayerCreate"));
const PlayerDetail_1 = __importDefault(require("./pages/PlayerDetail"));
const Tournaments_1 = __importDefault(require("./pages/Tournaments"));
const TournamentCreate_1 = __importDefault(require("./pages/TournamentCreate"));
const TournamentSetup_1 = __importDefault(require("./pages/TournamentSetup"));
const TournamentDetail_1 = __importDefault(require("./pages/TournamentDetail"));
const TournamentManage_1 = __importDefault(require("./pages/TournamentManage"));
const Results_1 = __importDefault(require("./pages/Results"));
const Admin_1 = __importDefault(require("./pages/Admin"));
const UserManagement_1 = __importDefault(require("./pages/UserManagement"));
const NotFound_1 = __importDefault(require("./pages/NotFound"));
function App() {
    return (<AuthContext_1.AuthProvider>
      <react_router_dom_1.BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <Layout_1.default>
            <react_router_dom_1.Routes>
              <react_router_dom_1.Route path="/" element={<Home_1.default />}/>
              <react_router_dom_1.Route path="/login" element={<Login_1.default />}/>
              <react_router_dom_1.Route path="/players" element={<Players_1.default />}/>
              <react_router_dom_1.Route path="/players/:id" element={<PlayerDetail_1.default />}/>
              <react_router_dom_1.Route path="/tournaments" element={<Tournaments_1.default />}/>
              <react_router_dom_1.Route path="/tournaments/:id" element={<TournamentDetail_1.default />}/>
              <react_router_dom_1.Route path="/tournaments/:id/bracket" element={<TournamentDetail_1.default />}/>
              <react_router_dom_1.Route path="/results" element={<Results_1.default />}/>
              
              
              <react_router_dom_1.Route path="/players/create" element={<ProtectedRoute_1.default requirePermission={user_1.PERMISSIONS.PLAYER_CREATE}>
                    <PlayerCreate_1.default />
                  </ProtectedRoute_1.default>}/>
              <react_router_dom_1.Route path="/tournaments/create" element={<ProtectedRoute_1.default requirePermission={user_1.PERMISSIONS.TOURNAMENT_CREATE}>
                    <TournamentCreate_1.default />
                  </ProtectedRoute_1.default>}/>
              <react_router_dom_1.Route path="/tournaments/setup" element={<ProtectedRoute_1.default requirePermission={user_1.PERMISSIONS.TOURNAMENT_CREATE}>
                    <TournamentSetup_1.default />
                  </ProtectedRoute_1.default>}/>
              <react_router_dom_1.Route path="/tournaments/:id/manage" element={<ProtectedRoute_1.default requirePermission={user_1.PERMISSIONS.TOURNAMENT_CREATE}>
                    <TournamentManage_1.default />
                  </ProtectedRoute_1.default>}/>
              
              
              <react_router_dom_1.Route path="/admin" element={<ProtectedRoute_1.default requireAnyPermission={[user_1.PERMISSIONS.USER_VIEW, user_1.PERMISSIONS.SYSTEM_ADMIN]}>
                    <Admin_1.default />
                  </ProtectedRoute_1.default>}/>
              <react_router_dom_1.Route path="/admin/users" element={<ProtectedRoute_1.default requirePermission={user_1.PERMISSIONS.USER_MANAGE_ROLES}>
                    <UserManagement_1.default />
                  </ProtectedRoute_1.default>}/>
              
              <react_router_dom_1.Route path="*" element={<NotFound_1.default />}/>
            </react_router_dom_1.Routes>
          </Layout_1.default>
        </div>
      </react_router_dom_1.BrowserRouter>
    </AuthContext_1.AuthProvider>);
}
exports.default = App;
//# sourceMappingURL=App.js.map