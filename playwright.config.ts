import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  reporter: "line",
  outputDir: "test-results",
  use: {
    baseURL: "http://localhost:5180",
    headless: true,
    browserName: "chromium",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5180",
    reuseExistingServer: !process.env["CI"],
    timeout: 60_000,
  },
});
