import { defineConfig } from '@playwright/test';

/** E2E + a11y + screenshot runs against `vite preview` with the API mocked per test (page.route). */
const port = Number(process.env.E2E_PORT ?? 4319);

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: { baseURL: `http://127.0.0.1:${port}`, colorScheme: 'dark' },
  webServer: {
    command: `npx vite preview --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
  },
});
