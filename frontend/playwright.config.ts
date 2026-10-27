import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  timeout: 30000,
  expect: {
    timeout: 8000
  },
  use: {
    baseURL: "http://127.0.0.1:8000",
    trace: "on-first-retry"
  },
  projects: [
    {
      name: "Desktop 1440",
      use: {
        viewport: { width: 1440, height: 900 }
      }
    },
    {
      name: "Tablet 768",
      use: {
        viewport: { width: 768, height: 1024 }
      }
    },
    {
      name: "Mobile 375",
      use: {
        viewport: { width: 375, height: 667 }
      }
    }
  ],
  webServer: {
    command: "python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000",
    cwd: "..",
    url: "http://127.0.0.1:8000/api/health",
    reuseExistingServer: true,
    timeout: 20000
  }
});
