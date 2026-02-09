import React from "react";
import { Link } from "react-router-dom";

const News: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-background-dark pb-20">
      <div className="relative h-[250px] w-full bg-surface-dark overflow-hidden shrink-0">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-overlay"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1533561797500-4fad143ca75c?q=80&w=2070&auto=format&fit=crop")',
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-black/60"></div>

        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-20">
          <Link
            to="/dashboard"
            className="size-10 rounded-full bg-black/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/20 transition-all"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
          <h1 className="text-4xl font-bold text-white shadow-black drop-shadow-md mb-2">
            News & Updates
          </h1>
          <p className="text-slate-300">Latest from the Bracket of Death</p>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto w-full text-center space-y-8">
        <div className="bg-[#1c2230] border border-white/5 rounded-2xl p-8">
          <div className="size-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
            <span className="material-symbols-outlined text-3xl">campaign</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Coming Soon</h2>
          <p className="text-slate-400 max-w-md mx-auto">
            The news feed is currently under construction. Check back later for
            match recaps, player spotlights, and tournament announcements.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 text-left">
          <Link
            to="/tournaments"
            className="bg-[#1c2230] border border-white/5 rounded-xl p-5 hover:border-primary/50 transition-all group"
          >
            <span className="material-symbols-outlined text-primary mb-3">
              trophy
            </span>
            <h3 className="text-white font-bold mb-1 group-hover:text-primary transition-colors">
              Upcoming Tournaments
            </h3>
            <p className="text-xs text-slate-500">
              View the schedule and register for events.
            </p>
          </Link>
          <Link
            to="/rankings"
            className="bg-[#1c2230] border border-white/5 rounded-xl p-5 hover:border-primary/50 transition-all group"
          >
            <span className="material-symbols-outlined text-primary mb-3">
              leaderboard
            </span>
            <h3 className="text-white font-bold mb-1 group-hover:text-primary transition-colors">
              Season Standings
            </h3>
            <p className="text-xs text-slate-500">
              Check who is leading the race for #1.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default News;
