/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';

const deployTarget = process.env.DEPLOY_TARGET || 'gas';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Only use singlefile plugin for GAS deployment (not during Vitest)
    ...(deployTarget === 'gas' && !process.env.VITEST ? [viteSingleFile()] : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    // Inject deploy target into the app so gas.ts can detect environment
    'import.meta.env.VITE_DEPLOY_TARGET': JSON.stringify(deployTarget),
  },
  build: deployTarget === 'gas'
    ? {
        outDir: 'backend', // Build hasil kompilasi langsung diarahkan ke root folder backend
        emptyOutDir: false, // Jangan menghapus code backend lain seperti Code.gs saat build frontend
      }
    : {
        outDir: 'dist', // Normal build output for Vercel
      },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['src/components/ui/**', 'src/assets/**', 'node_modules/**', 'src/test/**'],
    },
  },
});
