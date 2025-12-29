import { chromium } from 'playwright';

async function testTournamentStats() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('Navigating to login page...');
    await page.goto('http://localhost:5173/login');
    await page.waitForTimeout(3000);

    // Check if we're on Keycloak login
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    // Wait for either local login form or Keycloak
    if (currentUrl.includes('keycloak') || currentUrl.includes(':8080')) {
        console.log('On Keycloak login page...');
        // Keycloak form
        await page.fill('#username', 'killerherts');
        await page.fill('#password', 'Killpop2#');
        await page.click('#kc-login');
    } else {
        console.log('On local login page...');
        // Try various selectors for username/password
        const usernameInput = page.locator('input[name="username"], input[type="email"], input[id="username"]').first();
        const passwordInput = page.locator('input[name="password"], input[type="password"]').first();

        if (await usernameInput.isVisible({ timeout: 5000 })) {
            await usernameInput.fill('killerherts');
            await passwordInput.fill('Killpop2#');
            const submitBtn = page.locator('button[type="submit"]').first();
            await submitBtn.click();
        }
    }

    await page.waitForTimeout(4000);
    console.log('After login URL:', page.url());

    // Navigate to tournaments page
    console.log('Navigating to tournaments...');
    await page.goto('http://localhost:5173/tournaments');
    await page.waitForTimeout(3000);

    // Take screenshot of list page
    await page.screenshot({ path: 'test-tournament-list.png' });
    console.log('Screenshot saved: test-tournament-list.png');

    // Collect stats from multiple tournaments
    const tournamentStats: { bodNumber: string; teams: string; totalGames: string; rrGames: string; bracketGames: string }[] = [];

    // Test different tournaments
    const tournamentsToTest = ['42', '40', '38'];

    for (const bodNum of tournamentsToTest) {
        console.log(`\n=== Testing BOD #${bodNum} ===`);

        // Navigate directly to tournament
        await page.goto('http://localhost:5173/tournaments');
        await page.waitForTimeout(2000);

        // Click on tournament card containing BOD #N
        const card = page.locator(`text=BOD #${bodNum}`).first();
        if (await card.isVisible({ timeout: 3000 }).catch(() => false)) {
            await card.click();
            await page.waitForTimeout(3000);

            // Take screenshot
            await page.screenshot({ path: `test-bod-${bodNum}.png` });
            console.log(`Screenshot saved: test-bod-${bodNum}.png`);

            // Try to find the Tournament Statistics section
            const pageContent = await page.content();

            if (pageContent.includes('Tournament Statistics')) {
                console.log('  ✅ Tournament Statistics section found!');

                // Extract the numeric values from the stats grid
                const allText = await page.locator('.bg-background-dark').allTextContents();
                console.log('  Stats found:', allText.slice(0, 8).join(', '));

                // Find specific values
                const teamsEl = await page.locator('p:has-text("Teams")').locator('..').locator('p.text-2xl').first();
                const totalGamesEl = await page.locator('p:has-text("Total Games")').locator('..').locator('p.text-2xl').first();
                const rrEl = await page.locator('p:has-text("Round Robin")').locator('..').locator('p.text-2xl').first();
                const bracketEl = await page.locator('p:has-text("Bracket Games")').locator('..').locator('p.text-2xl').first();

                const teams = await teamsEl.textContent().catch(() => '?');
                const totalGames = await totalGamesEl.textContent().catch(() => '?');
                const rrGames = await rrEl.textContent().catch(() => '?');
                const bracketGames = await bracketEl.textContent().catch(() => '?');

                console.log(`  Teams: ${teams}`);
                console.log(`  Total Games: ${totalGames}`);
                console.log(`  RR Games: ${rrGames}`);
                console.log(`  Bracket Games: ${bracketGames}`);

                tournamentStats.push({
                    bodNumber: bodNum,
                    teams: teams || '?',
                    totalGames: totalGames || '?',
                    rrGames: rrGames || '?',
                    bracketGames: bracketGames || '?',
                });
            } else {
                console.log('  ❌ Tournament Statistics section NOT found');
                tournamentStats.push({
                    bodNumber: bodNum,
                    teams: 'N/A',
                    totalGames: 'N/A',
                    rrGames: 'N/A',
                    bracketGames: 'N/A',
                });
            }
        } else {
            console.log(`  BOD #${bodNum} card not found on page`);
        }
    }

    // Print summary
    console.log('\n============================');
    console.log('=== SUMMARY ===');
    console.log('============================');
    tournamentStats.forEach(s => {
        console.log(`BOD #${s.bodNumber}: Teams=${s.teams}, Total=${s.totalGames}, RR=${s.rrGames}, Bracket=${s.bracketGames}`);
    });

    // Check if all stats are identical (bug indicator)
    if (tournamentStats.length >= 2) {
        const allSame = tournamentStats.every(s =>
            s.totalGames === tournamentStats[0].totalGames &&
            s.rrGames === tournamentStats[0].rrGames
        );
        if (allSame) {
            console.log('\n⚠️ WARNING: All tournaments have IDENTICAL stats - BUG DETECTED!');
        } else {
            console.log('\n✅ SUCCESS: Stats vary correctly between tournaments');
        }
    }

    await page.waitForTimeout(3000);
    await browser.close();
    console.log('\nTest complete!');
}

testTournamentStats().catch(console.error);
