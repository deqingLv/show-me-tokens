import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  root: path.resolve(__dirname, 'web'),
  build: {
    outDir: path.resolve(__dirname, 'dist/web'),
    emptyOutDir: true,
  },
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3456',
        changeOrigin: true,
      },
    },
  },
});
