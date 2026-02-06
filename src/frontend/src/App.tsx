import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Layout from "./components/layout/Layout";
import ProtectedRoute from "./components/common/ProtectedRoute";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { PERMISSIONS } from "./types/user";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import Players from "./pages/Players";
import PlayerCreate from "./pages/PlayerCreate";
import PlayerEdit from "./pages/PlayerEdit";
import PlayerDetail from "./pages/PlayerDetail";
import Tournaments from "./pages/Tournaments";
import TournamentSetup from "./pages/TournamentSetup";
import TournamentDetail from "./pages/TournamentDetail";
import TournamentEdit from "./pages/TournamentEdit";
import TournamentManage from "./pages/TournamentManage";
import Results from "./pages/Results";
import Rankings from "./pages/Rankings";
import News from "./pages/News";
import Admin from "./pages/Admin";
import SettingsPage from "./pages/admin/Settings";
import UserManagement from "./pages/UserManagement";
import NotFound from "./pages/NotFound";
import Setup from "./pages/Setup";

import RequireProfile from "./components/RequireProfile";
import Onboarding from "./pages/Onboarding";
import OpenTournaments from "./pages/OpenTournaments";

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Layout>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/setup" element={<Setup />} />
              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute>
                    <Onboarding />
                  </ProtectedRoute>
                }
              />
              <Route path="/open-tournaments" element={<OpenTournaments />} />

              {/* Profile Required Routes */}
              <Route element={<RequireProfile />}>
                <Route path="/" element={<Home />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/players" element={<Players />} />
                <Route path="/players/:id" element={<PlayerDetail />} />
                <Route path="/tournaments" element={<Tournaments />} />
                <Route path="/tournaments/:id" element={<TournamentDetail />} />
                <Route
                  path="/tournaments/:id/bracket"
                  element={<TournamentDetail />}
                />
                <Route path="/results" element={<Results />} />
                <Route path="/rankings" element={<Rankings />} />
                <Route path="/news" element={<News />} />

                {/* Protected Routes - require authentication & permissions */}
                <Route
                  path="/players/create"
                  element={
                    <ProtectedRoute
                      requirePermission={PERMISSIONS.PLAYER_CREATE}
                    >
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
                  path="/tournaments/setup"
                  element={
                    <ProtectedRoute
                      requirePermission={PERMISSIONS.TOURNAMENT_CREATE}
                    >
                      <TournamentSetup />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tournaments/create"
                  element={
                    <ProtectedRoute
                      requirePermission={PERMISSIONS.TOURNAMENT_CREATE}
                    >
                      <TournamentSetup />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tournaments/:id/edit"
                  element={
                    <ProtectedRoute
                      requirePermission={PERMISSIONS.TOURNAMENT_EDIT}
                    >
                      <TournamentEdit />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tournaments/:id/manage"
                  element={
                    <ProtectedRoute
                      requirePermission={PERMISSIONS.TOURNAMENT_CREATE}
                    >
                      <TournamentManage />
                    </ProtectedRoute>
                  }
                />

                {/* Admin Routes */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute
                      requireAnyPermission={[
                        PERMISSIONS.USER_VIEW,
                        PERMISSIONS.SYSTEM_ADMIN,
                      ]}
                    >
                      <Admin />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <ProtectedRoute
                      requirePermission={PERMISSIONS.USER_MANAGE_ROLES}
                    >
                      <UserManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/settings"
                  element={
                    <ProtectedRoute
                      requirePermission={PERMISSIONS.SYSTEM_MANAGE_SETTINGS}
                    >
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </div>
      </Router>
    </AuthProvider>
  </ErrorBoundary>
  );
}

export default App;
