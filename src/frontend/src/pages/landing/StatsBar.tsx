import React from "react";

const STATS = [
  { value: "2009", label: "Established", icon: "calendar_month" },
  { value: "43", label: "Tournaments", icon: "emoji_events" },
  { value: "480+", label: "Players", icon: "groups" },
  { value: "25K+", label: "Games Played", icon: "sports_tennis" },
];

const StatsBar: React.FC = () => (
  <section className="border-y border-white/5 bg-card-dark/50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        {STATS.map((stat) => (
          <div key={stat.label}>
            <span className="material-symbols-outlined text-2xl text-accent mb-2 block">
              {stat.icon}
            </span>
            <div className="text-3xl sm:text-4xl font-bold text-white mb-1">
              {stat.value}
            </div>
            <div className="text-sm text-slate-400 uppercase tracking-wider">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default StatsBar;
