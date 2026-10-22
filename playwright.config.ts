import { defineConfig, devices } from '@playwright/test';

/** Smoke tests against the exported web build (npm run build:web first). */
export default defineConfig({
  testDir: './tests',
  timeout: 45_000,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: 'http://localhost:4173', ...devices['iPhone 13'], browserName: 'chromium' },
  webServer: { command: 'npx --yes serve@14.2.4 dist -s -l 4173', port: 4173, reuseExistingServer: true, timeout: 60_000 },
});
