import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import logger from '../utils/logger';
import { apiClient } from '../services/api';

interface SessionData {
  ticketId: string;
  ticketCode: string;
  tournament: {
    id: string;
    name: string;
    date: string;
    location?: string;
  };
  amountPaid: number;
  status: string;
}

const CheckoutSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);

  useEffect(() => {
    if (sessionId) {
      verifySession();
    } else {
      setError('No session ID provided');
      setLoading(false);
    }
  }, [sessionId]);

  const verifySession = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getCheckoutSession(sessionId) as {
        success: boolean;
        data: SessionData;
      };
      if (response.success && response.data) {
        setSessionData(response.data);
      } else {
        setError('Failed to verify your payment');
      }
    } catch (err) {
      logger.error('Failed to verify checkout session', err);
      setError('Failed to verify your payment. Please check your profile for ticket status.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatAmount = (cents: number) => {
    if (cents === 0) return 'Free';
    return `$${(cents / 100).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin size-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-400">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="size-24 rounded-full bg-yellow-500/10 mx-auto flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-yellow-500 text-5xl">warning</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Verification Issue</h1>
          <p className="text-slate-400 mb-8">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/profile"
              className="px-6 py-3 bg-primary text-black font-bold rounded-xl hover:bg-white transition-colors"
            >
              Check My Profile
            </Link>
            <Link
              to="/tournaments"
              className="px-6 py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-colors"
            >
              Browse Tournaments
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark pb-20">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Success header */}
        <div className="text-center mb-10">
          <div className="relative inline-block">
            <div className="size-28 rounded-full bg-green-500/20 mx-auto flex items-center justify-center">
              <span className="material-symbols-outlined text-green-500 text-6xl">check_circle</span>
            </div>
            <div className="absolute inset-0 bg-green-500/20 blur-2xl rounded-full animate-pulse"></div>
          </div>
          <h1 className="text-3xl font-black text-white mt-6 mb-2">You're Registered!</h1>
          <p className="text-slate-400">Your payment was successful and your spot is confirmed.</p>
        </div>

        {/* Ticket preview card */}
        {sessionData && (
          <div className="bg-[#1c2230] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
            {/* Tournament info */}
            <div className="p-6 border-b border-white/5 bg-gradient-to-r from-primary/5 to-transparent">
              <h2 className="text-xl font-bold text-white mb-2">{sessionData.tournament.name}</h2>
              <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">calendar_today</span>
                  {formatDate(sessionData.tournament.date)}
                </div>
                {sessionData.tournament.location && (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary">location_on</span>
                    {sessionData.tournament.location}
                  </div>
                )}
              </div>
            </div>

            {/* Ticket code with QR */}
            <div className="p-8 flex flex-col sm:flex-row items-center gap-6">
              {/* QR Code placeholder */}
              <div className="size-32 bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg">
                <div className="size-28 bg-gradient-to-br from-black to-gray-800 rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-5xl">qr_code_2</span>
                </div>
              </div>

              <div className="text-center sm:text-left">
                <p className="text-sm text-slate-500 uppercase tracking-wider font-bold">Your Ticket Code</p>
                <p className="text-3xl font-mono font-black text-primary mt-2 tracking-wider">
                  {sessionData.ticketCode}
                </p>
                <p className="text-sm text-slate-500 mt-3">
                  Amount paid: <span className="text-white font-bold">{formatAmount(sessionData.amountPaid)}</span>
                </p>
              </div>
            </div>

            {/* Info banner */}
            <div className="px-6 py-4 bg-blue-500/10 border-t border-blue-500/20 flex items-start gap-3">
              <span className="material-symbols-outlined text-blue-400 text-xl shrink-0">info</span>
              <div className="text-sm text-blue-300">
                <p className="font-bold mb-1">Check your email</p>
                <p className="text-blue-300/80">
                  We've sent a confirmation email with your ticket and QR code. Present this at check-in.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/profile"
            className="px-8 py-4 bg-primary text-black font-bold rounded-xl hover:bg-white transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">confirmation_number</span>
            View My Tickets
          </Link>
          <Link
            to="/tournaments"
            className="px-8 py-4 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">emoji_events</span>
            Browse Tournaments
          </Link>
        </div>

        {/* Additional info */}
        <div className="mt-12 grid sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-[#1c2230] border border-white/5">
            <div className="flex items-center gap-3 mb-2">
              <div className="size-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-purple-400">schedule</span>
              </div>
              <h3 className="font-bold text-white">Arrive Early</h3>
            </div>
            <p className="text-sm text-slate-400">
              We recommend arriving 30 minutes before the tournament starts for check-in.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#1c2230] border border-white/5">
            <div className="flex items-center gap-3 mb-2">
              <div className="size-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-orange-400">help</span>
              </div>
              <h3 className="font-bold text-white">Need Help?</h3>
            </div>
            <p className="text-sm text-slate-400">
              Contact the tournament organizer if you have any questions or need to make changes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutSuccessPage;
