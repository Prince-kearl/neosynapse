import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT || 4173);
const baseURL = process.env.E2E_BASE_URL || `http://127.0.0.1:${port}`;
const hasE2ECredentials = Boolean(
  (process.env.E2E_PATIENT_EMAIL && process.env.E2E_PATIENT_PASSWORD) ||
  (process.env.E2E_PROFESSIONAL_EMAIL && process.env.E2E_PROFESSIONAL_PASSWORD),
);

export default defineConfig({
  testDir: "./e2e",
  outputDir: "test-results",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  reporter: process.env.CI
    ? [["line"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    channel: "chrome",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "en-GH",
    timezoneId: "Africa/Accra",
  },
  projects: [
    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 7"],
        channel: "chrome",
      },
    },
  ],
  webServer: process.env.E2E_BASE_URL || !hasE2ECredentials
    ? undefined
    : {
        command: `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
