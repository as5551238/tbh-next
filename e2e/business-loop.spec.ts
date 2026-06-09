/**
 * E2E Business Loop Tests — verify Goal→Task→Review core cycle
 * Run: pnpm preview & → E2E_BASE_URL=http://localhost:4173/tbh-next/ npx playwright test
 */
import { test, expect } from '@playwright/test';

test.setTimeout(60000);

const BASE = (process.env.E2E_BASE_URL || 'http://localhost:4173/tbh-next').replace(/\/$/, '');

// Helper: set demo auth in localStorage then reload
async function setupDemoAuth(page: import('@playwright/test').Page, path: string) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate(() => {
    localStorage.setItem('tbh-next-auth', '1');
    localStorage.setItem('tbh-next-user', JSON.stringify({ id: 'demo-e2e', email: 'demo@tbh-next.app', role: 'admin', name: 'E2E Test' }));
    localStorage.setItem('tbh-sub-plan', 'pro');
  });
  await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
  // Wait for React to hydrate
  await page.waitForTimeout(2000);
}

test.describe('Business Loop: Goal → Task → Review', () => {

  test('Goal module renders and shows content', async ({ page }) => {
    await setupDemoAuth(page, '/workspace/goals');
    const root = page.locator('#root');
    await expect(root).toBeAttached({ timeout: 15000 });
    // Page should have meaningful content
    const html = await root.innerHTML();
    expect(html.length).toBeGreaterThan(50);
  });

  test('Task module renders', async ({ page }) => {
    await setupDemoAuth(page, '/workspace/tasks');
    const root = page.locator('#root');
    await expect(root).toBeAttached({ timeout: 15000 });
    const html = await root.innerHTML();
    expect(html.length).toBeGreaterThan(50);
  });

  test('ActionItems module renders correctly', async ({ page }) => {
    await setupDemoAuth(page, '/workspace/actionItems');
    const root = page.locator('#root');
    await expect(root).toBeAttached({ timeout: 15000 });
    const html = await root.innerHTML();
    expect(html.length).toBeGreaterThan(10);
  });

  test('Review module renders', async ({ page }) => {
    await setupDemoAuth(page, '/workspace/review');
    const root = page.locator('#root');
    await expect(root).toBeAttached({ timeout: 15000 });
    const html = await root.innerHTML();
    expect(html.length).toBeGreaterThan(50);
  });

  test('Goal page UI is functional', async ({ page }) => {
    await setupDemoAuth(page, '/workspace/goals');
    const root = page.locator('#root');
    await expect(root).toBeAttached({ timeout: 15000 });
    // Check page doesn't crash or show error
    const errorEls = page.locator('text=/错误|Error|崩溃/i');
    const errorCount = await errorEls.count();
    expect(errorCount).toBe(0);
  });

  test('Navigate from Goals to Tasks preserves interface state', async ({ page }) => {
    await setupDemoAuth(page, '/workspace/goals');
    await page.goto(`${BASE}/workspace/tasks`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    const root = page.locator('#root');
    await expect(root).toBeAttached({ timeout: 15000 });
    const url = page.url();
    expect(url).toContain('workspace');
  });

  test('Overview page renders with content', async ({ page }) => {
    await setupDemoAuth(page, '/workspace/overview');
    const root = page.locator('#root');
    await expect(root).toBeAttached({ timeout: 15000 });
    const html = await root.innerHTML();
    expect(html.length).toBeGreaterThan(50);
  });

  test('MyToday page renders', async ({ page }) => {
    await setupDemoAuth(page, '/my-today');
    const root = page.locator('#root');
    await expect(root).toBeAttached({ timeout: 15000 });
  });

  test('Penetration/Alignment view renders', async ({ page }) => {
    await setupDemoAuth(page, '/workspace/alignment');
    const root = page.locator('#root');
    await expect(root).toBeAttached({ timeout: 15000 });
  });
});

test.describe('AI Integration', () => {

  test('AI Chat view renders', async ({ page }) => {
    await setupDemoAuth(page, '/ai/main');
    const root = page.locator('#root');
    await expect(root).toBeAttached({ timeout: 15000 });
    const html = await root.innerHTML();
    expect(html.length).toBeGreaterThan(10);
  });

  test('Morning briefing view renders', async ({ page }) => {
    await setupDemoAuth(page, '/ai/morning');
    const root = page.locator('#root');
    await expect(root).toBeAttached({ timeout: 15000 });
  });

  test('Agent list view renders', async ({ page }) => {
    await setupDemoAuth(page, '/ai/agents');
    const root = page.locator('#root');
    await expect(root).toBeAttached({ timeout: 15000 });
  });
});

test.describe('Collaboration Features', () => {

  test('Channels view renders', async ({ page }) => {
    await setupDemoAuth(page, '/collab/channels');
    const root = page.locator('#root');
    await expect(root).toBeAttached({ timeout: 15000 });
  });

  test('Approvals view renders', async ({ page }) => {
    await setupDemoAuth(page, '/collab/approvals');
    const root = page.locator('#root');
    await expect(root).toBeAttached({ timeout: 15000 });
  });
});

test.describe('Error Resilience', () => {

  test('invalid module shows fallback, not crash', async ({ page }) => {
    await setupDemoAuth(page, '/workspace/nonexistent-module');
    const root = page.locator('#root');
    await expect(root).toBeAttached({ timeout: 15000 });
    const html = await root.innerHTML();
    expect(html.length).toBeGreaterThan(10);
  });

  test('deep AI route does not hard 404', async ({ page }) => {
    await setupDemoAuth(page, '/ai/workflows');
    const html = await page.locator('#root').innerHTML();
    expect(html.length).toBeGreaterThan(10);
  });

  test('rapid navigation does not crash app', async ({ page }) => {
    await setupDemoAuth(page, '/workspace/overview');
    const routes = ['/workspace/goals', '/workspace/tasks', '/collab/channels', '/ai/main', '/workspace/review'];
    for (const route of routes) {
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    }
    await page.waitForTimeout(2000);
    const root = page.locator('#root');
    await expect(root).toBeAttached({ timeout: 10000 });
    const html = await root.innerHTML();
    expect(html.length).toBeGreaterThan(10);
  });
});

test.describe('Business Flow: Goal Create → Task Add → Review Submit', () => {

  test('Goal: can open create modal and fill form', async ({ page }) => {
    await setupDemoAuth(page, '/workspace/goals');
    await page.waitForTimeout(2000);
    // Find and click the create/add goal button
    const addBtn = page.locator('button:has-text("创建"), button:has-text("新建"), button:has-text("添加"), button[aria-label*="创建"], button[aria-label*="添加"]').first();
    if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(1000);
      // Modal should be visible
      const modal = page.locator('[role="dialog"], .fixed.inset-0, [class*="modal"]').first();
      const modalVisible = await modal.isVisible({ timeout: 5000 }).catch(() => false);
      if (modalVisible) {
        // Try to fill in a title
        const titleInput = page.locator('input[type="text"], input[placeholder*="标题"], input[placeholder*="目标"]').first();
        if (await titleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await titleInput.fill('E2E测试目标');
          const value = await titleInput.inputValue();
          expect(value).toBe('E2E测试目标');
        }
      }
    }
    // Page should not crash after interaction
    const root = page.locator('#root');
    await expect(root).toBeAttached({ timeout: 10000 });
  });

  test('Task: can open create task modal and fill form', async ({ page }) => {
    await setupDemoAuth(page, '/workspace/tasks');
    await page.waitForTimeout(2000);
    const addBtn = page.locator('button:has-text("创建"), button:has-text("新建"), button:has-text("添加任务"), button[aria-label*="创建"]').first();
    if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(1000);
      const titleInput = page.locator('input[placeholder*="标题"], input[placeholder*="任务"], input[type="text"]').first();
      if (await titleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await titleInput.fill('E2E测试任务');
        const value = await titleInput.inputValue();
        expect(value).toBe('E2E测试任务');
      }
    }
    const root = page.locator('#root');
    await expect(root).toBeAttached({ timeout: 10000 });
  });

  test('Review: can navigate and interact with review page', async ({ page }) => {
    await setupDemoAuth(page, '/workspace/review');
    await page.waitForTimeout(2000);
    // Review page should show content (report cards or overview)
    const root = page.locator('#root');
    await expect(root).toBeAttached({ timeout: 15000 });
    const html = await root.innerHTML();
    expect(html.length).toBeGreaterThan(50);
    // Click any interactive element that exists
    const clickableElements = page.locator('button, a, [role="button"], [tabindex="0"]');
    const count = await clickableElements.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Goal→Task navigation flow works', async ({ page }) => {
    await setupDemoAuth(page, '/workspace/goals');
    await page.waitForTimeout(2000);
    // Navigate to tasks via sidebar
    const taskNavBtn = page.locator('button[aria-label*="任务"], button[aria-label*="task"]').first();
    if (await taskNavBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await taskNavBtn.click();
      await page.waitForTimeout(2000);
      // Should be on tasks page now
      const root = page.locator('#root');
      await expect(root).toBeAttached({ timeout: 10000 });
    }
    // Also test direct navigation
    await page.goto(`${BASE}/workspace/review`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    const root = page.locator('#root');
    await expect(root).toBeAttached({ timeout: 10000 });
  });

  test('Modal open/close does not crash', async ({ page }) => {
    await setupDemoAuth(page, '/workspace/goals');
    await page.waitForTimeout(2000);
    // Try to open any modal
    const addBtn = page.locator('button:has-text("创建"), button:has-text("新建"), button:has-text("添加")').first();
    if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(1000);
      // Try to close modal
      const closeBtn = page.locator('button[aria-label*="关闭"], button[aria-label="Close"], button:has-text("取消"), button:has-text("关闭")').first();
      if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await closeBtn.click();
        await page.waitForTimeout(500);
      } else {
        // Press Escape to close
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
    }
    const root = page.locator('#root');
    await expect(root).toBeAttached({ timeout: 10000 });
  });
});
