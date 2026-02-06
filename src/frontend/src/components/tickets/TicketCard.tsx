import React, { useState } from 'react';
import logger from '../../utils/logger';
import api from '../../services/api';

export interface Ticket {
  id: string;
  ticketCode: string;
  qrCodeUrl?: string;
  tournament: {
    id: string;
    name: string;
    date: string;
    location?: string;
  };
  status: 'valid' | 'checked_in' | 'refunded' | 'void';
  paymentStatus: 'paid' | 'free' | 'refunded';
  amountPaid: number; // In cents
  checkedInAt?: string;
  createdAt: string;
}

interface TicketCardProps {
  ticket: Ticket;
  showResendButton?: boolean;
  onResendSuccess?: () => void;
}

/**
 * Displays a single ticket with QR code, tournament info, and status.
 * Includes "Resend Email" button if email is supported.
 */
export const TicketCard: React.FC<TicketCardProps> = ({
  ticket,
  showResendButton = true,
  onResendSuccess,
}) => {
  const [resending, setResending] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleResendEmail = async () => {
    setResending(true);
    setResendError(null);
    setResendSuccess(false);

    try {
      await api.post(`/tickets/${ticket.id}/resend`);
      setResendSuccess(true);
      logger.info('Ticket email resent successfully', { ticketId: ticket.id });
      onResendSuccess?.();
      
      // Clear success message after 3 seconds
      setTimeout(() => setResendSuccess(false), 3000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to resend email';
      setResendError(message);
      logger.error('Failed to resend ticket email', error);
    } finally {
      setResending(false);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatAmount = (cents: number): string => {
    return (cents / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  };

  const getStatusBadge = () => {
    const statusStyles: Record<Ticket['status'], { className: string; label: string }> = {
      valid: { className: 'badge-success', label: 'Valid' },
      checked_in: { className: 'badge-info', label: 'Checked In' },
      refunded: { className: 'badge-warning', label: 'Refunded' },
      void: { className: 'badge-error', label: 'Void' },
    };
    
    const style = statusStyles[ticket.status];
    return <span className={`badge ${style.className}`}>{style.label}</span>;
  };

  const getPaymentBadge = () => {
    if (ticket.paymentStatus === 'free') {
      return <span className="badge badge-ghost">Free Entry</span>;
    }
    if (ticket.paymentStatus === 'refunded') {
      return <span className="badge badge-warning">Refunded</span>;
    }
    return <span className="badge badge-primary">{formatAmount(ticket.amountPaid)}</span>;
  };

  const isActive = ticket.status === 'valid' || ticket.status === 'checked_in';

  return (
    <div className={`card bg-base-100 shadow-xl ${!isActive ? 'opacity-60' : ''}`}>
      <div className="card-body">
        {/* Header with status badges */}
        <div className="flex justify-between items-start">
          <div>
            <h2 className="card-title text-lg">{ticket.tournament.name}</h2>
            <p className="text-sm text-base-content/70">
              {formatDate(ticket.tournament.date)}
            </p>
            {ticket.tournament.location && (
              <p className="text-sm text-base-content/60">
                <span className="material-symbols-outlined text-xs align-middle mr-1">
                  location_on
                </span>
                {ticket.tournament.location}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1 items-end">
            {getStatusBadge()}
            {getPaymentBadge()}
          </div>
        </div>

        {/* QR Code */}
        <div className="flex justify-center my-4">
          {ticket.qrCodeUrl ? (
            <img
              src={ticket.qrCodeUrl}
              alt={`QR Code for ticket ${ticket.ticketCode}`}
              className="w-40 h-40 rounded-lg border border-base-300"
            />
          ) : (
            <div className="w-40 h-40 bg-base-200 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-4xl text-base-content/30">
                qr_code_2
              </span>
            </div>
          )}
        </div>

        {/* Ticket Code */}
        <div className="text-center">
          <p className="text-xs text-base-content/60 uppercase tracking-wide">Ticket Code</p>
          <p className="font-mono font-bold text-lg tracking-wider">{ticket.ticketCode}</p>
        </div>

        {/* Checked in info */}
        {ticket.status === 'checked_in' && ticket.checkedInAt && (
          <div className="alert alert-info py-2 mt-2">
            <span className="material-symbols-outlined text-sm">check_circle</span>
            <span className="text-sm">
              Checked in on {formatDate(ticket.checkedInAt)}
            </span>
          </div>
        )}

        {/* Resend Email Button */}
        {showResendButton && isActive && (
          <div className="card-actions justify-center mt-4">
            <button
              className={`btn btn-outline btn-sm ${resending ? 'loading' : ''}`}
              onClick={handleResendEmail}
              disabled={resending}
            >
              {!resending && (
                <span className="material-symbols-outlined text-sm mr-1">mail</span>
              )}
              Resend Email
            </button>
          </div>
        )}

        {/* Feedback messages */}
        {resendSuccess && (
          <div className="alert alert-success py-2 mt-2">
            <span className="material-symbols-outlined text-sm">check</span>
            <span className="text-sm">Email sent successfully!</span>
          </div>
        )}
        {resendError && (
          <div className="alert alert-error py-2 mt-2">
            <span className="material-symbols-outlined text-sm">error</span>
            <span className="text-sm">{resendError}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketCard;
