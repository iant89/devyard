import { expect, test } from '@playwright/test';
import { ADMIN, check, DESKTOP, DEVELOPER, mockApi, MOBILE } from './support';

/**
 * Login/bootstrap/shell flows against the built app with the API mocked (page.route).
 * Each state is screenshotted (desktop 1440×900, mobile 390×844 — DY-D1 §0.1) and axe-checked.
 * Screenshots go to $SCREENSHOT_DIR (default ./test-results/screens).
 */
test.describe('desktop', () => {
  test.use({ viewport: DESKTOP });

  test('login: normal, error, loading', async ({ page }) => {
    await mockApi(page, { login: 'fail' });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await page.getByLabel('Username or email').blur();
    await expect(page.getByRole('checkbox')).toHaveCount(0);
    await check(page, '01-login');

    await page.getByLabel('Username or email').fill('ian');
    await page.getByLabel(/^Password/).fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Sign-in failed')).toBeVisible();
    await expect(page.getByLabel(/^Password/)).toHaveValue('');
    await check(page, '01-login-error');
  });

  test('login loading state', async ({ page }) => {
    await mockApi(page, { login: 'hang' });
    await page.goto('/');
    await page.getByLabel('Username or email').fill('ian@devyard.local');
    await page.getByLabel(/^Password/).fill('correct horse battery');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('button', { name: /Signing in/ })).toBeVisible();
    await check(page, '01-login-loading');
  });

  test('bootstrap creates the first admin and lands in the shell', async ({ page }) => {
    await mockApi(page, { bootstrapRequired: true });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Set up Devyard' })).toBeVisible();
    await check(page, '00-bootstrap');
    await page.getByLabel('Full name').fill('Ian Thomas');
    await page.getByLabel(/^Username/).fill('ian');
    await page.getByLabel('Email').fill('ian@devyard.local');
    await page.getByLabel(/^Password/).fill('correct horse battery');
    await page.getByLabel('Confirm password').fill('correct horse battery');
    await page.getByRole('button', { name: 'Create administrator' }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
  });

  test('sign in → admin shell, menus, navigation, sign out', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    await page.getByLabel('Username or email').fill('ian');
    await page.getByLabel(/^Password/).fill('correct horse battery');
    await page.getByRole('button', { name: 'Sign in' }).click();
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav.getByText('Administration')).toBeVisible();
    await page.mouse.move(0, 0);
    await check(page, '02-shell-desktop');

    await page
      .getByRole('button', { name: /Notifications/ })
      .first()
      .click();
    await check(page, '02-shell-desktop-notifications');
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: /Ian Thomas/ }).click();
    await expect(page.getByRole('menuitem', { name: 'Sign out' })).toBeVisible();
    await check(page, '02-shell-desktop-account-menu');
    await page.keyboard.press('Escape');

    await nav.getByRole('link', { name: 'My Projects' }).click();
    await expect(page).toHaveURL(/\/projects\/mine$/);
    await expect(page.getByRole('heading', { name: 'Projects', level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mine', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await page.getByRole('button', { name: /Ian Thomas/ }).click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });

  test('developer does not see Administration', async ({ page }) => {
    await mockApi(page, { me: DEVELOPER });
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav.getByRole('button', { name: 'Projects' })).toBeVisible();
    await expect(nav.getByText('Administration')).toHaveCount(0);
    await check(page, '02-shell-desktop-developer');
  });
});

test.describe('mobile', () => {
  test.use({ viewport: MOBILE, hasTouch: true, isMobile: true });

  test('login', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await page.getByLabel('Username or email').blur();
    await check(page, '01-login-mobile');
  });

  test('shell and navigation drawer', async ({ page }) => {
    await mockApi(page, { me: ADMIN });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
    await check(page, '02-shell-mobile');

    await page
      .getByRole('button', { name: /navigation/i })
      .first()
      .click();
    const drawer = page.getByRole('dialog', { name: 'Navigation' });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText('Phase 1 · v0.1.0')).toBeInViewport();
    const picker = await drawer.getByRole('combobox', { name: 'Project context' }).boundingBox();
    const header = await drawer.getByText('Navigation', { exact: true }).boundingBox();
    expect(picker!.y).toBeGreaterThan(header!.y + header!.height); // not clipped under the drawer header
    await check(page, '02-shell-mobile-nav-open');

    await drawer.getByRole('button', { name: 'Projects' }).click();
    await drawer.getByRole('link', { name: 'All Projects' }).click();
    await expect(drawer).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Projects', level: 1 })).toBeVisible();
  });
});
