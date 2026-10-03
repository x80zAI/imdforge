import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import networkHandler from './api/network.mjs';

export default defineConfig({
  plugins: [react(), {
    name: 'local-network-api',
    configureServer(server) {
      server.middlewares.use('/api/network', (req, res) => {
        void networkHandler(req, res);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/network', (req, res) => {
        void networkHandler(req, res);
      });
    }
  }],
  build: { target: 'es2022' },
  test: { include: ['tests/**/*.test.ts'], environment: 'node', testTimeout: 15000 }
});
