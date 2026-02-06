import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';

const CheckoutCancelPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tournamentId = searchParams.get('tournament_id');

  return (
    <div className="min-h-screen bg-background-dark flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        {/* Icon */}
        <div className="relative inline-block mb-8">
          <div className="size-28 rounded-full bg-orange-500/20 mx-auto flex items-center justify-center">
            <span className="material-symbols-outlined text-orange-500 text-6xl">event_busy</span>
          </div>
          <div className="absolute inset-0 bg-orange-500/10 blur-2xl rounded-full"></div>
        </div>

        {/* Message */}
        <h1 className="text-3xl font-black text-white mb-3">Registration Not Completed</h1>
        <p className="text-slate-400 mb-8 max-w-md mx-auto">
          Your checkout was cancelled or timed out. Don't worry — no payment was processed and your slot has been released.
        </p>

        {/* Info box */}
        <div className="bg-[#1c2230] rounded-2xl border border-white/5 p-6 mb-8 text-left">
          <div className="flex items-start gap-4">
            <div className="size-10 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-blue-400">info</span>
            </div>
            <div>
              <h3 className="font-bold text-white mb-1">What happened?</h3>
              <ul className="text-sm text-slate-400 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[14px] text-slate-500 mt-0.5">check</span>
                  No payment was charged to your account
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[14px] text-slate-500 mt-0.5">check</span>
                  Your reserved slot has been released
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[14px] text-slate-500 mt-0.5">check</span>
                  You can try registering again if spots are available
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {tournamentId ? (
            <Link
              to={`/tournaments/${tournamentId}`}
              className="px-8 py-4 bg-primary text-black font-bold rounded-xl hover:bg-white transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">refresh</span>
              Try Again
            </Link>
          ) : (
            <Link
              to="/tournaments"
              className="px-8 py-4 bg-primary text-black font-bold rounded-xl hover:bg-white transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">emoji_events</span>
              Browse Tournaments
            </Link>
          )}
          <Link
            to="/"
            className="px-8 py-4 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">home</span>
            Go Home
          </Link>
        </div>

        {/* Support link */}
        <p className="mt-10 text-sm text-slate-500">
          Having trouble?{' '}
          <Link to="/contact" className="text-primary hover:text-white transition-colors">
            Contact support
          </Link>
        </p>
      </div>
    </div>
  );
};

export default CheckoutCancelPage;
