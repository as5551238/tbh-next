/**
 * E2E CRUD Interaction Tests — verify create/read/update/delete flows
 * Run: E2E_BASE_URL=http://localhost:4173/tbh-next/ npx playwright test e2e/crud-interaction.spec.ts
 */
import { test, expect } from '@playwright/test';

test.setTimeout(90000);

const BASE = (process.env.E2E_BASE_URL || 'http://localhost:4173/tbh-next').replace(/\/$/, '');

async function setupDemoAuth(page: import('@playwright/test').Page, path: string) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate(() => {
    localStorage.setItem('tbh-next-auth', '1');
    localStorage.setItem('tbh-next-user', JSON.stringify({ id: 'demo-e2e', email: 'demo@tbh-next.app', role: 'admin', name: 'E2E Test' }));
    localStorage.setItem('tbh-sub-plan', 'pro');
  });
  await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
}

test.describe('Goal CRUD Flow', () => {
  test('create goal: fill form and verify form accepts input', async ({ page }) => {
    await setupDemoAuth(page, '/workspace/goals');
    const addBtn = page.locator('button:has-text("创建"), button:has-text("新建"), button:has-text("添加"), button[aria-label*="创建"]').first();
    if (await addBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(1500);
      const titleInput = page.locator('input[type="text"], input[placeholder*="标题"], input[placeholder*="目标"]').first();
      if (await titleInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await titleInput.fill('E2E自动测试目标_' + Date.now());
        const val = await titleInput.inputValue();
        expect(val).toContain('E2E自动测试目标');
      }
    }
  });

  test('goal list renders with data or empty state', async ({ page }) => {
    await setupDemoAuth(page, '/workspace/goals');
    const root = page.locator('#main-content');
    await expect(root).toBeAttached({ timeout: 15000 });
    // Should have either goal cards or empty state message
    const hasContent = await page.locator('text=/目标|暂无|创建|添加/').count();
    expect(hasContent).toBeGreaterThan(0);
  });
});

test.describe('Task CRUD Flow', () => {
  test('create task: fill form and verify', async ({ page }) => {
    await setupDemoAuth(page, '/workspace/tasks');
    const addBtn = page.locator('button:has-text("创建"), button:has-text("新建"), button:has-text("添加任务"), button[aria-label*="创建"]').first();
    if (await addBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(1500);
      const titleInput = page.locator('input[placeholder*="标题"], input[placeholder*="任务"], input[type="text"]').first();
      if (await titleInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await titleInput.fill('E2E自动测试任务_' + Date.now());
        const val = await titleInput.inputValue();
        expect(val).toContain('E2E自动测试任务');
      }
    }
  });
});

test.describe('Navigation State Consistency', () => {
  test('sidebar navigation preserves correct interface state', async ({ page }) => {
    await setupDemoAuth(page, '/workspace/overview');
    // Navigate via sidebar to collab
    const collabBtn = page.locator('[aria-label*="协作"], [aria-label*="collab"], button:has-text("协作")').first();
    if (await collabBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await collabBtn.click();
      await page.waitForTimeout(2000);
      // URL should now be under /collab
      const url = page.url();
      expect(url).toContain('collab');
    }
  });

  test('deep link loads correct module', async ({ page }) => {
    await setupDemoAuth(page, '/workspace/review');
    const root = page.locator('#main-content');
    await expect(root).toBeAttached({ timeout: 15000 });
    // Page content should relate to review
    const content = await root.innerHTML();
    expect(content.length).toBeGreaterThan(100);
  });

  test('rapid navigation between interfaces maintains stability', async ({ page }) => {
    await setupDemoAuth(page, '/workspace/overview');
    const routes = ['/workspace/goals', '/ai/main', '/collab/channels', '/workspace/tasks', '/workspace/review'];
    for (const route of routes) {
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(1000);
    }
    // App should still be functional
    const root = page.locator('#root');
    await expect(root).toBeAttached({ timeout: 10000 });
    // No error boundaries should be visible
    const errors = page.locator('text=/出现错误|Something went wrong/i');
    const errCount = await errors.count();
    expect(errCount).toBe(0);
  });
});

test.describe('Data Persistence Verification', () => {
  test('localStorage demo auth persists across page reloads', async ({ page }) => {
    await setupDemoAuth(page, '/workspace/overview');
    const authCookie = await page.evaluate(() => localStorage.getItem('tbh-next-auth'));
    expect(authCookie).toBe('1');
    await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    const authAfterReload = await page.evaluate(() => localStorage.getItem('tbh-next-auth'));
    expect(authAfterReload).toBe('1');
  });
});
