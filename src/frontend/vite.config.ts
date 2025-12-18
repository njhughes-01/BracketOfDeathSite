/// <reference types="vitest" />
import { defineConfig } from 'vitest/config' // restart trigger v3
import react from '@vitejs/plugin-react'

const allowedHosts = process.env.VITE_ALLOWED_HOSTS?.split(',') || ['localhost']

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts,
    proxy: {
      '/api': {
        target: process.env.PROXY_TARGET || 'http://localhost:3000',
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
