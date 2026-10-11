const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests/browser',
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? 'github' : 'list',
    globalSetup: './tests/global-setup.js',
    use: {
        baseURL: 'http://127.0.0.1:4174',
        trace: 'retain-on-failure',
        ...devices['Desktop Chrome']
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
});

