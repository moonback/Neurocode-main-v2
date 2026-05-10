import { test, expect } from '@playwright/test';

test.describe('Token Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page first
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display the analytics dashboard', async ({ page }) => {
    // Navigate to token analytics page
    await page.goto('/token-analytics');

    // Wait for the dashboard to load
    await page.waitForSelector('text=📊 Analytics des Tokens', { timeout: 10000 });

    // Check that the main title is visible
    await expect(page.locator('h1')).toContainText('Analytics des Tokens');

    // Check that the description is visible
    await expect(page.locator('text=Suivez votre consommation')).toBeVisible();
  });

  test('should display statistics cards', async ({ page }) => {
    await page.goto('/token-analytics');
    await page.waitForSelector('text=📊 Analytics des Tokens', { timeout: 10000 });

    // Wait for loading to complete
    await page.waitForSelector('text=Total Tokens', { timeout: 10000 });

    // Check that all stat cards are visible
    await expect(page.locator('text=Total Tokens')).toBeVisible();
    await expect(page.locator('text=Requêtes')).toBeVisible();
    await expect(page.locator('text=Moyenne/Requête')).toBeVisible();
    await expect(page.locator('text=Coût Total')).toBeVisible();
  });

  test('should display charts', async ({ page }) => {
    await page.goto('/token-analytics');
    await page.waitForSelector('text=📊 Analytics des Tokens', { timeout: 10000 });

    // Wait for charts to load
    await page.waitForSelector('text=🔥 Top 5 Conversations', { timeout: 10000 });

    // Check that chart titles are visible
    await expect(page.locator('text=🔥 Top 5 Conversations')).toBeVisible();
    await expect(page.locator('text=🤖 Distribution par Modèle')).toBeVisible();
    await expect(page.locator('text=💰 Coûts par Modèle')).toBeVisible();
    await expect(page.locator('text=⚡ Top 10 Skills')).toBeVisible();
  });

  test('should display detailed tables', async ({ page }) => {
    await page.goto('/token-analytics');
    await page.waitForSelector('text=📊 Analytics des Tokens', { timeout: 10000 });

    // Wait for tables to load
    await page.waitForSelector('text=📋 Détail des Conversations', { timeout: 10000 });

    // Check that table titles are visible
    await expect(page.locator('text=📋 Détail des Conversations')).toBeVisible();
    await expect(page.locator('text=💵 Détail des Coûts par Modèle')).toBeVisible();
  });

  test('should allow changing date range', async ({ page }) => {
    await page.goto('/token-analytics');
    await page.waitForSelector('text=📊 Analytics des Tokens', { timeout: 10000 });

    // Check that date range buttons are visible
    await expect(page.locator('button:has-text("7 jours")')).toBeVisible();
    await expect(page.locator('button:has-text("30 jours")')).toBeVisible();
    await expect(page.locator('button:has-text("90 jours")')).toBeVisible();
    await expect(page.locator('button:has-text("1 an")')).toBeVisible();

    // Click on 7 days button
    await page.click('button:has-text("7 jours")');

    // Wait for data to reload (check that loading indicator appears and disappears)
    await page.waitForTimeout(1000);

    // Verify that the page is still showing the dashboard
    await expect(page.locator('h1')).toContainText('Analytics des Tokens');
  });

  test('should allow exporting data', async ({ page }) => {
    await page.goto('/token-analytics');
    await page.waitForSelector('text=📊 Analytics des Tokens', { timeout: 10000 });

    // Check that export controls are visible
    await expect(page.locator('select').first()).toBeVisible();
    await expect(page.locator('button:has-text("📥 Exporter")')).toBeVisible();

    // Select CSV format
    await page.selectOption('select', 'csv');

    // Click export button (we won't actually download in the test)
    await page.click('button:has-text("📥 Exporter")');

    // Wait a moment for the export to process
    await page.waitForTimeout(500);
  });

  test('should be accessible from settings page', async ({ page }) => {
    // Navigate to settings
    await page.goto('/settings');
    await page.waitForSelector('text=Settings', { timeout: 10000 });

    // Find and click the analytics dashboard link
    const analyticsLink = page.locator('a:has-text("📊 View Token Analytics Dashboard")');
    await expect(analyticsLink).toBeVisible();

    await analyticsLink.click();

    // Verify we're on the analytics page
    await page.waitForSelector('text=📊 Analytics des Tokens', { timeout: 10000 });
    await expect(page.locator('h1')).toContainText('Analytics des Tokens');
  });

  test('should handle loading state', async ({ page }) => {
    await page.goto('/token-analytics');

    // Check for loading indicator
    const loadingText = page.locator('text=Chargement des analytics...');

    // Either loading is visible or data is already loaded
    const isLoadingVisible = await loadingText.isVisible().catch(() => false);
    const isDataVisible = await page
      .locator('text=Total Tokens')
      .isVisible()
      .catch(() => false);

    expect(isLoadingVisible || isDataVisible).toBeTruthy();
  });

  test('should display responsive layout', async ({ page }) => {
    await page.goto('/token-analytics');
    await page.waitForSelector('text=📊 Analytics des Tokens', { timeout: 10000 });

    // Check that the main container has proper spacing
    const mainContainer = page.locator('.space-y-6').first();
    await expect(mainContainer).toBeVisible();

    // Check that grid layouts are present
    const grids = page.locator('.grid');
    const gridCount = await grids.count();
    expect(gridCount).toBeGreaterThan(0);
  });
});
