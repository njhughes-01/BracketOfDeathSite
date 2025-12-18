import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';
import { PERMISSIONS } from './types/user';
import Home from './pages/Home';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Players from './pages/Players';
import PlayerCreate from './pages/PlayerCreate';
import PlayerEdit from './pages/PlayerEdit';
import PlayerDetail from './pages/PlayerDetail';
import Tournaments from './pages/Tournaments';
import TournamentCreate from './pages/TournamentCreate';
import TournamentSetup from './pages/TournamentSetup';
import TournamentDetail from './pages/TournamentDetail';
import TournamentEdit from './pages/TournamentEdit';
import TournamentManage from './pages/TournamentManage';
import Results from './pages/Results';
import Rankings from './pages/Rankings';
import News from './pages/News';
import Admin from './pages/Admin';
import UserManagement from './pages/UserManagement';
import NotFound from './pages/NotFound';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/players" element={<Players />} />
              <Route path="/players/:id" element={<PlayerDetail />} />
              <Route path="/tournaments" element={<Tournaments />} />
              <Route path="/tournaments/:id" element={<TournamentDetail />} />
              <Route path="/tournaments/:id/bracket" element={<TournamentDetail />} />
              <Route path="/results" element={<Results />} />
              <Route path="/rankings" element={<Rankings />} />
              <Route path="/news" element={<News />} />

              {/* Protected Routes - require authentication */}
              <Route
                path="/players/create"
                element={
                  <ProtectedRoute requirePermission={PERMISSIONS.PLAYER_CREATE}>
                    <PlayerCreate />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/players/:id/edit"
                element={
                  <ProtectedRoute requirePermission={PERMISSIONS.PLAYER_EDIT}>
                    <PlayerEdit />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tournaments/create"
                element={
                  <ProtectedRoute requirePermission={PERMISSIONS.TOURNAMENT_CREATE}>
                    <TournamentCreate />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tournaments/setup"
                element={
                  <ProtectedRoute requirePermission={PERMISSIONS.TOURNAMENT_CREATE}>
                    <TournamentSetup />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tournaments/:id/edit"
                element={
                  <ProtectedRoute requirePermission={PERMISSIONS.TOURNAMENT_EDIT}>
                    <TournamentEdit />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tournaments/:id/manage"
                element={
                  <ProtectedRoute requirePermission={PERMISSIONS.TOURNAMENT_CREATE}>
                    <TournamentManage />
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requireAnyPermission={[PERMISSIONS.USER_VIEW, PERMISSIONS.SYSTEM_ADMIN]}>
                    <Admin />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute requirePermission={PERMISSIONS.USER_MANAGE_ROLES}>
                    <UserManagement />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;