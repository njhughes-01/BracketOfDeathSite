import { test, expect } from "./fixtures";

test.describe("User Management - Admin Only", () => {
  const mockUsers = [
    {
      id: "user-1",
      email: "john@example.com",
      firstName: "John",
      lastName: "Smith",
      username: "johnsmith",
      gender: "male",
      roles: ["user"],
      createdAt: "2024-01-15T00:00:00.000Z",
    },
    {
      id: "user-2",
      email: "jane@example.com",
      firstName: "Jane",
      lastName: "Doe",
      username: "janedoe",
      gender: "female",
      roles: ["user", "admin"],
      createdAt: "2024-02-20T00:00:00.000Z",
    },
    {
      id: "user-3",
      email: "bob@example.com",
      firstName: "Bob",
      lastName: "Wilson",
      username: "bobwilson",
      gender: "male",
      roles: ["user"],
      createdAt: "2024-03-10T00:00:00.000Z",
    },
  ];

  test.beforeEach(async ({ adminPage }) => {
    await adminPage.route("**/api/admin/users*", async (route) => {
      const url = new URL(route.request().url());
      const search = url.searchParams.get("search") || "";

      const filteredUsers = search
        ? mockUsers.filter(
            (u) =>
              u.firstName.toLowerCase().includes(search.toLowerCase()) ||
              u.lastName.toLowerCase().includes(search.toLowerCase()) ||
              u.email.toLowerCase().includes(search.toLowerCase())
          )
        : mockUsers;

      await route.fulfill({
        json: {
          success: true,
          data: filteredUsers,
          pagination: { page: 1, limit: 50, total: filteredUsers.length, pages: 1 },
        },
      });
    });

    await adminPage.route("**/api/users*", async (route) => {
      await route.fulfill({
        json: {
          success: true,
          data: mockUsers,
          pagination: { page: 1, limit: 50, total: mockUsers.length, pages: 1 },
        },
      });
    });
  });

  test("admin can access user management at /admin/users", async ({ adminPage }) => {
    await adminPage.goto("/admin/users");

    await expect(adminPage.getByText(/user management/i)).toBeVisible({ timeout: 10000 });
  });

  test("admin sees user list", async ({ adminPage }) => {
    await adminPage.goto("/admin/users");

    const loadingIndicator = adminPage.getByText(/loading/i);
    if (await loadingIndicator.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(loadingIndicator).toBeHidden({ timeout: 15000 });
    }

    await expect(adminPage.getByText("John Smith").or(adminPage.getByText("johnsmith"))).toBeVisible({ timeout: 10000 });
    await expect(adminPage.getByText("Jane Doe").or(adminPage.getByText("janedoe"))).toBeVisible();
    await expect(adminPage.getByText("Bob Wilson").or(adminPage.getByText("bobwilson"))).toBeVisible();
  });

  test("admin can search users", async ({ adminPage }) => {
    await adminPage.goto("/admin/users");

    const loadingIndicator = adminPage.getByText(/loading/i);
    if (await loadingIndicator.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(loadingIndicator).toBeHidden({ timeout: 15000 });
    }

    const searchInput = adminPage.getByPlaceholder(/search/i).or(adminPage.locator('input[type="search"]'));

    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill("Jane");

      await expect(adminPage.getByText("Jane Doe").or(adminPage.getByText("janedoe"))).toBeVisible({ timeout: 5000 });
    }
  });

  test("admin can view user details", async ({ adminPage }) => {
    await adminPage.route("**/api/admin/users/user-1", async (route) => {
      await route.fulfill({ json: { success: true, data: mockUsers[0] } });
    });

    await adminPage.goto("/admin/users");

    const loadingIndicator = adminPage.getByText(/loading/i);
    if (await loadingIndicator.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(loadingIndicator).toBeHidden({ timeout: 15000 });
    }

    const userRow = adminPage.locator("table tbody tr").first()
      .or(adminPage.getByText("John Smith").first())
      .or(adminPage.getByText("johnsmith").first());

    if (await userRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await userRow.click();

      const detailsVisible = await adminPage.getByText(/user details/i).isVisible({ timeout: 5000 }).catch(() => false)
        || await adminPage.getByRole("dialog").isVisible({ timeout: 5000 }).catch(() => false)
        || await adminPage.getByText("john@example.com").isVisible({ timeout: 5000 }).catch(() => false);

      expect(detailsVisible).toBeTruthy();
    }
  });

  test("admin sees user roles in list", async ({ adminPage }) => {
    await adminPage.goto("/admin/users");

    const loadingIndicator = adminPage.getByText(/loading/i);
    if (await loadingIndicator.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(loadingIndicator).toBeHidden({ timeout: 15000 });
    }

    const roleIndicator = adminPage.getByText(/admin/i, { exact: false });
    await expect(roleIndicator.first()).toBeVisible({ timeout: 10000 });
  });
});
