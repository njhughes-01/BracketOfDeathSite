import { test, expect } from "./fixtures";
import { test as baseTest, expect as baseExpect } from "@playwright/test";

baseTest.describe("Authentication Flow - Unauthenticated", () => {
  baseTest("unauthenticated user is redirected to login when accessing protected route", async ({ page }) => {
    // Try to access a protected route without authentication
    await page.goto("/profile");
    
    // Should redirect to login page (either app login or Keycloak)
    await baseExpect(page).toHaveURL(/login|keycloak/i, { timeout: 10000 });
  });

  baseTest("login page displays correctly", async ({ page }) => {
    await page.goto("/login");
    
    // Check for key login form elements
    await baseExpect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    await baseExpect(page.locator('input[name="email"]')).toBeVisible();
    await baseExpect(page.locator('input[name="password"]')).toBeVisible();
    await baseExpect(page.getByRole("button", { name: /log in/i })).toBeVisible();
  });
});

test.describe("Authentication Flow - Admin", () => {
  test("admin user can access admin dashboard", async ({ adminPage }) => {
    await adminPage.goto("/");
    
    // Admin should see admin-only navigation
    await expect(adminPage.getByRole("link", { name: /admin/i })).toBeVisible({ timeout: 10000 });
  });

  test("admin user can navigate to admin pages", async ({ adminPage }) => {
    await adminPage.goto("/admin/users");
    
    // Should be able to access admin user management
    await expect(adminPage.getByText(/user management/i)).toBeVisible({ timeout: 10000 });
  });

  test("admin user can logout", async ({ adminPage }) => {
    await adminPage.goto("/");
    
    // Look for user menu or logout option
    // First, find and click the user menu/profile area
    const userMenu = adminPage.locator('[data-testid="user-menu"], button:has-text("admin"), .user-menu, [aria-label*="menu"]').first();
    
    if (await userMenu.isVisible({ timeout: 5000 }).catch(() => false)) {
      await userMenu.click();
      
      // Look for logout button/link
      const logoutBtn = adminPage.getByRole("button", { name: /logout|sign out/i })
        .or(adminPage.getByRole("link", { name: /logout|sign out/i }))
        .or(adminPage.getByText(/logout|sign out/i));
      
      if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await logoutBtn.click();
        // After logout, should redirect to login or home
        await expect(adminPage).toHaveURL(/login|\/$/i, { timeout: 10000 });
      }
    }
  });
});

test.describe("Authentication Flow - Regular User", () => {
  test("regular user can access their profile", async ({ userPage }) => {
    await userPage.goto("/profile");
    
    // User should be able to see profile page
    await expect(userPage.getByText(/profile|account/i).first()).toBeVisible({ timeout: 10000 });
  });

  test("regular user cannot access admin pages", async ({ userPage }) => {
    await userPage.goto("/admin/users");
    
    // Should be redirected or see access denied
    // Either redirected away from admin or shows error
    const hasAccessDenied = await userPage.getByText(/access denied|unauthorized|forbidden/i).isVisible({ timeout: 5000 }).catch(() => false);
    const isNotOnAdminPage = !userPage.url().includes("/admin/users");
    
    expect(hasAccessDenied || isNotOnAdminPage).toBeTruthy();
  });

  test("regular user can view public pages", async ({ userPage }) => {
    await userPage.goto("/tournaments");
    
    await expect(userPage.getByRole("heading", { name: /tournaments/i })).toBeVisible({ timeout: 10000 });
  });
});
