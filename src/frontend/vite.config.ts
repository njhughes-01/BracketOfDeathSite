import { defineConfig } from 'vite' // restart trigger v3
import react from '@vitejs/plugin-react'

const allowedHosts = process.env.VITE_ALLOWED_HOSTS?.split(',') || ['localhost']

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
