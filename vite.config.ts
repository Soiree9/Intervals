import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/Intervals/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '音程、和弦与调训练',
        short_name: '和弦训练',
        description: '跨电脑与手机使用的音程、和弦与调训练工具',
        lang: 'zh-CN',
        theme_color: '#172019',
        background_color: '#eeeadd',
        display: 'standalone',
        orientation: 'any',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,mp3,woff2,md,txt}'],
        globIgnores: [
          'audio/C4.mp3', 'audio/Ds4.mp3', 'audio/Fs4.mp3', 'audio/A4.mp3',
          'audio/C5.mp3', 'audio/Ds5.mp3', 'audio/Fs5.mp3', 'audio/A5.mp3', 'audio/C6.mp3',
        ],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: 'index.html',
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 1500,
  },
  test: {
    testTimeout: 15000,
  },
})
