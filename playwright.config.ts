import { defineConfig, devices } from "@playwright/test";

// E2E runs against the local stack: `supabase start` must be running (seeded).
// It uses its own server on port 3100 with a deterministic fake AI grader, so tests never
// depend on Gemini and never touch the dev server on port 3000.
const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  // The dev server compiles routes on first hit; 5 s is too tight with two workers
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npx next dev --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      AI_PROVIDER: "fake",
      NEXT_DIST_DIR: ".next-e2e",
      NEXT_PUBLIC_SITE_URL: BASE_URL,
    },
  },
});
