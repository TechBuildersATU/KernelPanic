/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
// `--mode android` builds the web app for the APK (Capacitor, later): the files ship inside the
// app, so the offline service worker is left out there.
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // Offline launch + full screen kiosk on the booth tablet (docs/ROADMAP.md §8)
    VitePWA({
      disable: mode === 'android',
      registerType: 'autoUpdate',
      includeAssets: ['logo/techbuilders_logo.png', 'icons/favicon-48.png', 'icons/icon-180.png'],
      manifest: {
        name: 'KERNEL PANIC · ATÜ TechBuilders',
        short_name: 'KERNEL PANIC',
        description: 'Basma dedik. Bastın. Beş aşamada sistemi kurtar.',
        lang: 'tr',
        start_url: '/',
        scope: '/',
        display: 'fullscreen',
        orientation: 'landscape',
        background_color: '#090E1D',
        theme_color: '#090E1D',
        // made from the club logo master (store/logo/)
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2,json}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // BuildArena uses 5173/4173; these ports let both projects run at the same time.
  server: { port: 5174 },
  preview: { port: 4174 },
  build: {
    // One chunk is fine for an offline kiosk: the service worker precaches everything.
    chunkSizeWarningLimit: 800,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
}))
