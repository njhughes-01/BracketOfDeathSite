import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useBranding } from "../hooks/useBranding";
import { apiClient } from "../services/api";
import type { Tournament } from "../types/api";
import logger from "../utils/logger";

import LandingHero from "./landing/LandingHero";
import StatsBar from "./landing/StatsBar";
import UpcomingTournaments from "./landing/UpcomingTournaments";
import PastTournaments from "./landing/PastTournaments";
import AboutSection from "./landing/AboutSection";
import FaqSection from "./landing/FaqSection";
import BottomCta from "./landing/BottomCta";

const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const branding = useBranding();

  const [openTournaments, setOpenTournaments] = useState<Tournament[]>([]);
  const [upcomingTournaments, setUpcomingTournaments] = useState<Tournament[]>(
    [],
  );
  const [recentTournaments, setRecentTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [openRes, upcomingRes, recentRes] = await Promise.all([
          apiClient.getOpenTournaments(),
          apiClient.getUpcomingTournaments(10),
          apiClient.getRecentTournaments(12),
        ]);
        setOpenTournaments(openRes.data || []);
        setUpcomingTournaments(upcomingRes.data || []);

        // Show past tournaments (date in the past OR status completed)
        const now = new Date();
        const past = (recentRes.data || []).filter(
          (t) => t.status === "completed" || new Date(t.date) < now,
        );
        setRecentTournaments(past.slice(0, 12));
      } catch (err) {
        logger.error("Failed to load landing page data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Merge open + upcoming, deduplicate by id, sort by date
  const futureTournaments = useMemo(() => {
    const map = new Map<string, Tournament>();
    for (const t of openTournaments) map.set(t.id || t._id, t);
    for (const t of upcomingTournaments) map.set(t.id || t._id, t);
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }, [openTournaments, upcomingTournaments]);

  const handleRegister = (tournamentId: string) => {
    if (!isAuthenticated) {
      navigate(
        `/login?returnUrl=${encodeURIComponent(`/tournaments/${tournamentId}`)}`,
      );
      return;
    }
    navigate(`/tournaments/${tournamentId}`);
  };

  return (
    <div className="min-h-screen bg-background-dark font-display text-white">
      <LandingHero branding={branding} isAuthenticated={isAuthenticated} />
      <StatsBar />
      <UpcomingTournaments
        tournaments={futureTournaments}
        loading={loading}
        onRegister={handleRegister}
      />
      <PastTournaments tournaments={recentTournaments} />
      <AboutSection />
      <FaqSection />
      {!isAuthenticated && (
        <BottomCta brandPrimaryColor={branding.brandPrimaryColor} />
      )}
    </div>
  );
};

export default LandingPage;
