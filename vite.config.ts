import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const BASE = process.env.CDN === '1'
  ? 'https://cdn.jsdelivr.net/gh/as5551238/tbh-next@main/'
  : process.env.GH_PAGES === '1'
    ? '/tbh-next/'
    : './';

export default defineConfig({
  base: BASE,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    modulePreload: false,
    target: 'es2020',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@supabase')) return 'supabase';
            if (id.includes('@sentry')) return 'sentry';
            if (id.includes('react/') || id.includes('react-dom/')) return 'vendor';
            if (id.includes('react-router')) return 'router';
            if (id.includes('lucide-react')) return 'lucide';
            if (id.includes('zustand')) return 'state';
          }
          // AI engine modules — separate from core app
          if (id.includes('/src/lib/ai/')) return 'ai-engines';
        },
      },
    },
  },
  esbuild: {
    // DR-34 prerequisite: Only drop console if Sentry is configured.
    // If VITE_SENTRY_DSN is not set, console must remain for error visibility.
    drop: process.env.NODE_ENV === 'production' && process.env.VITE_SENTRY_DSN ? ['console', 'debugger'] : [],
  },
});
