/// <reference types="vitest" />
import { defineConfig, configDefaults } from "vitest/config"; // restart trigger v3
import react from "@vitejs/plugin-react";

const allowedHostsEnv = process.env.VITE_ALLOWED_HOSTS;
const appUrlEnv = process.env.APP_URL;
const corsOriginEnv = process.env.CORS_ORIGIN;

const deriveAllowedHosts = () => {
  const hosts = new Set<string>();
  hosts.add("localhost"); // Always allow localhost

  if (appUrlEnv) {
    try {
      const url = new URL(appUrlEnv);
      hosts.add(url.hostname);
    } catch (e) {
      console.warn("Invalid APP_URL:", appUrlEnv);
    }
  }

  if (corsOriginEnv) {
    corsOriginEnv.split(",").forEach((origin) => {
      try {
        const url = new URL(origin.trim());
        hosts.add(url.hostname);
      } catch (e) {
        // handle case where origin might be just a host (though standard is URI)
        // or if it's invalid
        if (origin.trim()) hosts.add(origin.trim().replace(/^https?:\/\//, ""));
      }
    });
  }

  if (allowedHostsEnv) {
    if (allowedHostsEnv === "true" || allowedHostsEnv === "all") return true;
    allowedHostsEnv
      .split(",")
      .forEach((h) => hosts.add(h.trim().replace(/^https?:\/\//, "")));
  }

  return Array.from(hosts);
};

const allowedHosts = deriveAllowedHosts();

// Derive Keycloak config from VITE_ vars or fallback to base vars or defaults
const keycloakRealm =
  process.env.VITE_KEYCLOAK_REALM ||
  process.env.KEYCLOAK_REALM ||
  "bracketofdeathsite";
const keycloakClientId =
  process.env.VITE_KEYCLOAK_CLIENT_ID ||
  process.env.KEYCLOAK_CLIENT_ID ||
  "bod-app";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Expose derived variables to the client
    "import.meta.env.VITE_KEYCLOAK_REALM": JSON.stringify(keycloakRealm),
    "import.meta.env.VITE_KEYCLOAK_CLIENT_ID": JSON.stringify(keycloakClientId),
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true,
    exclude: [...configDefaults.exclude, "tests/e2e/**"],
  },
  server: {
    host: "0.0.0.0",
    port: parseInt(process.env.VITE_PORT || "5173"),
    allowedHosts,
    proxy: {
      "/api": {
        target:
          process.env.PROXY_TARGET ||
          `http://localhost:${process.env.PORT || 3000}`,
        changeOrigin: true,
        secure: false,
      },
      "/auth/realms": {
        target: process.env.KEYCLOAK_PROXY_TARGET || "http://localhost:8080",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/auth/, ""),
      },
      "/auth/resources": {
        target: process.env.KEYCLOAK_PROXY_TARGET || "http://localhost:8080",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/auth/, ""),
      },
      "/auth/js": {
        target: process.env.KEYCLOAK_PROXY_TARGET || "http://localhost:8080",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/auth/, ""),
      },
      "/auth/robots.txt": {
        target: process.env.KEYCLOAK_PROXY_TARGET || "http://localhost:8080",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/auth/, ""),
      },
    },
  },
});
