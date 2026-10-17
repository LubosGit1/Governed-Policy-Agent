import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://policy:policy@localhost:5432/policy_assistant",
      LLM_PROVIDER: "mock",
      ADMIN_API_KEY: process.env.ADMIN_API_KEY ?? "test-admin-key",
      RATE_LIMIT_HASH_SECRET: process.env.RATE_LIMIT_HASH_SECRET ?? "playwright-rate-limit-key",
    },
  },
});
