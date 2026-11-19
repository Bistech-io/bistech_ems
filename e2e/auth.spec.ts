import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const DEV_PASSWORD = 'Password123!';

test.describe('Authentication (desktop-dark)', () => {
  test('passes axe accessibility checks on /login in dark mode', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /bistech ems/i })).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('shows error for wrong password and locked account', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/username/i).fill('admin');
    await page.getByLabel(/^password$/i).fill('WrongPassword!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.locator('form [role="alert"]')).toContainText(/invalid username or password/i);

    await page.getByLabel(/username/i).fill('locked');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.locator('form [role="alert"]')).toContainText(/temporarily locked/i);
  });

  test('redirects unauthenticated visitors to /login?next=..., logs in, and logs out', async ({
    page,
  }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);

    await page.getByLabel(/username/i).fill('admin');
    await page.getByLabel(/^password$/i).fill(DEV_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText(/super admin/i).first()).toBeVisible();

    await page.getByRole('button', { name: /sign out/i }).first().click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
