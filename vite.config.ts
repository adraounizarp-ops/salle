import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

// Base path for GitHub Pages: https://<user>.github.io/salle/
const base = process.env.SALLE_BASE ?? '/salle/';

export default defineConfig({
  base,
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Salle — carnet de tonnage',
        short_name: 'Salle',
        description: 'Suivi de séances de musculation et de tonnage, hors-ligne.',
        lang: 'fr',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0F1114',
        theme_color: '#0F1114',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Exercise illustrations are cached on use, never precached in bulk.
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,json}'],
        globIgnores: ['ex/**'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/ex/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'exercise-frames',
              expiration: { maxEntries: 1200, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  build: { target: 'es2022' },
});
