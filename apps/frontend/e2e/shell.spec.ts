import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Login/bootstrap/shell flows against the built app with the API mocked (page.route).
 * Each state is screenshotted (desktop 1440×900, mobile 390×844 — DY-D1 §0.1) and axe-checked.
 * Screenshots go to $SCREENSHOT_DIR (default ./test-results/screens).
 */
const SHOTS = process.env.SCREENSHOT_DIR ?? 'test-results/screens';
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

const iso = '2026-11-01T00:00:00.000Z';
const authState = (permissions: string[], roles: string[]) => ({
  data: {
    user: {
      id: 'u1',
      username: 'ian',
      email: 'ian@devyard.local',
      displayName: 'Ian Thomas',
      status: 'active',
      roles,
      permissions,
      createdAt: iso,
      lastLoginAt: iso,
    },
    session: {
      id: 's1',
      createdAt: iso,
      lastSeenAt: iso,
      expiresAt: iso,
      userAgent: null,
      ip: null,
      current: true,
    },
    csrfToken: 'csrf-token',
  },
});
const ADMIN = authState(
  [
    'users.read',
    'users.manage',
    'projects.create',
    'projects.read_all',
    'projects.manage_all',
    'admin.access',
    'audit.read',
  ],
  ['admin'],
);
const DEVELOPER = authState(['projects.create', 'users.read'], ['developer']);
const UNAUTH = { error: { code: 'UNAUTHENTICATED', message: 'Not signed in', requestId: 'r1' } };

async function mockApi(
  page: Page,
  opts: { me?: object | null; bootstrapRequired?: boolean; login?: 'ok' | 'fail' | 'hang' } = {},
) {
  let signedIn = opts.me ?? null;
  await page.route('**/api/v1/auth/**', async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const json = (status: number, body?: unknown) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: body === undefined ? '' : JSON.stringify(body),
      });
    switch (`${method} ${url.pathname}`) {
      case 'GET /api/v1/auth/me':
        return signedIn ? json(200, signedIn) : json(401, UNAUTH);
      case 'GET /api/v1/auth/bootstrap':
        return json(200, { data: { required: opts.bootstrapRequired ?? false } });
      case 'POST /api/v1/auth/bootstrap':
        signedIn = ADMIN;
        return json(201, ADMIN);
      case 'POST /api/v1/auth/login':
        if (opts.login === 'hang') return; // never resolves → loading state
        if (opts.login === 'fail') return json(401, UNAUTH);
        signedIn = ADMIN;
        return json(200, ADMIN);
      case 'POST /api/v1/auth/logout':
        signedIn = null;
        return route.fulfill({ status: 204 });
    }
    return json(404, { error: { code: 'NOT_FOUND', message: 'x', requestId: 'r' } });
  });
}

async function check(page: Page, name: string) {
  await page.waitForTimeout(250); // let transitions settle
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
  const results = await new AxeBuilder({
    // @axe-core/playwright bundles its own playwright-core typings (1.64) — runtime-compatible.
    page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]['page'],
  }).analyze();
  const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual(
    [],
  );
}

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
    await expect(page.getByRole('heading', { name: 'My Projects', level: 1 })).toBeVisible();

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
    await check(page, '02-shell-mobile-nav-open');

    await drawer.getByRole('button', { name: 'Projects' }).click();
    await drawer.getByRole('link', { name: 'All Projects' }).click();
    await expect(drawer).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'All Projects', level: 1 })).toBeVisible();
  });
});
