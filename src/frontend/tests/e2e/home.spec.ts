import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
    test.beforeEach(async ({ page }) => {
        // Mock successful API response for recent tournaments
        await page.route('**/api/tournaments/recent*', async route => {
            const json = {
                success: true,
                data: [
                    {
                        id: '1',
                        bodNumber: 101,
                        date: new Date().toISOString(),
                        location: 'Test Court 1',
                        format: 'Men\'s Singles',
                        status: 'scheduled'
                    },
                    {
                        id: '2',
                        bodNumber: 102,
                        date: new Date().toISOString(),
                        location: 'Test Court 2',
                        format: 'Women\'s Doubles',
                        status: 'upcoming'
                    }
                ]
            };
            await route.fulfill({ json });
        });

        await page.goto('/');
    });

    test('should display hero section', async ({ page }) => {
        await expect(page.locator('text=Next Match')).toBeVisible();
        await expect(page.locator('text=Quarter Finals')).toBeVisible();
    });

    test('should display quick action buttons', async ({ page }) => {
        await expect(page.getByRole('link', { name: 'Register' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Schedule' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Rankings' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'News' })).toBeVisible();
    });

    test('should display upcoming tournaments', async ({ page }) => {
        await expect(page.getByText('Upcoming Tournaments')).toBeVisible();
        // Check if mocked tournaments are rendered
        await expect(page.getByText('BOD #101')).toBeVisible();
        await expect(page.getByText('BOD #102')).toBeVisible();
    });
});
