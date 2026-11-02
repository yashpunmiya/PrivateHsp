import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  reporter: "list",
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:31377", ...devices["Desktop Chrome"], launchOptions: { executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" } },
});
