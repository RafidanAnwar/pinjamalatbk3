import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';

const deployTarget = process.env.DEPLOY_TARGET || 'gas';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Only use singlefile plugin for GAS deployment
    ...(deployTarget === 'gas' ? [viteSingleFile()] : []),
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
});
