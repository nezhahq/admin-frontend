import { defineConfig, devices } from "@playwright/test"

const baseURL = process.env.E2E_BASE_URL || "http://localhost:5173"

export default defineConfig({
    testDir: "./tests/e2e",
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
    use: {
        baseURL,
        trace: "on-first-retry",
        screenshot: "only-on-failure",
        video: process.env.CI ? "retain-on-failure" : "off",
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
    webServer: process.env.E2E_SKIP_WEBSERVER
        ? undefined
        : {
            command: "npm run dev -- --host 127.0.0.1",
            url: baseURL + "/dashboard/login",
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
        },
})
