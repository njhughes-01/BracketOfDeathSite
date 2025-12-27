import { test, expect } from "@playwright/test";

test.describe("Historical Tournament Verification", () => {
    test.setTimeout(180000);

    test("should display bracket for historical tournament", async ({ page }) => {
        const username = `testuser_${Date.now()}`;
        const email = `${username}@example.com`;
        const password = "Password123!";

        console.log(`Starting test with user: ${username}`);

        // 1. Register
        await page.goto("/register?setup=true", { waitUntil: "networkidle" });
        await page.fill("#username", username);
        await page.fill("#email", email);
        await page.fill("#firstName", "Test");
        await page.fill("#lastName", "User");
        await page.fill("#password", password);
        await page.fill("#confirmPassword", password);
        await page.click("button[type='submit']");
        console.log("Registration submitted.");

        // 2. Login Check
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(3000);

        if (page.url().includes("/login")) {
            console.log("Redirected to Login. Logging in...");
            await page.fill("#email", username);
            await page.fill("#password", password);
            await page.click("button[type='submit']");
            await page.waitForLoadState("networkidle");
        }

        // 3. Onboarding Handling
        await page.waitForTimeout(3000);

        // Check for "System Initialization" (Claim Admin)
        if (await page.getByText("System Initialization").isVisible()) {
            console.log("Claiming Admin...");
            await page.getByText("Initialize System").click();
            await page.waitForTimeout(3000);
        }

        // Check for "Complete Your Profile"
        if (page.url().includes("/onboarding")) {
            console.log("Onboarding page detected.");
            // Wait for either form or success
            try {
                const genderSelect = page.locator("select[name='gender']");
                await expect(genderSelect).toBeVisible({ timeout: 10000 });
                await genderSelect.selectOption({ value: "male" });
                await page.click("button[type='submit']");
                console.log("Profile completed.");
                await page.waitForTimeout(3000);
            } catch (e) {
                console.log("Profile form not found/needed or already completed.");
            }
        }

        // 4. Navigate to Tournaments
        console.log("Navigating to Tournaments...");

        // Try UI Navigation first
        const tournamentsLink = page.getByRole('link', { name: /Tournaments/i });
        if (await tournamentsLink.isVisible()) {
            await tournamentsLink.click();
        } else {
            await page.goto("/tournaments");
        }

        await expect(page).toHaveURL(/\/tournaments/);
        await expect(page.getByRole('heading', { name: "Tournaments", exact: true })).toBeVisible({ timeout: 15000 });

        // 5. Find valid tournament (Iterative)
        console.log("Searching for tournament with bracket details...");

        const cards = page.locator("a[href^='/tournaments/']");
        await cards.first().waitFor({ state: "visible", timeout: 10000 }); // Wait for at least one card

        const count = await cards.count();
        let verified = false;

        console.log(`Found ${count} tournaments total.`);

        for (let i = 0; i < Math.min(count, 5); i++) {
            const text = await cards.nth(i).innerText();

            // Skip empty tournaments
            if (text.includes("0 Players") || !text.includes("Players")) {
                console.log(`Skipping index ${i} (No players)`);
                continue;
            }

            const title = text.split('\n')[2] || "Unknown";
            console.log(`Checking Tournament ${i}: ${title}`);

            await cards.nth(i).click();
            await page.waitForTimeout(2000);
            await expect(page.getByText("Overview")).toBeVisible();

            // Check Bracket
            try {
                await page.getByRole('button', { name: 'Bracket' }).click();
            } catch (e) {
                await page.getByText("Bracket", { exact: true }).click();
            }
            await page.waitForTimeout(1000);

            const notAvailable = await page.getByText("Bracket data not available").isVisible();
            const pending = await page.getByText("Bracket pending generation").isVisible();
            const noMatches = await page.getByText("No Bracket Matches").isVisible();

            if (notAvailable || pending || noMatches) {
                console.log(`Tournament ${title} has no bracket data. Back to list.`);
                await page.getByRole('link', { name: /Tournaments/i }).click(); // UI Back
                await page.waitForTimeout(2000);
                continue;
            }

            const hasRounds = await page.getByText(/Final|Semifinal|Quarterfinal/i).count() > 0;
            if (hasRounds) {
                console.log(`SUCCESS: Tournament ${title} has valid bracket!`);
                verified = true;
                break;
            } else {
                console.log(`Tournament ${title} bracket content not found. Back to list.`);
                await page.getByRole('link', { name: /Tournaments/i }).click();
                await page.waitForTimeout(2000);
            }
        }

        if (!verified) {
            throw new Error("Failed to find ANY tournament with a valid bracket display.");
        }
        console.log("TEST PASSED.");
    });
});
