import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/integration',
  timeout: 60000,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:5174',
    timezoneId: 'Asia/Kolkata',
    channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
    { name: 'mobile', use: { ...devices['Pixel 7'], defaultBrowserType: 'chromium' } },
  ],
  reporter: [['list']],
});
