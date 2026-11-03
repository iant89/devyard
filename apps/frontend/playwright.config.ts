import { defineConfig } from '@playwright/test';

/** E2E + a11y + screenshot runs against `vite preview` with the API mocked per test (page.route). */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: { baseURL: 'http://127.0.0.1:4319', colorScheme: 'dark' },
  webServer: {
    command: 'npx vite preview --host 127.0.0.1 --port 4319 --strictPort',
    url: 'http://127.0.0.1:4319',
    reuseExistingServer: !process.env.CI,
  },
});
