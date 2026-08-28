import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    // Directory where your tests are located (matching your current setup)
    testDir: './e2e',

    // Run all tests in parallel for speed
    fullyParallel: true,

    // Fail the build on CI if you accidentally left test.only in the source code
    forbidOnly: !!process.env.CI,

    // Retry on CI only
    retries: process.env.CI ? 2 : 0,

    // Opt out of parallel tests on CI.
    workers: process.env.CI ? 1 : undefined,

    // Reporter to use. The HTML reporter is great for viewing results and traces
    reporter: 'html',

    use: {
        // The base URL used by page.goto('/')
        baseURL: 'http://localhost:3000',

        // Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer
        trace: 'on-first-retry',

        // Automatically capture screenshots on failure
        screenshot: 'only-on-failure',
    },

    // Configure projects for major browsers
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        /* Uncomment these if you want to test cross-browser:
        {
          name: 'firefox',
          use: { ...devices['Desktop Firefox'] },
        },
        {
          name: 'webkit',
          use: { ...devices['Desktop Safari'] },
        },
        */
    ],

    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
    },
});