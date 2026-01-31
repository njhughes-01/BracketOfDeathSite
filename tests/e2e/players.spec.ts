import { test, expect } from "./fixtures";
import { test as baseTest, expect as baseExpect } from "@playwright/test";

baseTest.describe("Players Page - Public Access", () => {
  baseTest.beforeEach(async ({ page }) => {
    await page.route("**/api/players*", async (route) => {
      const json = {
        success: true,
        data: [
          {
            id: "player-1",
            name: "John Smith",
            gamesPlayed: 42,
            wins: 28,
            losses: 14,
            winningPercentage: 0.67,
            totalChampionships: 3,
          },
          {
            id: "player-2",
            name: "Jane Doe",
            gamesPlayed: 35,
            wins: 20,
            losses: 15,
            winningPercentage: 0.57,
            totalChampionships: 1,
          },
          {
            id: "player-3",
            name: "Bob Wilson",
            gamesPlayed: 50,
            wins: 40,
            losses: 10,
            winningPercentage: 0.80,
            totalChampionships: 5,
          },
        ],
        pagination: { page: 1, limit: 50, total: 3, pages: 1 },
      };
      await route.fulfill({ json });
    });
  });

  baseTest("displays player list at /players", async ({ page }) => {
    await page.goto("/players");

    await baseExpect(page.getByRole("heading", { name: "Players" })).toBeVisible();
    await baseExpect(page.getByText("John Smith")).toBeVisible();
    await baseExpect(page.getByText("Jane Doe")).toBeVisible();
    await baseExpect(page.getByText("Bob Wilson")).toBeVisible();
  });

  baseTest("displays player stats in list", async ({ page }) => {
    await page.goto("/players");

    await baseExpect(page.getByText("42 Games")).toBeVisible();
    await baseExpect(page.getByText("67% Win Rate")).toBeVisible();
  });

  baseTest("search filters players", async ({ page }) => {
    await page.goto("/players");

    const searchInput = page.getByPlaceholder("Search players...");
    await baseExpect(searchInput).toBeVisible();

    await searchInput.fill("John");
    await baseExpect(page.getByText("John Smith")).toBeVisible();
    await baseExpect(page.getByText("Jane Doe")).not.toBeVisible();
    await baseExpect(page.getByText("Bob Wilson")).not.toBeVisible();

    await searchInput.clear();
    await baseExpect(page.getByText("Jane Doe")).toBeVisible();
  });

  baseTest("sort dropdown works", async ({ page }) => {
    await page.goto("/players");

    const filterButton = page.locator('button:has(span:text("tune"))');
    await filterButton.click();

    const sortSelect = page.locator('select');
    await baseExpect(sortSelect).toBeVisible();

    await sortSelect.selectOption("-winningPercentage");
  });
});

test.describe("Players Page - Authenticated User", () => {
  test.beforeEach(async ({ userPage }) => {
    await userPage.route("**/api/players*", async (route) => {
      const json = {
        success: true,
        data: [
          {
            id: "player-1",
            name: "Test Player",
            gamesPlayed: 10,
            wins: 5,
            losses: 5,
            winningPercentage: 0.50,
            totalChampionships: 0,
          },
        ],
        pagination: { page: 1, limit: 50, total: 1, pages: 1 },
      };
      await route.fulfill({ json });
    });
  });

  test("authenticated user can view players list", async ({ userPage }) => {
    await userPage.goto("/players");

    await expect(userPage.getByRole("heading", { name: "Players" })).toBeVisible();
    await expect(userPage.getByText("Test Player")).toBeVisible();
  });
});

test.describe("Player Profile - View Details", () => {
  test.beforeEach(async ({ userPage }) => {
    await userPage.route("**/api/players/player-1", async (route) => {
      const json = {
        success: true,
        data: {
          id: "player-1",
          name: "John Smith",
          gamesPlayed: 42,
          wins: 28,
          losses: 14,
          winningPercentage: 0.67,
          totalChampionships: 3,
          recentMatches: [
            { id: "m1", opponent: "Jane Doe", result: "W", score: "6-4, 6-2" },
          ],
        },
      };
      await route.fulfill({ json });
    });
  });

  test("displays player profile details", async ({ userPage }) => {
    await userPage.goto("/players/player-1");

    await expect(userPage.getByText("John Smith")).toBeVisible({ timeout: 10000 });
    await expect(userPage.getByText(/42/)).toBeVisible();
    await expect(userPage.getByText(/67/)).toBeVisible();
  });
});
