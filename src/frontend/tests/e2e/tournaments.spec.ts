import { test, expect } from '@playwright/test';

test.describe('Tournaments Page', () => {
    test.beforeEach(async ({ page }) => {
        // Mock successful API response for tournaments list
        await page.route('**/api/tournaments*', async route => {
            const json = {
                success: true,
                data: [
                    {
                        id: '1',
                        bodNumber: 201,
                        date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
                        location: 'Arena A',
                        format: 'Mixed Doubles',
                        status: 'scheduled'
                    },
                    {
                        id: '2',
                        bodNumber: 199,
                        date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
                        location: 'Arena B',
                        format: 'Men\'s Singles',
                        status: 'completed'
                    }
                ],
                pagination: {
                    page: 1,
                    limit: 50,
                    total: 2,
                    pages: 1
                }
            };
            await route.fulfill({ json });
        });

        await page.goto('/tournaments');
    });

    test('should display visual header', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Tournaments' })).toBeVisible();
    });

    test('should display search and filters', async ({ page }) => {
        await expect(page.getByPlaceholder('Search tournaments...')).toBeVisible();
        await expect(page.getByRole('button', { name: 'All' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Upcoming' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Past' })).toBeVisible();
    });

    test('should list tournaments', async ({ page }) => {
        await expect(page.getByText('BOD #201')).toBeVisible();
        await expect(page.getByText('BOD #199')).toBeVisible();
        await expect(page.getByText('Arena A')).toBeVisible();
    });

    test('should filter tournaments', async ({ page }) => {
        // Test search
        const searchInput = page.getByPlaceholder('Search tournaments...');
        await searchInput.fill('201');
        await expect(page.getByText('BOD #201')).toBeVisible();
        await expect(page.getByText('BOD #199')).not.toBeVisible();

        await searchInput.clear();
        await expect(page.getByText('BOD #199')).toBeVisible();

        // Test chips
        await page.getByRole('button', { name: 'Upcoming' }).click();
        await expect(page.getByText('BOD #201')).toBeVisible();
        await expect(page.getByText('BOD #199')).not.toBeVisible();

        await page.getByRole('button', { name: 'Past' }).click();
        await expect(page.getByText('BOD #201')).not.toBeVisible();
        await expect(page.getByText('BOD #199')).toBeVisible();
    });
});
