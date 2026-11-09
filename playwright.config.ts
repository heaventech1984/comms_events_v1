import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const PORT = Number(process.env.E2E_PORT || 3100);
const baseURL = process.env.E2E_BASE_URL || `http://127.0.0.1:${PORT}`;
const dbUrl = process.env.E2E_DATABASE_URL || "file:./data/e2e.db";

const chromeChannel = process.env.CI ? {} : { channel: "chrome" as const };

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure"
  },
  projects: [
    {
      name: "chromium-desktop",
      use: {
        ...devices["Desktop Chrome"],
        ...chromeChannel,
        viewport: { width: 1280, height: 800 }
      }
    },
    {
      name: "chromium-phone",
      use: {
        ...devices["Desktop Chrome"],
        ...chromeChannel,
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
      }
    },
    {
      name: "webkit-phone",
      use: {
        ...devices["iPhone 13"]
      }
    },
    {
      name: "chromium-candybar",
      testMatch: /mobile-matrix\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        ...chromeChannel,
        viewport: { width: 320, height: 568 },
        isMobile: true,
        hasTouch: true
      }
    },
    {
      name: "chromium-landscape",
      testMatch: /mobile-matrix\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        ...chromeChannel,
        viewport: { width: 844, height: 390 },
        isMobile: true,
        hasTouch: true
      }
    },
    {
      name: "chromium-tablet",
      testMatch: /mobile-matrix\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        ...chromeChannel,
        viewport: { width: 820, height: 1180 },
        isMobile: true,
        hasTouch: true
      }
    },
    {
      name: "firefox-desktop",
      testMatch: /mobile-matrix\.spec\.ts/,
      use: {
        ...devices["Desktop Firefox"],
        viewport: { width: 1280, height: 800 }
      }
    }
  ],
  webServer: {
    command: `npx prisma db push --skip-generate && npx tsx prisma/seed.ts && npx next dev --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    cwd: path.resolve(__dirname),
    env: {
      ...process.env,
      DATABASE_URL: dbUrl,
      SESSION_SECRET: process.env.SESSION_SECRET || "e2e-session-secret-not-for-production-0123456789",
      APP_ORIGIN: baseURL,
      NODE_ENV: "development",
      CRON_SECRET: "e2e-cron-secret",
      SEED_UI_STRESS: "1"
    }
  }
});
