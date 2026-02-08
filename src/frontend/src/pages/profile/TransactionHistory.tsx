import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import logger from '../../utils/logger';
import { apiClient } from '../../services/api';

interface Transaction {
  id: string;
  ticketCode: string;
  tournament: {
    id: string;
    name: string;
    date: string;
  };
  status: 'valid' | 'checked_in' | 'refunded' | 'void';
  paymentStatus: 'paid' | 'free' | 'refunded';
  amountPaid: number;
  teamName?: string;
  createdAt: string;
  checkedInAt?: string;
  stripeReceiptUrl?: string;
}

const statusConfig = {
  valid: { color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: 'check_circle', label: 'Valid' },
  checked_in: { color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: 'login', label: 'Checked In' },
  refunded: { color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: 'undo', label: 'Refunded' },
  void: { color: 'bg-slate-500/10 text-slate-500 border-slate-500/20', icon: 'block', label: 'Void' },
};

const TransactionHistory: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getTransactionHistory();
      if (response.success && response.data?.transactions) {
        setTransactions(response.data.transactions);
      }
    } catch (err) {
      logger.error('Failed to fetch transaction history', err);
      setError('Failed to load transaction history.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });

  const formatAmount = (cents: number) =>
    cents === 0 ? 'Free' : `$${(cents / 100).toFixed(2)}`;

  if (loading) {
    return (
      <div className="bg-[#1c2230] rounded-3xl border border-white/5 p-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-primary">receipt_long</span>
          Transaction History
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
          <span className="material-symbols-outlined text-primary">receipt_long</span>
          Transaction History
        </h3>
        <div className="text-center py-8">
          <div className="size-16 rounded-full bg-red-500/10 mx-auto flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-red-500 text-3xl">error</span>
          </div>
          <p className="text-slate-400 mb-4">{error}</p>
          <button onClick={fetchTransactions} className="px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-bold">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/profile" className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Transaction History</h1>
        </div>
    <div className="bg-[#1c2230] rounded-3xl border border-white/5 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">receipt_long</span>
          All Purchases
          {transactions.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-primary/20 text-primary text-xs font-bold rounded-full">
              {transactions.length}
            </span>
          )}
        </h3>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-12">
          <div className="size-20 rounded-full bg-white/5 mx-auto flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-slate-600 text-4xl">receipt_long</span>
          </div>
          <p className="text-slate-400 mb-2">No transactions yet</p>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Your ticket purchase history will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => {
            const config = statusConfig[tx.status];
            const isExpanded = expandedId === tx.id;

            return (
              <div key={tx.id} className="bg-background-dark rounded-xl border border-white/5 overflow-hidden hover:border-white/10 transition-all">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                  className="w-full p-4 flex items-center justify-between gap-4 text-left"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${config.color}`}>
                      <span className="material-symbols-outlined text-[20px]">{config.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          to={`/tournaments/${tx.tournament.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-bold text-white hover:text-primary transition-colors text-sm truncate"
                        >
                          {tx.tournament.name}
                        </Link>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${config.color}`}>
                          {config.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span>{formatDate(tx.tournament.date)}</span>
                        {tx.teamName && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">group</span>
                              {tx.teamName}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-bold text-white text-sm">{formatAmount(tx.amountPaid)}</span>
                    <span className={`material-symbols-outlined text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                      expand_more
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-white/5 pt-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <p className="text-slate-500 mb-1">Ticket Code</p>
                        <p className="font-mono font-bold text-primary">{tx.ticketCode}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 mb-1">Purchase Date</p>
                        <p className="text-white font-bold">{formatDate(tx.createdAt)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 mb-1">Payment</p>
                        <p className="text-white font-bold capitalize">{tx.paymentStatus}</p>
                      </div>
                      {tx.checkedInAt && (
                        <div>
                          <p className="text-slate-500 mb-1">Checked In</p>
                          <p className="text-white font-bold">{formatDate(tx.checkedInAt)}</p>
                        </div>
                      )}
                    </div>
                    {tx.stripeReceiptUrl && (
                      <a
                        href={tx.stripeReceiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-3 text-xs font-bold text-primary hover:text-white transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">receipt</span>
                        View Receipt
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
      </div>
    </div>
  );
};

export default TransactionHistory;
