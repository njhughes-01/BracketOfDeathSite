import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import apiClient from '../services/api';
import { getTournamentStatus, getStatusDisplayInfo } from '../utils/tournamentStatus';
import type { Tournament } from '../types/api';

const Admin: React.FC = () => {
  const { isAdmin } = useAuth();
  const { canViewAdmin, canCreateTournaments, canManageUsers } = usePermissions();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response = await apiClient.getTournaments({
          sort: '-date',
          limit: 50
        });

        const tournamentsData = response.data || [];
        setTournaments(tournamentsData);
      } catch (err) {
        setError('Failed to load tournaments');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (canViewAdmin) {
      fetchTournaments();
    }
  }, [canViewAdmin]);

  if (!canViewAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background-dark p-4 text-center">
        <span className="material-symbols-outlined text-red-500 text-6xl mb-4">lock</span>
        <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-slate-400 max-w-md">You need administrative privileges to access this area.</p>
        <Link to="/" className="mt-6 btn btn-primary">Go Home</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background-dark">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Use date-based status instead of database status
  const tournamentsWithStatus = tournaments.map(tournament => ({
    ...tournament,
    actualStatus: getTournamentStatus(tournament.date)
  }));

  const groupedTournaments = {
    scheduled: tournamentsWithStatus.filter(t => t.actualStatus === 'scheduled'),
    completed: tournamentsWithStatus.filter(t => t.actualStatus === 'completed'),
    active: tournamentsWithStatus.filter(t => t.actualStatus === 'active'),
  };

  return (
    <div className="min-h-screen bg-background-dark pb-20">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-background-dark/95 backdrop-blur-md border-b border-white/10 px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Admin Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">Manage tournaments, users, and settings</p>
          </div>
          <Link to="/" className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-white">close</span>
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
            <span className="material-symbols-outlined text-red-500">error</span>
            <p className="text-red-400 text-sm font-bold">{error}</p>
          </div>
        )}

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Manage Players */}
          <div className="bg-[#1c2230] p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-all group">
            <div className="size-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <span className="material-symbols-outlined text-green-500 text-2xl">groups</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Manage Players</h3>
            <p className="text-slate-400 text-sm mb-4">Add new players, edit profiles, and view statistics.</p>
            <Link to="/players" className="text-green-500 text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all">
              Go to Players <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>

          {/* Manage News */}
          <div className="bg-[#1c2230] p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-all group">
            <div className="size-12 rounded-xl bg-orange-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <span className="material-symbols-outlined text-orange-500 text-2xl">newspaper</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Manage News</h3>
            <p className="text-slate-400 text-sm mb-4">Post updates, announcements, and match recaps.</p>
            <Link to="/news" className="text-orange-500 text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all">
              Go to News <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>

          {/* Create Tournament */}
          <div className="bg-[#1c2230] p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-all group">
            <div className="size-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <span className="material-symbols-outlined text-blue-500 text-2xl">add_circle</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">New Tournament</h3>
            <p className="text-slate-400 text-sm mb-4">Set up a new bracket, configure seeds, and open registration.</p>
            {canCreateTournaments ? (
              <Link to="/tournaments/create" className="text-blue-500 text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all">
                Start Setup <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            ) : (
              <span className="text-slate-600 text-xs font-bold uppercase">Permission Denied</span>
            )}
          </div>

          {/* User Management */}
          <div className="bg-[#1c2230] p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-all group">
            <div className="size-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <span className="material-symbols-outlined text-purple-500 text-2xl">group_add</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">User Management</h3>
            <p className="text-slate-400 text-sm mb-4">Manage user roles, approvals, and system access.</p>
            {canManageUsers ? (
              <Link to="/admin/users" className="text-purple-500 text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all">
                Manage Users <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            ) : (
              <span className="text-slate-600 text-xs font-bold uppercase">Permission Denied</span>
            )}
          </div>


          {/* System Settings */}
          <div className="bg-[#1c2230] p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-all group">
            <div className="size-12 rounded-xl bg-teal-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <span className="material-symbols-outlined text-teal-500 text-2xl">settings</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">System Settings</h3>
            <p className="text-slate-400 text-sm mb-4">Configure API keys, integrations (Mailjet), and system globals.</p>
            {isAdmin ? (
              <Link to="/admin/settings" className="text-teal-500 text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all">
                Configure System <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            ) : (
              <span className="text-slate-600 text-xs font-bold uppercase">Permission Denied</span>
            )}
          </div>

          {/* System Status / Stats */}
          <div className="bg-[#1c2230] p-6 rounded-2xl border border-white/5">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">System Overview</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-background-dark p-3 rounded-lg border border-white/5">
                <span className="text-slate-400 text-sm font-medium">Total Tournaments</span>
                <span className="text-white font-bold">{tournaments.length}</span>
              </div>
              <div className="flex justify-between items-center bg-background-dark p-3 rounded-lg border border-white/5">
                <span className="text-slate-400 text-sm font-medium">Completed</span>
                <span className="text-green-500 font-bold">{groupedTournaments.completed.length}</span>
              </div>
              <div className="flex justify-between items-center bg-background-dark p-3 rounded-lg border border-white/5">
                <span className="text-slate-400 text-sm font-medium">Scheduled</span>
                <span className="text-blue-500 font-bold">{groupedTournaments.scheduled.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tournaments Lists */}
        {/* We reuse the same loop structure */}
        <div className="space-y-8">
          {['active', 'scheduled', 'completed'].map((status) => {
            const list = groupedTournaments[status as keyof typeof groupedTournaments];
            if (!list || list.length === 0) return null;

            return (
              <div key={status}>
                <h2 className="text-xl font-bold text-white mb-4 capitalize flex items-center gap-2">
                  {status} Tournaments <span className="bg-white/10 text-xs px-2 py-0.5 rounded-full text-slate-400">{list.length}</span>
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {list.map(tournament => {
                    const statusInfo = getStatusDisplayInfo(tournament.actualStatus);
                    return (
                      <div key={tournament._id || tournament.id} className="bg-[#1c2230] border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-white/10 transition-colors">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg font-bold text-white">BOD #{tournament.bodNumber}</span>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${statusInfo.color}`}>{statusInfo.label}</span>
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-3">
                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">event</span> {new Date(tournament.date).toLocaleDateString()}</span>
                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">location_on</span> {tournament.location}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <Link to={`/tournaments/${tournament._id || tournament.id}/manage`} className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-white/5 text-white text-sm font-bold hover:bg-white/10 transition-colors text-center">
                            Manage
                          </Link>
                          <Link to={`/tournaments/${tournament._id || tournament.id}`} className="size-9 flex items-center justify-center rounded-lg border border-white/10 hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
                            <span className="material-symbols-outlined text-[20px]">visibility</span>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Admin;