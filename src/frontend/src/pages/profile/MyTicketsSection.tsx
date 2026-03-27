import React, { useState, useEffect } from 'react';
import logger from '../../utils/logger';
import { apiClient } from '../../services/api';
import TicketCard, { type TicketData } from '../../components/tickets/TicketCard';
import { Heading, Text, Button, Stack, LoadingSpinner } from '../../components/ui';

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
    } catch (err) {
      logger.error('Failed to resend ticket email', err);
    } finally {
      setResending(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#1c2230] rounded-3xl border border-white/5 p-6">
        <Stack direction="horizontal" gap={2} align="center" className="mb-4">
          <span className="material-symbols-outlined text-primary">confirmation_number</span>
          <Heading level={3} className="!text-lg">My Tickets</Heading>
        </Stack>
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="md" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#1c2230] rounded-3xl border border-white/5 p-6">
        <Stack direction="horizontal" gap={2} align="center" className="mb-4">
          <span className="material-symbols-outlined text-primary">confirmation_number</span>
          <Heading level={3} className="!text-lg">My Tickets</Heading>
        </Stack>
        <div className="text-center py-8">
          <div className="size-16 rounded-full bg-red-500/10 mx-auto flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-red-500 text-3xl">error</span>
          </div>
          <Text color="muted" className="mb-4">{error}</Text>
          <Button
            variant="ghost"
            onClick={fetchTickets}
            size="sm"
            className="text-primary"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1c2230] rounded-3xl border border-white/5 p-6">
      <Stack direction="horizontal" align="center" justify="between" className="mb-6">
        <Stack direction="horizontal" gap={2} align="center">
          <span className="material-symbols-outlined text-primary">confirmation_number</span>
          <Heading level={3} className="!text-lg">
            My Tickets
          </Heading>
          {tickets.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-primary/20 text-primary text-xs font-bold rounded-full">
              {tickets.length}
            </span>
          )}
        </Stack>
      </Stack>

      {tickets.length === 0 ? (
        <div className="text-center py-12">
          <div className="size-20 rounded-full bg-white/5 mx-auto flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-slate-600 text-4xl">
              confirmation_number
            </span>
          </div>
          <Text color="muted" className="mb-2">No tickets yet</Text>
          <Text size="sm" color="muted" className="max-w-sm mx-auto">
            When you register for a paid tournament, your tickets will appear here.
          </Text>
        </div>
      ) : (
        <Stack direction="vertical" gap={4}>
          {tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onResend={resending === ticket.id ? undefined : handleResend}
            />
          ))}
        </Stack>
      )}
    </div>
  );
};

export default MyTicketsSection;
