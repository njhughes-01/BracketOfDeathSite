import React from "react";
import { Link } from "react-router-dom";

interface BottomCtaProps {
  brandPrimaryColor: string;
}

const BottomCta: React.FC<BottomCtaProps> = ({ brandPrimaryColor }) => (
  <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 mb-8">
    <div
      className="relative rounded-2xl overflow-hidden border border-white/5 p-10 sm:p-14 text-center"
      style={{
        background: `linear-gradient(135deg, ${brandPrimaryColor}15, transparent 60%)`,
      }}
    >
      <h2 className="text-3xl sm:text-4xl font-bold mb-4">
        Ready to Compete?
      </h2>
      <p className="text-slate-400 text-lg mb-8 max-w-lg mx-auto">
        Create your account and join the next Bracket of Death tournament.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link
          to="/register"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg text-background-dark bg-accent hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-accent/20"
        >
          <span className="material-symbols-outlined">person_add</span>
          Register Now
        </Link>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg border border-white/20 text-white hover:bg-white/5 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined">login</span>
          Login
        </Link>
      </div>
    </div>
  </section>
);

export default BottomCta;
