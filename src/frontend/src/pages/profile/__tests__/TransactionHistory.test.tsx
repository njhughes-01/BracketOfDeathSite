import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import TransactionHistory from '../TransactionHistory';

// Mock the api client
vi.mock('../../../services/api', () => ({
  apiClient: {
    getTransactionHistory: vi.fn(),
  },
}));

import { apiClient } from '../../../services/api';

const mockTransactions = [
  {
    id: 'tx-1',
    ticketCode: 'BOD-ABC123',
    tournament: { id: 't-1', name: 'BOD #42', date: '2024-03-15T10:00:00Z' },
    status: 'valid',
    paymentStatus: 'paid',
    amountPaid: 2500,
    createdAt: '2024-03-01T12:00:00Z',
    teamName: null,
    stripeReceiptUrl: 'https://receipt.stripe.com/test',
  },
  {
    id: 'tx-2',
    ticketCode: 'BOD-DEF456',
    tournament: { id: 't-2', name: 'BOD #43', date: '2024-04-20T10:00:00Z' },
    status: 'refunded',
    paymentStatus: 'refunded',
    amountPaid: 3000,
    createdAt: '2024-04-01T12:00:00Z',
    teamName: 'Team Alpha',
  },
];

const renderWithRouter = (ui: React.ReactElement) =>
  render(<BrowserRouter>{ui}</BrowserRouter>);

describe('TransactionHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    (apiClient.getTransactionHistory as any).mockReturnValue(new Promise(() => {}));
    renderWithRouter(<TransactionHistory />);
    expect(screen.getByText('Transaction History')).toBeInTheDocument();
  });

  it('renders transactions after loading', async () => {
    (apiClient.getTransactionHistory as any).mockResolvedValue({
      success: true,
      data: { transactions: mockTransactions },
    });

    renderWithRouter(<TransactionHistory />);

    await waitFor(() => {
      expect(screen.getByText('BOD #42')).toBeInTheDocument();
    });
    expect(screen.getByText('BOD #43')).toBeInTheDocument();
    expect(screen.getByText('$25.00')).toBeInTheDocument();
    expect(screen.getByText('$30.00')).toBeInTheDocument();
  });

  it('shows team name for team events', async () => {
    (apiClient.getTransactionHistory as any).mockResolvedValue({
      success: true,
      data: { transactions: mockTransactions },
    });

    renderWithRouter(<TransactionHistory />);

    await waitFor(() => {
      expect(screen.getByText('Team Alpha')).toBeInTheDocument();
    });
  });

  it('shows status badges', async () => {
    (apiClient.getTransactionHistory as any).mockResolvedValue({
      success: true,
      data: { transactions: mockTransactions },
    });

    renderWithRouter(<TransactionHistory />);

    await waitFor(() => {
      expect(screen.getByText('Valid')).toBeInTheDocument();
      expect(screen.getByText('Refunded')).toBeInTheDocument();
    });
  });

  it('shows empty state when no transactions', async () => {
    (apiClient.getTransactionHistory as any).mockResolvedValue({
      success: true,
      data: { transactions: [] },
    });

    renderWithRouter(<TransactionHistory />);

    await waitFor(() => {
      expect(screen.getByText('No transactions yet')).toBeInTheDocument();
    });
  });

  it('shows error state on failure', async () => {
    (apiClient.getTransactionHistory as any).mockRejectedValue(new Error('Network error'));

    renderWithRouter(<TransactionHistory />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load transaction history.')).toBeInTheDocument();
    });
  });

  it('expands transaction details on click', async () => {
    (apiClient.getTransactionHistory as any).mockResolvedValue({
      success: true,
      data: { transactions: mockTransactions },
    });

    renderWithRouter(<TransactionHistory />);

    await waitFor(() => {
      expect(screen.getByText('BOD #42')).toBeInTheDocument();
    });

    // Click to expand first transaction
    const expandButtons = screen.getAllByRole('button');
    const txButton = expandButtons.find(btn => btn.textContent?.includes('BOD #42'));
    if (txButton) fireEvent.click(txButton);

    await waitFor(() => {
      expect(screen.getByText('BOD-ABC123')).toBeInTheDocument();
    });
  });
});
