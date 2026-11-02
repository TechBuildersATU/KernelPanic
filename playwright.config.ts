import { defineConfig, devices } from '@playwright/test'

// Booth tablet profile (same Android tablet as BuildArena): landscape 1280×800 with touch.
const tablet = {
  ...devices['Desktop Chrome'],
  viewport: { width: 1280, height: 800 },
  hasTouch: true,
  locale: 'tr-TR',
}

const DEV_URL = 'http://localhost:5174'
const PREVIEW_URL = 'http://localhost:4174'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // The dev machine has limited free RAM; more parallel browsers starve fake-clock specs.
  workers: process.env.CI ? 2 : 6,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Everyday flows against the dev server (test-only URL flags enabled).
    { name: 'tablet', testIgnore: /\.pwa\.spec\.ts$/, use: { ...tablet, baseURL: DEV_URL } },
    // Production build + service worker: offline launch.
    { name: 'tablet-pwa', testMatch: /\.pwa\.spec\.ts$/, use: { ...tablet, baseURL: PREVIEW_URL } },
  ],
  // Ports differ from BuildArena (5173/4173), so both projects can be tested at the same time.
  webServer: [
    {
      command: 'npm run dev -- --port 5174 --strictPort',
      url: DEV_URL,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run build && npm run preview -- --port 4174 --strictPort',
      url: PREVIEW_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
})
