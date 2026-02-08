import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import TournamentTicketsPage from '../TournamentTicketsPage';

// Mock useParams
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'tournament-123' }),
  };
});

vi.mock('../../../services/api', () => ({
  default: {
    getTournamentTransactions: vi.fn(),
    getTournament: vi.fn(),
    refundTicket: vi.fn(),
    removeTicket: vi.fn(),
    checkInTicket: vi.fn(),
  },
}));

import apiClient from '../../../services/api';

const mockTickets = [
  {
    id: 'ticket-1',
    ticketCode: 'BOD-ABC123',
    playerName: 'John Doe',
    playerEmail: 'john@test.com',
    status: 'valid',
    paymentStatus: 'paid',
    amountPaid: 2500,
    createdAt: '2024-03-01T12:00:00Z',
  },
  {
    id: 'ticket-2',
    ticketCode: 'BOD-DEF456',
    playerName: 'Jane Smith',
    teamName: 'Team Beta',
    status: 'checked_in',
    paymentStatus: 'paid',
    amountPaid: 2500,
    createdAt: '2024-03-02T12:00:00Z',
    checkedInAt: '2024-03-15T09:00:00Z',
  },
];

const mockStats = {
  total: 2,
  revenue: 5000,
  refunded: 0,
  checkedIn: 1,
  valid: 1,
  void: 0,
};

const renderWithRouter = (ui: React.ReactElement) =>
  render(<BrowserRouter>{ui}</BrowserRouter>);

describe('TournamentTicketsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiClient.getTournamentTransactions as any).mockResolvedValue({
      success: true,
      data: { tickets: mockTickets, stats: mockStats },
    });
    (apiClient.getTournament as any).mockResolvedValue({
      success: true,
      data: { name: 'BOD #42', tournamentType: "Men's Singles" },
    });
  });

  it('renders ticket management page with stats', async () => {
    renderWithRouter(<TournamentTicketsPage />);

    await waitFor(() => {
      expect(screen.getByText('Ticket Management')).toBeInTheDocument();
    });
    expect(screen.getByText('BOD #42')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // total tickets
    expect(screen.getByText('$50.00')).toBeInTheDocument(); // revenue
  });

  it('renders tickets in the table', async () => {
    renderWithRouter(<TournamentTicketsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('Jane Smith').length).toBeGreaterThan(0);
    expect(screen.getAllByText('BOD-ABC123').length).toBeGreaterThan(0);
    expect(screen.getAllByText('BOD-DEF456').length).toBeGreaterThan(0);
  });

  it('shows confirmation modal on refund click', async () => {
    renderWithRouter(<TournamentTicketsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
    });

    const refundButtons = screen.getAllByTitle('Refund');
    fireEvent.click(refundButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Refund Ticket')).toBeInTheDocument();
      expect(screen.getByText(/This will refund \$25\.00/)).toBeInTheDocument();
    });
  });

  it('shows confirmation modal on remove click', async () => {
    renderWithRouter(<TournamentTicketsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
    });

    const removeButtons = screen.getAllByTitle('Remove');
    fireEvent.click(removeButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Remove from Tournament')).toBeInTheDocument();
    });
  });

  it('executes refund action', async () => {
    (apiClient.refundTicket as any).mockResolvedValue({ success: true });

    renderWithRouter(<TournamentTicketsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
    });

    const refundButtons = screen.getAllByTitle('Refund');
    fireEvent.click(refundButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Refund Ticket')).toBeInTheDocument();
    });

    const confirmBtn = screen.getByRole('button', { name: 'Refund' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(apiClient.refundTicket).toHaveBeenCalledWith('ticket-1', 2500);
    });
  });

  it('shows error state on load failure', async () => {
    (apiClient.getTournamentTransactions as any).mockRejectedValue(new Error('fail'));

    renderWithRouter(<TournamentTicketsPage />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load ticket data.')).toBeInTheDocument();
    });
  });

  it('filters by status', async () => {
    renderWithRouter(<TournamentTicketsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
    });

    const validFilter = screen.getByRole('button', { name: 'valid' });
    fireEvent.click(validFilter);

    await waitFor(() => {
      expect(apiClient.getTournamentTransactions).toHaveBeenCalledWith(
        'tournament-123',
        expect.objectContaining({ status: 'valid' })
      );
    });
  });
});
