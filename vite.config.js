import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3000,
    host: true, // expose on LAN so sibling devices can connect
    proxy: {
      // Forward /api requests to the WS/HTTP server in dev mode
      '/api': 'http://localhost:3001',
    },
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
})
