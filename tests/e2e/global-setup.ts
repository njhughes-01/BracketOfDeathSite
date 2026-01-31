import { chromium, FullConfig } from '@playwright/test';
import path from 'path';

const KEYCLOAK_URL = 'http://localhost:8081';
const FRONTEND_URL = 'http://localhost:5174';

const AUTH_DIR = path.join(__dirname, '.auth');
const ADMIN_AUTH_FILE = path.join(AUTH_DIR, 'admin.json');
const USER_AUTH_FILE = path.join(AUTH_DIR, 'user.json');

async function authenticateUser(
  page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
  username: string,
  password: string,
  storageStatePath: string
) {
  await page.goto(FRONTEND_URL);
  
  await page.waitForURL(/.*keycloak.*|.*login.*/i, { timeout: 30000 }).catch(() => {});
  
  const usernameInput = page.locator('#username');
  const passwordInput = page.locator('#password');
  const loginButton = page.locator('#kc-login');
  
  if (await usernameInput.isVisible({ timeout: 10000 })) {
    await usernameInput.fill(username);
    await passwordInput.fill(password);
    await loginButton.click();
    
    await page.waitForURL(`${FRONTEND_URL}/**`, { timeout: 30000 });
  }
  
  await page.context().storageState({ path: storageStatePath });
}

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch();
  
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  
  await authenticateUser(
    adminPage,
    process.env.E2E_ADMIN_USER || 'admin',
    process.env.E2E_ADMIN_PASSWORD || 'admin123',
    ADMIN_AUTH_FILE
  );
  await adminContext.close();
  
  const userContext = await browser.newContext();
  const userPage = await userContext.newPage();
  
  await authenticateUser(
    userPage,
    process.env.E2E_USER_USER || 'testuser',
    process.env.E2E_USER_PASSWORD || 'testuser123',
    USER_AUTH_FILE
  );
  await userContext.close();
  
  await browser.close();
}

export default globalSetup;
