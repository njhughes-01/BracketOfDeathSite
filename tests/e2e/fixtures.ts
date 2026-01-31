import { test as base, Page, BrowserContext } from '@playwright/test';
import path from 'path';

const AUTH_DIR = path.join(__dirname, '.auth');
const ADMIN_AUTH_FILE = path.join(AUTH_DIR, 'admin.json');
const USER_AUTH_FILE = path.join(AUTH_DIR, 'user.json');

type AuthFixtures = {
  adminPage: Page;
  userPage: Page;
  adminContext: BrowserContext;
  userContext: BrowserContext;
};

export const test = base.extend<AuthFixtures>({
  adminContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: ADMIN_AUTH_FILE,
    });
    await use(context);
    await context.close();
  },
  
  adminPage: async ({ adminContext }, use) => {
    const page = await adminContext.newPage();
    await use(page);
  },
  
  userContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: USER_AUTH_FILE,
    });
    await use(context);
    await context.close();
  },
  
  userPage: async ({ userContext }, use) => {
    const page = await userContext.newPage();
    await use(page);
  },
});

export { expect } from '@playwright/test';
