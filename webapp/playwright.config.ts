import { defineConfig, devices } from '@playwright/test';

process.env.DATABASE_URL ??= 'postgres://root:password@127.0.0.1:5433/sample';
process.env.E2E_USER_ID ??= 'local-e2e-user';
process.env.E2E_USER_EMAIL ??= 'e2e@example.com';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3010',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npx next dev --turbopack --hostname 127.0.0.1 -p 3010',
    url: 'http://127.0.0.1:3010',
    reuseExistingServer: true,
    env: {
      ...process.env,
      APP_ENV: 'local',
      E2E_AUTH_BYPASS: 'true',
      E2E_USER_ID: process.env.E2E_USER_ID,
      E2E_USER_EMAIL: process.env.E2E_USER_EMAIL,
      NEXT_PUBLIC_DISABLE_EVENT_BUS: 'true',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
