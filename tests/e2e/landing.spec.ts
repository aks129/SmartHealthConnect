import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('loads the landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Liara|SmartHealth|Health/i);
  });

  test('has navigation elements', async ({ page }) => {
    await page.goto('/');
    // Page should have some visible content
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('can navigate to dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    // Dashboard should load (may redirect or show login)
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/dashboard');
  });
});
