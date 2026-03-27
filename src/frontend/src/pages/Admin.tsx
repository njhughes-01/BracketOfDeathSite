import React, { useState, useEffect } from "react";
import logger from "../utils/logger";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import apiClient from "../services/api";
import {
  getTournamentStatus,
  getStatusDisplayInfo,
} from "../utils/tournamentStatus";
import type { Tournament } from "../types/api";
import {
  Container,
  Stack,
  Button,
  Heading,
  Text,
  ResponsiveGrid,
  LoadingSpinner,
  Card,
} from "../components/ui";

const Admin: React.FC = () => {
  const { isAdmin } = useAuth();
  const { canViewAdmin, canCreateTournaments, canManageUsers } =
    usePermissions();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response = await apiClient.getTournaments({
          sort: "-date",
          limit: 50,
        });

        const tournamentsData = response.data || [];
        setTournaments(tournamentsData);
      } catch (err) {
        setError("Failed to load tournaments");
        logger.error(err);
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
        <span className="material-symbols-outlined text-red-500 text-6xl mb-4">
          lock
        </span>
        <Heading level={2}>Access Denied</Heading>
        <Text color="muted" className="max-w-md">
          You need administrative privileges to access this area.
        </Text>
        <Link to="/dashboard" className="mt-6">
          <Button variant="primary">Go Home</Button>
        </Link>
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
  const tournamentsWithStatus = tournaments.map((tournament) => ({
    ...tournament,
    actualStatus: getTournamentStatus(tournament.date),
  }));

  const groupedTournaments = {
    scheduled: tournamentsWithStatus.filter(
      (t) => t.actualStatus === "scheduled",
    ),
    completed: tournamentsWithStatus.filter(
      (t) => t.actualStatus === "completed",
    ),
    active: tournamentsWithStatus.filter((t) => t.actualStatus === "active"),
  };

  return (
    <div className="min-h-screen bg-background-dark pb-20">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background-dark/95 backdrop-blur-md border-b border-white/10">
        <Container padding="md" maxWidth="lg">
          <Stack direction="horizontal" align="center" justify="between" gap={4} className="py-4 sm:py-6">
            <div className="min-w-0">
              <Heading level={1} responsive>
                Admin Dashboard
              </Heading>
              <Text size="sm" color="muted" responsive className="mt-1">
                Manage tournaments, users, and settings
              </Text>
            </div>
            <Link
              to="/dashboard"
              className="shrink-0"
            >
              <Button variant="ghost" icon="close" size="sm" />
            </Link>
          </Stack>
        </Container>
      </div>

      <Container padding="md" maxWidth="lg" className="py-6 sm:py-8">
        <Stack direction="vertical" gap={6}>
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
              <span className="material-symbols-outlined text-red-500">
                error
              </span>
              <Text size="sm" color="error" className="font-bold">{error}</Text>
            </div>
          )}

          {/* Quick Actions Grid */}
          <ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 3 }} gap={6}>
            {/* Manage Players */}
            <Card variant="hover" padding="lg">
              <div className="size-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <span className="material-symbols-outlined text-green-500 text-2xl">
                  groups
                </span>
              </div>
              <Heading level={3} className="mb-2">
                Manage Players
              </Heading>
              <Text size="sm" color="muted" className="mb-4">
                Add new players, edit profiles, and view statistics.
              </Text>
              <Link
                to="/players"
                className="text-green-500 text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all"
              >
                Go to Players{" "}
                <span className="material-symbols-outlined text-sm">
                  arrow_forward
                </span>
              </Link>
            </Card>

            {/* Manage News */}
            <Card variant="hover" padding="lg">
              <div className="size-12 rounded-xl bg-orange-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <span className="material-symbols-outlined text-orange-500 text-2xl">
                  newspaper
                </span>
              </div>
              <Heading level={3} className="mb-2">Manage News</Heading>
              <Text size="sm" color="muted" className="mb-4">
                Post updates, announcements, and match recaps.
              </Text>
              <Link
                to="/news"
                className="text-orange-500 text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all"
              >
                Go to News{" "}
                <span className="material-symbols-outlined text-sm">
                  arrow_forward
                </span>
              </Link>
            </Card>

            {/* Create Tournament */}
            <Card variant="hover" padding="lg">
              <div className="size-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <span className="material-symbols-outlined text-blue-500 text-2xl">
                  add_circle
                </span>
              </div>
              <Heading level={3} className="mb-2">
                New Tournament
              </Heading>
              <Text size="sm" color="muted" className="mb-4">
                Set up a new bracket, configure seeds, and open registration.
              </Text>
              {canCreateTournaments ? (
                <Link
                  to="/tournaments/create"
                  className="text-blue-500 text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all"
                >
                  Start Setup{" "}
                  <span className="material-symbols-outlined text-sm">
                    arrow_forward
                  </span>
                </Link>
              ) : (
                <Text size="xs" color="muted" className="font-bold uppercase">
                  Permission Denied
                </Text>
              )}
            </Card>

            {/* User Management */}
            <Card variant="hover" padding="lg">
              <div className="size-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <span className="material-symbols-outlined text-purple-500 text-2xl">
                  group_add
                </span>
              </div>
              <Heading level={3} className="mb-2">
                User Management
              </Heading>
              <Text size="sm" color="muted" className="mb-4">
                Manage user roles, approvals, and system access.
              </Text>
              {canManageUsers ? (
                <Link
                  to="/admin/users"
                  className="text-purple-500 text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all"
                >
                  Manage Users{" "}
                  <span className="material-symbols-outlined text-sm">
                    arrow_forward
                  </span>
                </Link>
              ) : (
                <Text size="xs" color="muted" className="font-bold uppercase">
                  Permission Denied
                </Text>
              )}
            </Card>

            {/* System Settings */}
            <Card variant="hover" padding="lg">
              <div className="size-12 rounded-xl bg-teal-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <span className="material-symbols-outlined text-teal-500 text-2xl">
                  settings
                </span>
              </div>
              <Heading level={3} className="mb-2">
                System Settings
              </Heading>
              <Text size="sm" color="muted" className="mb-4">
                Configure API keys, integrations (Mailjet), and system globals.
              </Text>
              {isAdmin ? (
                <Link
                  to="/admin/settings"
                  className="text-teal-500 text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all"
                >
                  Configure System{" "}
                  <span className="material-symbols-outlined text-sm">
                    arrow_forward
                  </span>
                </Link>
              ) : (
                <Text size="xs" color="muted" className="font-bold uppercase">
                  Permission Denied
                </Text>
              )}
            </Card>

            {/* Stripe & Payments */}
            <Card variant="hover" padding="lg">
              <div className="size-12 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <span className="material-symbols-outlined text-indigo-500 text-2xl">
                  credit_card
                </span>
              </div>
              <Heading level={3} className="mb-2">
                Stripe & Payments
              </Heading>
              <Text size="sm" color="muted" className="mb-4">
                Configure Stripe, manage pricing, and discount codes.
              </Text>
              {isAdmin ? (
                <Link
                  to="/admin/settings/stripe"
                  className="text-indigo-500 text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all"
                >
                  Configure Stripe{" "}
                  <span className="material-symbols-outlined text-sm">
                    arrow_forward
                  </span>
                </Link>
              ) : (
                <Text size="xs" color="muted" className="font-bold uppercase">
                  Permission Denied
                </Text>
              )}
            </Card>

            {/* System Status / Stats */}
            <Card padding="lg">
              <Text size="sm" className="font-bold text-slate-500 uppercase tracking-wider mb-4">
                System Overview
              </Text>
              <Stack direction="vertical" gap={3}>
                <div className="flex justify-between items-center bg-background-dark p-3 rounded-lg border border-white/5">
                  <Text size="sm" color="muted" className="font-medium">
                    Total Tournaments
                  </Text>
                  <Text size="sm" color="white" className="font-bold">
                    {tournaments.length}
                  </Text>
                </div>
                <div className="flex justify-between items-center bg-background-dark p-3 rounded-lg border border-white/5">
                  <Text size="sm" color="muted" className="font-medium">
                    Completed
                  </Text>
                  <Text size="sm" color="success" className="font-bold">
                    {groupedTournaments.completed.length}
                  </Text>
                </div>
                <div className="flex justify-between items-center bg-background-dark p-3 rounded-lg border border-white/5">
                  <Text size="sm" color="muted" className="font-medium">
                    Scheduled
                  </Text>
                  <Text size="sm" color="accent" className="font-bold">
                    {groupedTournaments.scheduled.length}
                  </Text>
                </div>
              </Stack>
            </Card>
          </ResponsiveGrid>

          {/* Tournaments Lists */}
          <Stack direction="vertical" gap={8}>
            {["active", "scheduled", "completed"].map((status) => {
              const list =
                groupedTournaments[status as keyof typeof groupedTournaments];
              if (!list || list.length === 0) return null;

              return (
                <div key={status}>
                  <Heading level={2} className="mb-4 capitalize flex items-center gap-2">
                    {status} Tournaments{" "}
                    <span className="bg-white/10 text-xs px-2 py-0.5 rounded-full text-slate-400">
                      {list.length}
                    </span>
                  </Heading>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {list.map((tournament) => {
                      const statusInfo = getStatusDisplayInfo(
                        tournament.actualStatus,
                      );
                      return (
                        <Stack
                          key={tournament._id || tournament.id}
                          direction="responsive"
                          align="start"
                          justify="between"
                          gap={4}
                          className="bg-[#1c2230] border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors sm:items-center"
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Text size="lg" color="white" as="span" className="font-bold">
                                BOD #{tournament.bodNumber}
                              </Text>
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${statusInfo.color}`}
                              >
                                {statusInfo.label}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-3">
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">
                                  event
                                </span>{" "}
                                {new Date(tournament.date).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">
                                  location_on
                                </span>{" "}
                                {tournament.location}
                              </span>
                            </div>
                          </div>
                          <Stack direction="horizontal" gap={2} className="w-full sm:w-auto">
                            <Link
                              to={`/tournaments/${tournament._id || tournament.id}/manage`}
                              className="flex-1 sm:flex-none"
                            >
                              <Button variant="secondary" size="sm" fullWidth>
                                Manage
                              </Button>
                            </Link>
                            <Link
                              to={`/tournaments/${tournament._id || tournament.id}`}
                            >
                              <Button variant="ghost" icon="visibility" size="sm" />
                            </Link>
                          </Stack>
                        </Stack>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </Stack>
        </Stack>
      </Container>
    </div>
  );
};

export default Admin;
