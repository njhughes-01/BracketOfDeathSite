import React, { useState, useEffect } from 'react';
import logger from '../../utils/logger';
import { apiClient } from '../../services/api';
import TicketCard, { type TicketData } from '../../components/tickets/TicketCard';

interface TicketsResponse {
  tickets: TicketData[];
}

const MyTicketsSection: React.FC = () => {
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState<string | null>(null);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getTickets() as { success: boolean; data: TicketsResponse };
      if (response.success && response.data?.tickets) {
        setTickets(response.data.tickets);
      }
    } catch (err) {
      logger.error('Failed to fetch tickets', err);
      setError('Failed to load your tickets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (ticketId: string) => {
    try {
      setResending(ticketId);
      await apiClient.resendTicketEmail(ticketId);
      // Could add a toast notification here
    } catch (err) {
      logger.error('Failed to resend ticket email', err);
    } finally {
      setResending(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#1c2230] rounded-3xl border border-white/5 p-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-primary">confirmation_number</span>
          My Tickets
        </h3>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#1c2230] rounded-3xl border border-white/5 p-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-primary">confirmation_number</span>
          My Tickets
        </h3>
        <div className="text-center py-8">
          <div className="size-16 rounded-full bg-red-500/10 mx-auto flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-red-500 text-3xl">error</span>
          </div>
          <p className="text-slate-400 mb-4">{error}</p>
          <button
            onClick={fetchTickets}
            className="px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-bold"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1c2230] rounded-3xl border border-white/5 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">confirmation_number</span>
          My Tickets
          {tickets.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-primary/20 text-primary text-xs font-bold rounded-full">
              {tickets.length}
            </span>
          )}
        </h3>
      </div>

      {tickets.length === 0 ? (
        <div className="text-center py-12">
          <div className="size-20 rounded-full bg-white/5 mx-auto flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-slate-600 text-4xl">
              confirmation_number
            </span>
          </div>
          <p className="text-slate-400 mb-2">No tickets yet</p>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            When you register for a paid tournament, your tickets will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onResend={resending === ticket.id ? undefined : handleResend}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MyTicketsSection;
