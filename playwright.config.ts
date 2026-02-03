import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5174';
const authDir = path.join(__dirname, 'tests/e2e/.auth');

export default defineConfig({
    testDir: './tests/e2e',
    testIgnore: ['**/initialization-flow.spec.js', '**/automated-initialization-flow.spec.js', '**/global-setup.ts'],
    globalSetup: process.env.PLAYWRIGHT_BASE_URL ? undefined : './tests/e2e/global-setup.ts',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: process.env.CI ? [['github'], ['html']] : 'html',
    use: {
        baseURL,
        trace: 'on-first-retry',
        actionTimeout: 15000,
        navigationTimeout: 30000,
    },
    projects: [
        {
            name: 'chromium-admin',
            use: { 
                ...devices['Desktop Chrome'],
                storageState: path.join(authDir, 'admin.json'),
            },
            testMatch: /registration\.spec\.ts/,
        },
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
            testIgnore: /registration\.spec\.ts/,
        },
    ],
});
