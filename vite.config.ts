import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  server: {
    proxy: {
      '/api/naver': {
        target: 'https://finance.naver.com',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/api\/naver/, ''),
      },
    },
  },
});
