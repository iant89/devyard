import { expect, test } from '@playwright/test';

/** Real backend: first-run bootstrap → sign out → sign in → sign out. Runs once on a fresh DB. */
test('bootstrap, log in and log out against the real backend', async ({ page }) => {
  const password = 'smoke-test-password-1';

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Set up Devyard' })).toBeVisible();
  await page.getByLabel('Full name').fill('Ian Thomas');
  await page.getByLabel(/^Username/).fill('ian');
  await page.getByLabel(/^Email/).fill('ian@devyard.local');
  await page.getByLabel(/^Password/).fill(password);
  await page.getByLabel(/Confirm password/).fill(password);
  await page.getByRole('button', { name: 'Create administrator' }).click();

  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
  await expect(nav.getByRole('button', { name: 'Administration' })).toBeVisible();

  const signOut = async () => {
    await page.getByRole('button', { name: /Ian Thomas/ }).click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  };
  await signOut();

  // Bootstrap is now closed: a reload must show sign-in, not setup.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

  await page.getByLabel('Username or email').fill('ian');
  await page.getByLabel(/^Password/).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();

  // Session survives a reload (cookie + GET /auth/me).
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();

  // B6a: create a project through the dialog; it opens on its page and shows in the list.
  await page.getByRole('button', { name: 'New project' }).click();
  const dialog = page.getByRole('dialog', { name: 'Create project' });
  await dialog.getByLabel(/^Project name/).fill('smoke-project');
  await dialog.getByLabel('Description').fill('Created by the smoke test');
  await dialog.getByRole('button', { name: 'Create project' }).click();
  await expect(page.getByRole('heading', { name: 'smoke-project', level: 1 })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Project members' })).toContainText('Owner');
  await page.goto('/projects');
  await expect(page.getByText('1 project', { exact: true })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Projects' })).toContainText('smoke-project');

  await signOut();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});
