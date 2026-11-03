import { defineConfig } from '@playwright/test';

/**
 * Smoke test against the REAL backend (no mocks): fresh SQLite DB → migrate → Fastify on API_PORT,
 * built frontend served by `vite preview` on WEB_PORT with /api proxied to the backend.
 */
const API_PORT = Number(process.env.SMOKE_API_PORT ?? 4410);
const WEB_PORT = Number(process.env.SMOKE_WEB_PORT ?? 4411);
const DATA = process.env.SMOKE_DATA_DIR ?? `/tmp/devyard-smoke-${process.pid}`;
const web = `http://127.0.0.1:${WEB_PORT}`;

const backendEnv = [
  'NODE_ENV=development',
  'DEVYARD_HOST=127.0.0.1',
  `DEVYARD_PORT=${API_PORT}`,
  `DEVYARD_DATA_DIR=${DATA}`,
  `DEVYARD_DB_PATH=${DATA}/devyard.sqlite`,
  'DEVYARD_COOKIE_SECURE=false',
  `DEVYARD_PUBLIC_ORIGINS=${web}`,
  'DEVYARD_LOG_LEVEL=warn',
].join(' ');

export default defineConfig({
  testDir: './e2e-smoke',
  timeout: 60_000,
  workers: 1,
  use: { baseURL: web, viewport: { width: 1440, height: 900 } },
  webServer: [
    {
      command: `rm -rf ${DATA} && mkdir -p ${DATA} && cd ../backend && env ${backendEnv} npx tsx src/db/migrate.ts && env ${backendEnv} npx tsx src/server.ts`,
      url: `http://127.0.0.1:${API_PORT}/api/v1/health`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `npx vite preview --host 127.0.0.1 --port ${WEB_PORT} --strictPort`,
      env: { DEVYARD_API_URL: `http://127.0.0.1:${API_PORT}` },
      url: web,
      reuseExistingServer: false,
    },
  ],
});
