import { useState, useEffect } from "react";
import { apiClient } from "../services/api";
import type { PublicBranding } from "../services/api";
import logger from "../utils/logger";

const DEFAULTS: PublicBranding = {
  brandName: "Bracket of Death",
  brandPrimaryColor: "#4CAF50",
  brandSecondaryColor: "#008CBA",
  siteLogo: "",
  siteLogoUrl: "",
  favicon: "",
};

let cachedBranding: PublicBranding | null = null;

export function useBranding() {
  const [branding, setBranding] = useState<PublicBranding>(
    cachedBranding || DEFAULTS,
  );
  const [loading, setLoading] = useState(!cachedBranding);

  useEffect(() => {
    if (cachedBranding) return;

    let cancelled = false;

    const fetchBranding = async () => {
      try {
        const response = await apiClient.getPublicSettings();
        if (!cancelled && response.data) {
          cachedBranding = response.data;
          setBranding(response.data);
        }
      } catch (err) {
        logger.warn("Failed to fetch public branding settings:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchBranding();
    return () => {
      cancelled = true;
    };
  }, []);

  return { ...branding, loading };
}
