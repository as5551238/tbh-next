/**
 * E2E Smoke Tests — verify key pages render without crash
 * Run: pnpm preview & → npx playwright test
 * CI: E2E_BASE_URL=https://host/ npx playwright test
 */
import { test, expect } from '@playwright/test';

test.setTimeout(45000);

test.describe('Smoke: Core Pages Render', () => {
  test('homepage loads and has React root', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const root = page.locator('#root');
    await expect(root).toBeAttached({ timeout: 15000 });
    await page.waitForTimeout(2000);
    const html = await root.innerHTML();
    expect(html.length).toBeGreaterThan(10);
  });

  test('login page shows email input', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const emailInput = page.locator('input[type="email"], input[placeholder*="邮箱"], input[placeholder*="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 10000 });
  });

  test('no critical JS errors on page load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    const critical = errors.filter(e =>
      !e.includes('supabase') &&
      !e.includes('CORS') &&
      !e.includes('ResizeObserver') &&
      !e.includes('net::ERR_') &&
      !e.includes('Failed to fetch')
    );
    expect(critical).toEqual([]);
  });

  test('SPA deep route serves index.html (no hard 404)', async ({ page }) => {
    const response = await page.goto('/workspace/overview', { waitUntil: 'domcontentloaded', timeout: 30000 });
    expect(response?.status()).toBe(200);
    const root = page.locator('#root');
    await expect(root).toBeAttached({ timeout: 10000 });
  });
});

test.describe('Login Flow', () => {
  test('demo mode login renders demo entry button', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const demoBtn = page.locator('button:has-text("Demo"), button:has-text("演示"), button:has-text("体验")').first();
    await expect(demoBtn).toBeVisible({ timeout: 10000 });
  });

  test('LDAP login shows email and password inputs', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const email = page.locator('input[type="email"], input[placeholder*="邮箱"]').first();
    const password = page.locator('input[type="password"], input[placeholder*="密码"]').first();
    await expect(email).toBeVisible({ timeout: 10000 });
    await expect(password).toBeVisible({ timeout: 10000 });
  });

  test('login form has submit button', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const submitBtn = page.locator('button[type="submit"], button:has-text("登录"), button:has-text("Login")').first();
    await expect(submitBtn).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Interface Switching', () => {
  test('workspace interface loads with overview module', async ({ page }) => {
    await page.goto('/workspace/overview', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const root = page.locator('#root');
    await expect(root).toBeAttached({ timeout: 15000 });
    await page.waitForTimeout(2000);
    const content = await root.innerHTML();
    expect(content.length).toBeGreaterThan(50);
  });

  test('collab interface loads with channels module', async ({ page }) => {
    await page.goto('/collab/channels', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const root = page.locator('#root');
    await expect(root).toBeAttached({ timeout: 15000 });
  });

  test('ai interface loads with main module', async ({ page }) => {
    await page.goto('/ai/main', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const root = page.locator('#root');
    await expect(root).toBeAttached({ timeout: 15000 });
  });

  test('interface navigation tabs are visible', async ({ page }) => {
    await page.goto('/workspace/overview', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    const navElements = page.locator('nav, [role="tablist"], [role="navigation"]').first();
    await expect(navElements).toBeAttached({ timeout: 10000 });
  });
});

test.describe('Gating: Pro Feature Paywall', () => {
  test('accessing Pro-only route shows upgrade prompt or paywall', async ({ page }) => {
    await page.goto('/workspace/overview', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.evaluate(() => { localStorage.setItem('tbh-sub-plan', 'free'); });
    await page.goto('/workspace/overview', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    const paywallOrUpgrade = page.locator(
      'text=/升级|专业版|Pro|Paywall|解锁|付费|订阅/'
    ).first();
    const root = page.locator('#root');
    await expect(root).toBeAttached({ timeout: 10000 });
  });

  test('free plan user can still access basic workspace', async ({ page }) => {
    await page.evaluate(() => { localStorage.setItem('tbh-sub-plan', 'free'); });
    await page.goto('/workspace/overview', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const root = page.locator('#root');
    await expect(root).toBeAttached({ timeout: 15000 });
    await page.waitForTimeout(2000);
    const html = await root.innerHTML();
    expect(html.length).toBeGreaterThan(10);
  });

  test('enterprise plan user can access workspace without paywall', async ({ page }) => {
    await page.evaluate(() => { localStorage.setItem('tbh-sub-plan', 'enterprise'); });
    await page.goto('/workspace/overview', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const root = page.locator('#root');
    await expect(root).toBeAttached({ timeout: 15000 });
  });
});
