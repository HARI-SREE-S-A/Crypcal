import { test, expect } from '@playwright/test';

test.describe('Login Screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders the login header, inputs, and buttons', async ({ page }) => {
    // Check brand / title
    await expect(page.locator('h1')).toContainText('192.168.6');

    // Check inputs
    const usernameInput = page.locator('input#username');
    const passwordInput = page.locator('input#password');
    const submitButton = page.locator('button[type="submit"]');

    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toContainText('Sign in');

    // Check E2EE footer badge
    await expect(page.locator('text=End-to-end encrypted by default')).toBeVisible();
  });

  test('toggles password visibility', async ({ page }) => {
    const passwordInput = page.locator('input#password');
    await passwordInput.fill('SecretPassword123');

    // Initially type is password
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click toggle button
    const toggleButton = page.locator('button[aria-label="Show password"]');
    await toggleButton.click();

    // Now type is text
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Click again to hide
    const hideButton = page.locator('button[aria-label="Hide password"]');
    await hideButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('requires username and password before submission', async ({ page }) => {
    const usernameInput = page.locator('input#username');
    const passwordInput = page.locator('input#password');

    await expect(usernameInput).toHaveAttribute('required', '');
    await expect(passwordInput).toHaveAttribute('required', '');
  });
});
