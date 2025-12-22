import { test, expect } from '@playwright/test';

test.describe('User Edit Functionality', () => {
    test('admin can edit user details', async ({ page }) => {
        test.setTimeout(90000); // 90 seconds timeout
        console.log('Starting E2E Test: Admin Edit User');

        // 1. Log in as admin
        await page.goto('/login');
        console.log('Navigated to /login');

        // Use correct selector for email
        await page.fill('input[name="email"]', 'admin');
        await page.fill('input[name="password"]', 'admin123');
        await page.click('button[type="submit"]');
        console.log('Submitted login form');

        // Wait for login to complete (relaxed selector)
        await expect(page.getByRole('link', { name: 'Admin' })).toBeVisible({ timeout: 20000 });
        console.log('Login successful, Admin menu visible');

        // 2. Navigate to User Management
        await page.goto('/admin/users');
        console.log('Navigated to /admin/users');
        await expect(page.getByText('User Management')).toBeVisible();

        // 3. Find a target user to edit. 
        // Wait for loading to finish
        // Check if loading text is present and wait for it to detach
        const loader = page.getByText('Loading users...');
        if (await loader.isVisible()) {
            await expect(loader).toBeHidden({ timeout: 15000 });
        }

        // Wait for table rows
        await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 20000 });

        const firstRow = page.locator('table tbody tr').first();
        // Capture initial name to verify it changes later
        const originalName = await firstRow.locator('td').nth(0).textContent(); // First column is User
        console.log(`Selecting first user: ${originalName}`);

        // 4. Open User Detail Modal (Click the row)
        await firstRow.click();
        console.log('Clicked user row');

        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.getByText('User Details')).toBeVisible();
        console.log('Modal opened');

        // 5. Enter Edit Mode
        await page.getByRole('button', { name: 'Edit' }).click();
        console.log('Clicked Edit');

        // 6. Update Fields
        const suffix = Math.floor(Math.random() * 1000).toString();
        // Use a consistent prefix so we know it's a test data
        const newFirstName = `AutoTestFirst${suffix}`;
        const newLastName = `AutoTestLast${suffix}`;

        console.log(`Updating Name to: ${newFirstName} ${newLastName}`);
        await page.fill('input[name="firstName"]', newFirstName);
        await page.fill('input[name="lastName"]', newLastName);

        // Change Gender to Female
        await page.selectOption('select[name="gender"]', 'female');

        // 7. Save Changes
        await page.getByRole('button', { name: 'Save Changes' }).click();
        console.log('Clicked Save Changes');

        // 8. Verify Modal Return to View Mode
        await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible();

        // 9. Verify Data Persistence in Modal
        await expect(page.getByText(newFirstName)).toBeVisible();
        await expect(page.getByText(newLastName)).toBeVisible();
        await expect(page.getByText('Female')).toBeVisible();
        console.log('Verified change in modal');

        // 10. Close Modal and Verify in List
        // The modal likely has handling for Escape or we check for a close button if we know the selector.
        // Based on UserDetailModal implementation (not shown fully but standard modals often have close)
        // Let's try pressing Escape
        await page.keyboard.press('Escape');
        console.log('Pressed Escape to close modal');

        // Wait for modal to disappear
        await expect(page.getByRole('dialog')).toBeHidden();

        // Reload to verify backend persistence
        await page.reload();
        await expect(page.locator('table tbody tr').first()).toBeVisible();

        // Check if the user with new name exists
        await expect(page.getByText(`${newFirstName} ${newLastName}`)).toBeVisible();
        console.log('Verified persistence in list after reload');
    });
});
