import React from "react";

const QUICK_FACTS = [
  { icon: "sports_tennis", text: "11-game pro-sets, regular scoring with deuces and ads" },
  { icon: "shuffle", text: "Random partner assignment via lottery drawing" },
  { icon: "groups", text: "16 teams per tournament, round robin into single elimination" },
  { icon: "timer", text: "~90 minutes per match, 7 matches to win it all" },
  { icon: "play_arrow", text: "Let serves are played — no replays" },
  { icon: "new_releases", text: "New can of balls for every match" },
  { icon: "emoji_events", text: "Winners get a trophy, T-shirt, and eternal bragging rights" },
];

const AboutSection: React.FC = () => (
  <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
    <div className="flex items-center gap-3 mb-8">
      <span className="material-symbols-outlined text-3xl text-accent">
        info
      </span>
      <h2 className="text-3xl font-bold">What is the Bracket of Death?</h2>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-card-dark border border-white/5 rounded-2xl p-8 space-y-4">
        <p className="text-slate-300 text-lg leading-relaxed">
          The BOD is an entire tennis tournament compressed into one day — the largest endurance tennis tournament in the world. The more you win, the more you play. The more you play, the more fatigued you become. The more fatigued you become, the harder it is to win.
        </p>
        <p className="text-slate-400 leading-relaxed">
          It's doubles with randomly assigned partners, determined by a lottery-style drawing. Every team plays a round robin stage (3 matches), then all teams advance to a single-elimination Round of 16. Each match is an 11-game pro-set, first to 11 by 2, with a Coman tiebreaker at 10-10.
        </p>
        <p className="text-slate-400 leading-relaxed">
          Expect to play around 80 games of tennis — equivalent to 7-8 sets — no matter what. Champions often play 117+ games. Bracket. Of. Death.
        </p>
      </div>
      <div className="bg-card-dark border border-white/5 rounded-2xl p-8 space-y-4">
        <h3 className="text-xl font-bold text-white mb-3">Quick Facts</h3>
        <ul className="space-y-3">
          {QUICK_FACTS.map((item, i) => (
            <li key={item.icon} className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary text-lg mt-0.5 shrink-0">
                {item.icon}
              </span>
              <span className="text-slate-300">{item.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </section>
);

export default AboutSection;
