import { defineConfig, devices } from '@playwright/test';

// E2E against the app in LOCAL test mode (local Postgres + demo seed). Uses Microsoft Edge, which every
// Windows PC has, so no browser download is needed; CI uses Playwright's Chromium.
const port = Number(process.env.E2E_PORT ?? 3100);
const channel = process.env.CI ? undefined : 'msedge';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  outputDir: '.local/e2e-results',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel, viewport: { width: 1440, height: 900 } } },
    { name: 'phone', use: { ...devices['Pixel 7'], channel, viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: `node apps/web/scripts/dev-local.mjs`,
    env: { PORT: String(port), APP_URL: `http://localhost:${port}`, DATABASE_URL: 'postgres://postgres@127.0.0.1:54329/hub_e2e' },
    url: `http://localhost:${port}/api/health`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
