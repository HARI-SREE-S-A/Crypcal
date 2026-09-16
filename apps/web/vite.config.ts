import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2022',
    // 'hidden' generates source maps for error-tracking (Sentry) but doesn't
    // expose them to the browser, preventing reverse engineering of source code
    sourcemap: 'hidden',
    rollupOptions: {
      output: {
        manualChunks: {
          // Keep crypto WASM separate from main bundle
          'matrix-crypto': ['@matrix-org/matrix-sdk-crypto-wasm'],
          'matrix-sdk': ['matrix-js-sdk'],
          'livekit': ['livekit-client'],
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['@matrix-org/matrix-sdk-crypto-wasm'],
  },
  server: {
    port: 5173,
    // Proxy to local Caddy in development
    proxy: {
      '/_matrix': {
        target: 'https://localhost',
        changeOrigin: true,
        secure: false,
      },
      '/lk-jwt': {
        target: 'https://localhost',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  // Enable WASM support
  worker: {
    format: 'es',
  },
});
