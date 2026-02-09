import React from "react";

const FAQ_ITEMS = [
  {
    q: "Can I pick my own partner?",
    a: "No. Your partner is determined by a lottery-style drawing process. Names go into hats, teams are randomly formed. It's a little more scientific than that (to keep teams competitive), but that's the general idea.",
  },
  {
    q: "How much tennis is it?",
    a: "A lot. With a round robin plus bracket play, you'll play at least ~80 games (about 7-8 sets worth) regardless of how far you go. If you make the finals, expect 117+ games.",
  },
  {
    q: "What happens if it rains?",
    a: "It depends. How much? How long? We've played entire tournaments in the rain. Worst case, we can't finish. This is the Tao of the Bracket of Death.",
  },
  {
    q: "What if my partner doesn't show up?",
    a: "Play starts on time whether your partner is there or not. If they're late, you cover the whole court solo. Bracket. Of. Death.",
  },
  {
    q: "What do winners get?",
    a: "Champions get a trophy, a T-shirt, and eternal bragging rights. Second place gets a medal, a T-shirt, and the pain of knowing they played all that tennis just to come in 2nd.",
  },
  {
    q: "What about refunds?",
    a: "Cancel early and refunds are possible. But after the drawing party — no refund. T-shirts, trophies, and balls are already ordered at that point.",
  },
];

const FaqSection: React.FC = () => (
  <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
    <div className="flex items-center gap-3 mb-8">
      <span className="material-symbols-outlined text-3xl text-accent">
        help
      </span>
      <h2 className="text-3xl font-bold">FAQ</h2>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {FAQ_ITEMS.map((item, i) => (
        <details
          key={i}
          className="group bg-card-dark border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-colors"
        >
          <summary className="flex items-center justify-between p-5 cursor-pointer select-none">
            <span className="font-bold text-white pr-4">{item.q}</span>
            <span className="material-symbols-outlined text-slate-400 group-open:rotate-180 transition-transform shrink-0">
              expand_more
            </span>
          </summary>
          <div className="px-5 pb-5 text-slate-400 leading-relaxed">
            {item.a}
          </div>
        </details>
      ))}
    </div>
  </section>
);

export default FaqSection;
