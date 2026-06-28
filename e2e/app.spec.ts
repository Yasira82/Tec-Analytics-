import { test, expect } from '@playwright/test';

test('homepage loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/TEC/);
});

test('login button visible', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Login with Pi')).toBeVisible();
});

test('login page exposes legal links', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Privacy' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Terms' })).toBeVisible();
});

test('privacy page renders', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: /Privacy Policy/i })).toBeVisible();
});

test('terms page renders', async ({ page }) => {
  await page.goto('/terms');
  await expect(page.getByRole('heading', { name: /Terms of Service/i })).toBeVisible();
});

test('unknown route shows branded 404', async ({ page }) => {
  await page.goto('/this-route-does-not-exist');
  await expect(page.getByText('404 — Not found')).toBeVisible();
});

test('protected /app redirects to login when unauthenticated', async ({ page }) => {
  await page.goto('/app');
  // middleware bounces to "/" (login) when no tec_access_token cookie is present
  await expect(page.getByText('Login with Pi')).toBeVisible();
});
