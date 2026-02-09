import React from "react";
import { Link } from "react-router-dom";
import type { PublicBranding } from "../../services/api";

interface LandingHeroProps {
  branding: PublicBranding & { loading: boolean };
  isAuthenticated: boolean;
}

const LandingHero: React.FC<LandingHeroProps> = ({
  branding,
  isAuthenticated,
}) => {
  const logoSrc = branding.siteLogo || branding.siteLogoUrl || null;

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-10 blur-3xl"
          style={{ backgroundColor: branding.brandPrimaryColor }}
        />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-accent opacity-5 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="text-center">
          {logoSrc && (
            <div className="flex justify-center mb-6">
              <img
                src={logoSrc}
                alt={branding.brandName}
                className="h-20 sm:h-24 w-auto object-contain"
              />
            </div>
          )}

          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-4">
            <span
              className="bg-clip-text text-transparent bg-gradient-to-r"
              style={{
                backgroundImage: `linear-gradient(to right, ${branding.brandPrimaryColor}, #DFFF00)`,
              }}
            >
              {branding.brandName}
            </span>
          </h1>

          <p className="text-xl sm:text-2xl text-slate-400 font-medium mb-10">
            Because Tennis
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg text-background-dark bg-accent hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-accent/20"
              >
                <span className="material-symbols-outlined">dashboard</span>
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg text-background-dark bg-accent hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-accent/20"
                >
                  <span className="material-symbols-outlined">person_add</span>
                  Register
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg border border-white/20 text-white hover:bg-white/5 active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined">login</span>
                  Login
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingHero;
