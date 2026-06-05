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
            if (id.includes('react/') || id.includes('react-dom/')) return 'vendor';
          }
        },
      },
    },
  },
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console'] : [],
  },
});
