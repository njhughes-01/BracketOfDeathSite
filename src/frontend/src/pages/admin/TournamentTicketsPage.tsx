import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import logger from '../../utils/logger';
import apiClient from '../../services/api';
import { Heading, Text, Button, Stack, Container, ResponsiveGrid, Input, ResponsiveTable } from '../../components/ui';
import type { Column } from '../../components/ui/data/ResponsiveTable';

interface TicketEntry {
  id: string;
  ticketCode: string;
  playerName: string;
  playerEmail?: string;
  teamName?: string;
  status: 'valid' | 'checked_in' | 'refunded' | 'void';
  paymentStatus: 'paid' | 'free' | 'refunded';
  amountPaid: number;
  createdAt: string;
  checkedInAt?: string;
}

interface TicketStats {
  total: number;
  revenue: number;
  refunded: number;
  checkedIn: number;
  valid: number;
  void: number;
}

interface ConfirmAction {
  type: 'refund' | 'remove' | 'checkin';
  ticket: TicketEntry;
}

const statusConfig = {
  valid: { color: 'bg-green-500/10 text-green-500 border-green-500/20', label: 'Valid' },
  checked_in: { color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', label: 'Checked In' },
  refunded: { color: 'bg-red-500/10 text-red-500 border-red-500/20', label: 'Refunded' },
  void: { color: 'bg-slate-500/10 text-slate-500 border-slate-500/20', label: 'Void' },
};

const TournamentTicketsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [tickets, setTickets] = useState<TicketEntry[]>([]);
  const [stats, setStats] = useState<TicketStats>({ total: 0, revenue: 0, refunded: 0, checkedIn: 0, valid: 0, void: 0 });
  const [tournamentName, setTournamentName] = useState('');
  const [isTeamEvent, setIsTeamEvent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);

      const [txResponse, tournamentResponse] = await Promise.all([
        apiClient.getTournamentTransactions(id, { status: statusFilter, search }),
        apiClient.getTournament(id),
      ]);

      if (txResponse.success && txResponse.data) {
        setTickets(txResponse.data.tickets || []);
        setStats(txResponse.data.stats || { total: 0, revenue: 0, refunded: 0, checkedIn: 0, valid: 0, void: 0 });
      }

      if (tournamentResponse.success && tournamentResponse.data) {
        const t = tournamentResponse.data;
        setTournamentName(t.name || '');
        const type = (t as any).tournamentType || '';
        setIsTeamEvent(type.toLowerCase().includes('doubles') || type.toLowerCase().includes('mixed'));
      }
    } catch (err) {
      logger.error('Failed to fetch tournament tickets', err);
      setError('Failed to load ticket data.');
    } finally {
      setLoading(false);
    }
  }, [id, statusFilter, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Debounce search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const formatAmount = (cents: number) =>
    cents === 0 ? 'Free' : `$${(cents / 100).toFixed(2)}`;

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const handleAction = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      const { type, ticket } = confirmAction;
      if (type === 'refund') {
        await apiClient.refundTicket(ticket.id, ticket.amountPaid);
      } else if (type === 'remove') {
        await apiClient.removeTicket(ticket.id);
      } else if (type === 'checkin') {
        await apiClient.checkInTicket(ticket.id);
      }
      setConfirmAction(null);
      await fetchData();
    } catch (err: any) {
      logger.error('Ticket action failed', err);
      setError(err.response?.data?.error || 'Action failed. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const statCards = [
    { label: 'Total Tickets', value: stats.total, icon: 'confirmation_number', color: 'text-primary' },
    { label: 'Revenue', value: formatAmount(stats.revenue), icon: 'payments', color: 'text-green-500' },
    { label: 'Refunds', value: stats.refunded, icon: 'undo', color: 'text-red-500' },
    { label: 'Checked In', value: stats.checkedIn, icon: 'login', color: 'text-yellow-500' },
  ];

  const filters = ['all', 'valid', 'checked_in', 'refunded', 'void'];

  const columns: Column<TicketEntry>[] = [
    {
      key: 'playerName',
      label: 'Player',
      render: (ticket) => (
        <div>
          <Text as="span" size="sm" color="white" className="font-bold">{ticket.playerName}</Text>
          {ticket.playerEmail && <Text as="span" size="xs" color="muted" className="block">{ticket.playerEmail}</Text>}
        </div>
      ),
    },
    {
      key: 'ticketCode',
      label: 'Ticket Code',
      render: (ticket) => (
        <span className="font-mono text-sm text-primary font-bold">{ticket.ticketCode}</span>
      ),
    },
    ...(isTeamEvent ? [{
      key: 'teamName' as keyof TicketEntry,
      label: 'Team',
      hideOnMobile: true as const,
      render: (ticket: TicketEntry) => (
        <Text as="span" size="sm" color="muted" className="text-slate-300">{ticket.teamName || '—'}</Text>
      ),
    }] : []),
    {
      key: 'status',
      label: 'Status',
      render: (ticket) => {
        const config = statusConfig[ticket.status];
        return (
          <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${config.color}`}>
            {config.label}
          </span>
        );
      },
    },
    {
      key: 'paymentStatus',
      label: 'Payment',
      hideOnMobile: true,
      render: (ticket) => (
        <Text as="span" size="sm" color="muted" className="capitalize text-slate-300">{ticket.paymentStatus}</Text>
      ),
    },
    {
      key: 'amountPaid',
      label: 'Amount',
      hideOnMobile: true,
      className: 'text-right',
      render: (ticket) => (
        <Text as="span" size="sm" color="white" className="font-bold">{formatAmount(ticket.amountPaid)}</Text>
      ),
    },
    {
      key: 'createdAt',
      label: 'Date',
      hideOnMobile: true,
      render: (ticket) => (
        <Text as="span" size="sm" color="muted">{formatDate(ticket.createdAt)}</Text>
      ),
    },
  ];

  const renderMobileCard = (ticket: TicketEntry) => {
    const config = statusConfig[ticket.status];
    return (
      <div className="bg-[#1c2230] rounded-xl border border-white/5 p-4">
        <Stack direction="horizontal" justify="between" gap={3} className="mb-3">
          <div>
            <Text as="span" size="sm" color="white" className="font-bold block">{ticket.playerName}</Text>
            <Text as="span" size="xs" className="font-mono text-primary mt-0.5 block">{ticket.ticketCode}</Text>
          </div>
          <span className={`px-2 py-1 rounded-full text-[10px] font-bold border shrink-0 h-fit ${config.color}`}>
            {config.label}
          </span>
        </Stack>
        <Stack direction="horizontal" justify="between" className="text-xs text-slate-400">
          <Text as="span" size="xs" color="muted">{formatAmount(ticket.amountPaid)} · {ticket.paymentStatus}</Text>
          <Text as="span" size="xs" color="muted">{formatDate(ticket.createdAt)}</Text>
        </Stack>
        {isTeamEvent && ticket.teamName && (
          <Text size="xs" color="muted" className="mt-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">group</span>
            {ticket.teamName}
          </Text>
        )}
        {ticket.status === 'valid' && (
          <Stack direction="horizontal" gap={2} className="mt-3 pt-3 border-t border-white/5">
            <Button
              variant="ghost"
              size="sm"
              icon="login"
              onClick={() => setConfirmAction({ type: 'checkin', ticket })}
              className="flex-1 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20"
            >
              Check In
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon="undo"
              onClick={() => setConfirmAction({ type: 'refund', ticket })}
              className="flex-1 text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20"
            >
              Refund
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon="person_remove"
              onClick={() => setConfirmAction({ type: 'remove', ticket })}
              className="flex-1 text-red-400 bg-red-500/10 hover:bg-red-500/20"
            >
              Remove
            </Button>
          </Stack>
        )}
      </div>
    );
  };

  const renderActions = (ticket: TicketEntry) => {
    if (ticket.status === 'checked_in') {
      return <Text as="span" size="xs" color="muted">Checked in</Text>;
    }
    if (ticket.status !== 'valid') return null;
    return (
      <Stack direction="horizontal" gap={1} justify="end">
        <button
          onClick={() => setConfirmAction({ type: 'checkin', ticket })}
          className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors"
          title="Check In"
        >
          <span className="material-symbols-outlined text-[18px]">login</span>
        </button>
        <button
          onClick={() => setConfirmAction({ type: 'refund', ticket })}
          className="p-1.5 rounded-lg text-yellow-400 hover:bg-yellow-500/10 transition-colors"
          title="Refund"
        >
          <span className="material-symbols-outlined text-[18px]">undo</span>
        </button>
        <button
          onClick={() => setConfirmAction({ type: 'remove', ticket })}
          className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
          title="Remove"
        >
          <span className="material-symbols-outlined text-[18px]">person_remove</span>
        </button>
      </Stack>
    );
  };

  return (
    <div className="min-h-screen bg-background-dark pb-20">
      <Container maxWidth="xl" padding="md" className="py-8">
        <Stack gap={6}>
          {/* Header */}
          <Stack direction="horizontal" gap={3} align="center">
            <Link to={id ? `/tournaments/${id}/manage` : '/admin'} className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-white/10 transition-colors">
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            <div>
              <Heading level={1} className="text-2xl font-bold text-white">Ticket Management</Heading>
              {tournamentName && <Text size="sm" color="muted">{tournamentName}</Text>}
            </div>
          </Stack>

          {/* Stats */}
          <ResponsiveGrid cols={{ mobile: 2, tablet: 2, desktop: 4 }} gap={4}>
            {statCards.map((s) => (
              <div key={s.label} className="bg-[#1c2230] rounded-2xl border border-white/5 p-4">
                <Stack direction="horizontal" gap={2} align="center" className="mb-2">
                  <span className={`material-symbols-outlined text-[20px] ${s.color}`}>{s.icon}</span>
                  <Text size="xs" color="muted" className="font-bold uppercase tracking-wider">{s.label}</Text>
                </Stack>
                <Text as="p" size="lg" color="white" className="text-2xl font-bold">{s.value}</Text>
              </div>
            ))}
          </ResponsiveGrid>

          {/* Filters */}
          <div className="bg-[#1c2230] rounded-2xl border border-white/5 p-4">
            <Stack direction="responsive" gap={4}>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-500 text-[20px]">search</span>
                <Input
                  type="text"
                  placeholder="Search by name or ticket code..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Stack direction="horizontal" gap={2} wrap>
                {filters.map((f) => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold capitalize transition-colors ${
                      statusFilter === f
                        ? 'bg-primary/20 text-primary border border-primary/30'
                        : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10'
                    }`}
                  >
                    {f === 'checked_in' ? 'Checked In' : f}
                  </button>
                ))}
              </Stack>
            </Stack>
          </div>

          {/* Error */}
          {error && (
            <Stack direction="horizontal" gap={3} align="center" className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <span className="material-symbols-outlined text-red-500">error</span>
              <Text size="sm" color="error">{error}</Text>
              <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </Stack>
          )}

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : tickets.length === 0 ? (
            <Stack align="center" className="bg-[#1c2230] rounded-2xl border border-white/5 p-12">
              <div className="size-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-slate-600 text-4xl">confirmation_number</span>
              </div>
              <Text color="muted" className="mb-2">No tickets found</Text>
              <Text size="sm" color="muted">
                {search || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'No tickets have been sold for this tournament yet.'}
              </Text>
            </Stack>
          ) : (
            <ResponsiveTable
              data={tickets}
              columns={columns}
              keyExtractor={(ticket) => ticket.id}
              renderMobileCard={renderMobileCard}
              renderActions={renderActions}
              emptyMessage="No tickets found"
            />
          )}
        </Stack>
      </Container>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !actionLoading && setConfirmAction(null)} />
          <div className="relative bg-[#1c2230] rounded-2xl border border-white/10 max-w-md w-full p-6 shadow-2xl">
            <Stack direction="horizontal" gap={3} align="center" className="mb-4">
              <div className={`size-10 rounded-full flex items-center justify-center ${
                confirmAction.type === 'refund' ? 'bg-yellow-500/20 text-yellow-500' :
                confirmAction.type === 'remove' ? 'bg-red-500/20 text-red-500' :
                'bg-blue-500/20 text-blue-500'
              }`}>
                <span className="material-symbols-outlined">
                  {confirmAction.type === 'refund' ? 'undo' : confirmAction.type === 'remove' ? 'person_remove' : 'login'}
                </span>
              </div>
              <Heading level={3} className="text-lg font-bold text-white">
                {confirmAction.type === 'refund' ? 'Refund Ticket' :
                 confirmAction.type === 'remove' ? 'Remove from Tournament' :
                 'Check In Player'}
              </Heading>
            </Stack>
            <Text size="sm" color="muted" className="mb-6">
              {confirmAction.type === 'refund'
                ? `Are you sure? This will refund ${formatAmount(confirmAction.ticket.amountPaid)} to ${confirmAction.ticket.playerName}'s card.`
                : confirmAction.type === 'remove'
                ? `Remove ${confirmAction.ticket.playerName} from the tournament without refund?`
                : `Check in ${confirmAction.ticket.playerName}?`}
            </Text>
            <Stack direction="horizontal" gap={3} justify="end">
              <Button
                variant="ghost"
                onClick={() => setConfirmAction(null)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant={confirmAction.type === 'remove' ? 'danger' : confirmAction.type === 'refund' ? 'secondary' : 'primary'}
                onClick={handleAction}
                disabled={actionLoading}
                loading={actionLoading}
                className={
                  confirmAction.type === 'refund' ? 'bg-yellow-500 text-black hover:bg-yellow-400' :
                  confirmAction.type === 'remove' ? '' :
                  'bg-blue-500 hover:bg-blue-400'
                }
              >
                {confirmAction.type === 'refund' ? 'Refund' :
                 confirmAction.type === 'remove' ? 'Remove' : 'Check In'}
              </Button>
            </Stack>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentTicketsPage;
