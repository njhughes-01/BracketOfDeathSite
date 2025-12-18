import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-background-dark p-4">
      <div className="text-center max-w-lg mx-auto">

        {/* Animated 404 Visual */}
        <div className="relative w-40 h-40 mx-auto mb-8">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="relative bg-[#1c2230] w-full h-full rounded-full border border-white/10 flex items-center justify-center shadow-xl shadow-black/50">
            <span className="text-8xl select-none">🎾</span>
            <div className="absolute -bottom-2 -right-2 bg-red-500 text-white font-bold text-xs px-2 py-1 rounded-md border border-red-400 rotate-12">
              OUT!
            </div>
          </div>
        </div>

        <h1 className="text-6xl font-black text-white mb-2 tracking-tighter">404</h1>
        <h2 className="text-2xl font-bold text-slate-300 mb-6">
          Page Not Found
        </h2>
        <p className="text-slate-500 mb-10 text-lg leading-relaxed">
          The ball is out of bounds. The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            to="/"
            className="w-full py-4 bg-primary text-black font-bold rounded-xl hover:bg-primary-dark hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
          >
            Return Home
          </Link>

          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/tournaments"
              className="py-3 bg-white/5 text-white font-bold rounded-xl border border-white/10 hover:bg-white/10 transition-all text-sm"
            >
              Tournaments
            </Link>
            <Link
              to="/players"
              className="py-3 bg-white/5 text-white font-bold rounded-xl border border-white/10 hover:bg-white/10 transition-all text-sm"
            >
              Players
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;