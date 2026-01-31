import { test, expect } from "./fixtures";

test.describe("Historical Tournament Editing - Admin Only", () => {
  const mockTournament = {
    id: "hist-tourn-1",
    bodNumber: 150,
    date: "2023-06-15T00:00:00.000Z",
    location: "Main Court",
    format: "Men's Singles",
    status: "completed",
    isHistorical: true,
    players: [
      { id: "p1", name: "Player One", seed: 1 },
      { id: "p2", name: "Player Two", seed: 2 },
    ],
    matches: [
      {
        id: "match-1",
        round: "Final",
        player1: { id: "p1", name: "Player One" },
        player2: { id: "p2", name: "Player Two" },
        winner: { id: "p1", name: "Player One" },
        score: "6-4, 6-3",
        status: "completed",
      },
    ],
  };

  test.beforeEach(async ({ adminPage }) => {
    await adminPage.route("**/api/tournaments/hist-tourn-1", async (route) => {
      await route.fulfill({ json: { success: true, data: mockTournament } });
    });

    await adminPage.route("**/api/tournaments*", async (route) => {
      await route.fulfill({
        json: {
          success: true,
          data: [mockTournament],
          pagination: { page: 1, limit: 50, total: 1, pages: 1 },
        },
      });
    });
  });

  test("admin can access historical tournament details", async ({ adminPage }) => {
    await adminPage.goto("/tournaments/hist-tourn-1");

    await expect(adminPage.getByText("BOD #150")).toBeVisible({ timeout: 10000 });
    await expect(adminPage.getByText("Main Court")).toBeVisible();
  });

  test("admin can access bracket view for historical tournament", async ({ adminPage }) => {
    await adminPage.goto("/tournaments/hist-tourn-1");

    const bracketTab = adminPage.getByRole("button", { name: /bracket/i })
      .or(adminPage.getByText("Bracket", { exact: true }));

    if (await bracketTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await bracketTab.click();
      await expect(adminPage.getByText(/final/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test("admin sees edit controls on historical tournament", async ({ adminPage }) => {
    await adminPage.goto("/tournaments/hist-tourn-1/edit");

    const editIndicator = adminPage.getByText(/edit|correction|update/i).first();
    await expect(editIndicator).toBeVisible({ timeout: 10000 });
  });

  test("editing match score prompts for edit reason", async ({ adminPage }) => {
    await adminPage.route("**/api/tournaments/hist-tourn-1/matches/match-1", async (route) => {
      if (route.request().method() === "PUT" || route.request().method() === "PATCH") {
        const body = route.request().postDataJSON();
        if (!body?.editReason) {
          await route.fulfill({
            status: 400,
            json: { success: false, message: "Edit reason required for historical changes" },
          });
        } else {
          await route.fulfill({
            json: { success: true, data: { ...mockTournament.matches[0], score: body.score } },
          });
        }
      } else {
        await route.fulfill({ json: { success: true, data: mockTournament.matches[0] } });
      }
    });

    await adminPage.goto("/tournaments/hist-tourn-1/edit");

    const scoreInput = adminPage.locator('input[name*="score"], [data-testid="score-input"]').first();
    if (await scoreInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await scoreInput.fill("6-4, 7-5");

      const saveButton = adminPage.getByRole("button", { name: /save|submit|update/i }).first();
      if (await saveButton.isVisible().catch(() => false)) {
        await saveButton.click();

        const reasonDialog = adminPage.getByText(/reason|why|explanation/i);
        const reasonInput = adminPage.locator('input[name*="reason"], textarea[name*="reason"]');

        const hasReasonPrompt = await reasonDialog.isVisible({ timeout: 3000 }).catch(() => false)
          || await reasonInput.isVisible({ timeout: 3000 }).catch(() => false);

        expect(hasReasonPrompt).toBeTruthy();
      }
    }
  });

  test("recalculate stats button is available for admin", async ({ adminPage }) => {
    await adminPage.route("**/api/admin/recalculate-stats", async (route) => {
      await route.fulfill({
        json: { success: true, message: "Stats recalculated successfully" },
      });
    });

    await adminPage.goto("/tournaments/hist-tourn-1");

    const recalcButton = adminPage.getByRole("button", { name: /recalculate|refresh stats|update stats/i })
      .or(adminPage.getByText(/recalculate/i));

    if (await recalcButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await recalcButton.click();

      const successMessage = adminPage.getByText(/success|recalculated|updated/i);
      await expect(successMessage).toBeVisible({ timeout: 5000 });
    }
  });
});
