import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // In development the API runs separately; in production it serves this build from the same origin.
  server: { port: 5173, proxy: { '/api': 'http://localhost:3000' } },
  build: { sourcemap: true },
});
