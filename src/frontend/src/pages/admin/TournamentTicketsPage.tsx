import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import logger from '../../utils/logger';
import apiClient from '../../services/api';

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

  return (
    <div className="min-h-screen bg-background-dark pb-20">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to={id ? `/tournaments/${id}/manage` : '/admin'} className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Ticket Management</h1>
            {tournamentName && <p className="text-sm text-slate-400">{tournamentName}</p>}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statCards.map((s) => (
            <div key={s.label} className="bg-[#1c2230] rounded-2xl border border-white/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`material-symbols-outlined text-[20px] ${s.color}`}>{s.icon}</span>
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">{s.label}</span>
              </div>
              <p className="text-2xl font-bold text-white">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-[#1c2230] rounded-2xl border border-white/5 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-500 text-[20px]">search</span>
              <input
                type="text"
                placeholder="Search by name or ticket code..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
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
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 flex items-center gap-3">
            <span className="material-symbols-outlined text-red-500">error</span>
            <p className="text-red-400 text-sm">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : tickets.length === 0 ? (
          <div className="bg-[#1c2230] rounded-2xl border border-white/5 p-12 text-center">
            <div className="size-20 rounded-full bg-white/5 mx-auto flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-slate-600 text-4xl">confirmation_number</span>
            </div>
            <p className="text-slate-400 mb-2">No tickets found</p>
            <p className="text-sm text-slate-500">
              {search || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'No tickets have been sold for this tournament yet.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block bg-[#1c2230] rounded-2xl border border-white/5 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider p-4">Player</th>
                    <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider p-4">Ticket Code</th>
                    {isTeamEvent && <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider p-4">Team</th>}
                    <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider p-4">Status</th>
                    <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider p-4">Payment</th>
                    <th className="text-right text-xs font-bold text-slate-500 uppercase tracking-wider p-4">Amount</th>
                    <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider p-4">Date</th>
                    <th className="text-right text-xs font-bold text-slate-500 uppercase tracking-wider p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => {
                    const config = statusConfig[ticket.status];
                    return (
                      <tr key={ticket.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="p-4">
                          <p className="text-sm font-bold text-white">{ticket.playerName}</p>
                          {ticket.playerEmail && <p className="text-xs text-slate-500">{ticket.playerEmail}</p>}
                        </td>
                        <td className="p-4">
                          <span className="font-mono text-sm text-primary font-bold">{ticket.ticketCode}</span>
                        </td>
                        {isTeamEvent && (
                          <td className="p-4">
                            <span className="text-sm text-slate-300">{ticket.teamName || '—'}</span>
                          </td>
                        )}
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${config.color}`}>
                            {config.label}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-slate-300 capitalize">{ticket.paymentStatus}</span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-sm font-bold text-white">{formatAmount(ticket.amountPaid)}</span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-slate-400">{formatDate(ticket.createdAt)}</span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {ticket.status === 'valid' && (
                              <>
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
                              </>
                            )}
                            {ticket.status === 'checked_in' && (
                              <span className="text-xs text-slate-500">Checked in</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {tickets.map((ticket) => {
                const config = statusConfig[ticket.status];
                return (
                  <div key={ticket.id} className="bg-[#1c2230] rounded-xl border border-white/5 p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="font-bold text-white text-sm">{ticket.playerName}</p>
                        <p className="font-mono text-xs text-primary mt-0.5">{ticket.ticketCode}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold border shrink-0 ${config.color}`}>
                        {config.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{formatAmount(ticket.amountPaid)} · {ticket.paymentStatus}</span>
                      <span>{formatDate(ticket.createdAt)}</span>
                    </div>
                    {isTeamEvent && ticket.teamName && (
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">group</span>
                        {ticket.teamName}
                      </p>
                    )}
                    {ticket.status === 'valid' && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                        <button
                          onClick={() => setConfirmAction({ type: 'checkin', ticket })}
                          className="flex-1 py-2 text-xs font-bold text-blue-400 bg-blue-500/10 rounded-lg hover:bg-blue-500/20 transition-colors flex items-center justify-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">login</span>
                          Check In
                        </button>
                        <button
                          onClick={() => setConfirmAction({ type: 'refund', ticket })}
                          className="flex-1 py-2 text-xs font-bold text-yellow-400 bg-yellow-500/10 rounded-lg hover:bg-yellow-500/20 transition-colors flex items-center justify-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">undo</span>
                          Refund
                        </button>
                        <button
                          onClick={() => setConfirmAction({ type: 'remove', ticket })}
                          className="flex-1 py-2 text-xs font-bold text-red-400 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-colors flex items-center justify-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">person_remove</span>
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !actionLoading && setConfirmAction(null)} />
          <div className="relative bg-[#1c2230] rounded-2xl border border-white/10 max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className={`size-10 rounded-full flex items-center justify-center ${
                confirmAction.type === 'refund' ? 'bg-yellow-500/20 text-yellow-500' :
                confirmAction.type === 'remove' ? 'bg-red-500/20 text-red-500' :
                'bg-blue-500/20 text-blue-500'
              }`}>
                <span className="material-symbols-outlined">
                  {confirmAction.type === 'refund' ? 'undo' : confirmAction.type === 'remove' ? 'person_remove' : 'login'}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white">
                {confirmAction.type === 'refund' ? 'Refund Ticket' :
                 confirmAction.type === 'remove' ? 'Remove from Tournament' :
                 'Check In Player'}
              </h3>
            </div>
            <p className="text-sm text-slate-400 mb-6">
              {confirmAction.type === 'refund'
                ? `Are you sure? This will refund ${formatAmount(confirmAction.ticket.amountPaid)} to ${confirmAction.ticket.playerName}'s card.`
                : confirmAction.type === 'remove'
                ? `Remove ${confirmAction.ticket.playerName} from the tournament without refund?`
                : `Check in ${confirmAction.ticket.playerName}?`}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmAction(null)}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-bold text-slate-400 bg-white/5 rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={actionLoading}
                className={`px-4 py-2 text-sm font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 ${
                  confirmAction.type === 'refund' ? 'bg-yellow-500 text-black hover:bg-yellow-400' :
                  confirmAction.type === 'remove' ? 'bg-red-500 text-white hover:bg-red-400' :
                  'bg-blue-500 text-white hover:bg-blue-400'
                }`}
              >
                {actionLoading && <div className="animate-spin size-4 border-2 border-current border-t-transparent rounded-full"></div>}
                {confirmAction.type === 'refund' ? 'Refund' :
                 confirmAction.type === 'remove' ? 'Remove' : 'Check In'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentTicketsPage;
