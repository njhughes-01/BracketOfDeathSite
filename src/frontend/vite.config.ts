/// <reference types="vitest" />
import { defineConfig, configDefaults } from 'vitest/config' // restart trigger v3
import react from '@vitejs/plugin-react'

const allowedHosts = process.env.VITE_ALLOWED_HOSTS?.split(',') || ['localhost']

// Derive Keycloak config from VITE_ vars or fallback to base vars or defaults
const keycloakRealm = process.env.VITE_KEYCLOAK_REALM || process.env.KEYCLOAK_REALM || 'bracketofdeathsite';
const keycloakClientId = process.env.VITE_KEYCLOAK_CLIENT_ID || process.env.KEYCLOAK_CLIENT_ID || 'bod-app';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Expose derived variables to the client
    'import.meta.env.VITE_KEYCLOAK_REALM': JSON.stringify(keycloakRealm),
    'import.meta.env.VITE_KEYCLOAK_CLIENT_ID': JSON.stringify(keycloakClientId),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    exclude: [...configDefaults.exclude, 'tests/e2e/**'],
  },
  server: {
    host: '0.0.0.0',
    port: parseInt(process.env.VITE_PORT || '5173'),
    allowedHosts,
    proxy: {
      '/api': {
        target: process.env.PROXY_TARGET || `http://localhost:${process.env.PORT || 3000}`,
        changeOrigin: true,
        secure: false,
      },
      '/auth': {
        target: process.env.KEYCLOAK_PROXY_TARGET || 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/auth/, ''),
      }
    }
  },
})
