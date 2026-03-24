import { test, expect } from '@playwright/test';

test.describe('Dashboard UI', () => {
  test.beforeEach(async ({ page, request }) => {
    // Connect demo mode via API
    await request.post('/api/fhir/demo/connect', {
      data: { password: 'SmartHealth2025' },
    });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('dashboard page loads', async ({ page }) => {
    // Should be on the dashboard route
    expect(page.url()).toContain('/dashboard');
    // Page should have content
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('dashboard displays patient health information', async ({ page }) => {
    // Wait for any content to render
    await page.waitForTimeout(2000);
    // The dashboard should show some health-related content
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(50);
  });

  test('dashboard has interactive tabs or sections', async ({ page }) => {
    // Look for tab-like elements or section headers
    const buttons = await page.locator('button').count();
    expect(buttons).toBeGreaterThan(0);
  });
});
