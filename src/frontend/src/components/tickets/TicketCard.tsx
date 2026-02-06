import React from 'react';
import { Link } from 'react-router-dom';

export interface TicketData {
  id: string;
  ticketCode: string;
  tournament: {
    id: string;
    name: string;
    date: string;
    location?: string;
  };
  status: 'valid' | 'checked_in' | 'refunded' | 'void';
  paymentStatus: 'paid' | 'free' | 'refunded';
  amountPaid: number;
  checkedInAt?: string;
  createdAt: string;
}

interface TicketCardProps {
  ticket: TicketData;
  showQR?: boolean;
  onResend?: (ticketId: string) => void;
}

const TicketCard: React.FC<TicketCardProps> = ({ ticket, showQR = true, onResend }) => {
  const statusColors = {
    valid: 'bg-green-500/10 text-green-500 border-green-500/20',
    checked_in: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    refunded: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    void: 'bg-red-500/10 text-red-500 border-red-500/20',
  };

  const statusLabels = {
    valid: 'Valid',
    checked_in: 'Checked In',
    refunded: 'Refunded',
    void: 'Void',
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatAmount = (cents: number) => {
    if (cents === 0) return 'Free';
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="bg-[#1c2230] rounded-2xl border border-white/5 overflow-hidden hover:border-white/10 transition-all group">
      {/* Header with tournament info */}
      <div className="p-5 border-b border-white/5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <Link
              to={`/tournaments/${ticket.tournament.id}`}
              className="text-lg font-bold text-white hover:text-primary transition-colors line-clamp-1"
            >
              {ticket.tournament.name}
            </Link>
            <div className="flex items-center gap-2 mt-1 text-sm text-slate-400">
              <span className="material-symbols-outlined text-[16px]">calendar_today</span>
              {formatDate(ticket.tournament.date)}
            </div>
            {ticket.tournament.location && (
              <div className="flex items-center gap-2 mt-1 text-sm text-slate-400">
                <span className="material-symbols-outlined text-[16px]">location_on</span>
                {ticket.tournament.location}
              </div>
            )}
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border ${statusColors[ticket.status]}`}
          >
            {statusLabels[ticket.status]}
          </span>
        </div>
      </div>

      {/* Ticket code and QR preview */}
      <div className="p-5 flex items-center gap-4">
        {showQR && (
          <div className="size-20 bg-white rounded-xl flex items-center justify-center shrink-0">
            {/* Simple QR placeholder - actual QR would be generated */}
            <div className="size-16 bg-gradient-to-br from-black to-gray-800 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-2xl">qr_code_2</span>
            </div>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Ticket Code</p>
          <p className="text-xl font-mono font-bold text-primary mt-1">{ticket.ticketCode}</p>
          <p className="text-xs text-slate-500 mt-2">
            {ticket.paymentStatus === 'free' ? 'Free Entry' : formatAmount(ticket.amountPaid)}
          </p>
        </div>
      </div>

      {/* Footer with actions */}
      <div className="px-5 py-3 bg-black/20 flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {ticket.checkedInAt
            ? `Checked in ${formatDate(ticket.checkedInAt)}`
            : `Purchased ${formatDate(ticket.createdAt)}`}
        </p>
        <div className="flex items-center gap-2">
          {onResend && ticket.status === 'valid' && (
            <button
              onClick={() => onResend(ticket.id)}
              className="text-xs font-bold text-slate-400 hover:text-primary px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">mail</span>
              Resend
            </button>
          )}
          <Link
            to={`/profile?ticket=${ticket.id}`}
            className="text-xs font-bold text-primary hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">visibility</span>
            View
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TicketCard;
