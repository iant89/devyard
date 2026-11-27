import { expect, test } from '@playwright/test';
import { ADMIN, check, DESKTOP, mockApi, MOBILE, sampleProjects } from './support';

/** B6a screens (DY-D1 Screens 3–6) with the API mocked; screenshots named after the mockups. */
test.describe('desktop', () => {
  test.use({ viewport: DESKTOP });

  test('03 dashboard shows real project counts', async ({ page }) => {
    await mockApi(page, { me: ADMIN, projects: sampleProjects() });
    await page.goto('/');
    await expect(page.getByText('2 shared with you')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Recent builds' })).toBeVisible();
    await check(page, '03-dashboard');
  });

  test('04 projects list: populated, filter, filtered-empty, scope', async ({ page }) => {
    await mockApi(page, { me: ADMIN, projects: sampleProjects() });
    await page.goto('/projects');
    await expect(page.getByText('6 projects')).toBeVisible();
    const table = page.getByRole('table', { name: 'Projects' });
    await expect(table.getByRole('link', { name: /portfolio-site/ })).toBeVisible();
    await expect(table.getByText('Shared')).toHaveCount(2);
    await page.mouse.move(0, 0);
    await check(page, '04-projects-desktop');

    await page.getByLabel('Filter projects').fill('docs');
    await expect(page.getByText('1 project', { exact: true })).toBeVisible();
    await page.getByLabel('Filter projects').fill('nothing-matches');
    await expect(page.getByText('No projects match these filters')).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page.getByText('6 projects')).toBeVisible();

    await page.getByRole('button', { name: 'Shared', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Shared', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page).toHaveURL(/\/projects\/shared$/);
    await expect(page.getByText('2 projects')).toBeVisible();
  });

  test('04 projects list: empty state', async ({ page }) => {
    await mockApi(page, { me: ADMIN, projects: [] });
    await page.goto('/projects');
    await expect(page.getByRole('heading', { name: 'No projects yet' })).toBeVisible();
    await expect(page.getByText('0 projects')).toBeVisible();
    await check(page, '04-projects-desktop-empty');
  });

  test('05 create project: validation, duplicate, success → 06 project page', async ({ page }) => {
    await mockApi(page, { me: ADMIN, projects: sampleProjects() });
    await page.goto('/projects');
    await page.getByRole('button', { name: 'New project' }).click();
    const dialog = page.getByRole('dialog', { name: 'Create project' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('radio', { name: /Empty project/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(dialog.getByRole('radio', { name: /React \+ TypeScript/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await dialog.getByLabel(/^Project name/).fill('portfolio-blog');
    await dialog.getByLabel('Description').fill('Personal blog built with Devyard.');
    await check(page, '05-create-project');

    await dialog.getByLabel(/^Project name/).fill('Portfolio Site!');
    await dialog.getByRole('button', { name: 'Create project' }).click();
    await expect(dialog.getByText('Fix 1 error before creating the project.')).toBeVisible();
    await expect(dialog.getByText(/Use lowercase letters, numbers and hyphens only/)).toBeVisible();
    await expect(dialog.getByLabel(/^Project name/)).toBeFocused();
    await check(page, '05-create-project-errors');

    await dialog.getByLabel(/^Project name/).fill('portfolio-site');
    await dialog.getByRole('button', { name: 'Create project' }).click();
    await expect(dialog.getByText('A project named portfolio-site already exists.')).toBeVisible();

    await dialog.getByLabel(/^Project name/).fill('portfolio-blog');
    await dialog.getByRole('button', { name: 'Create project' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(
      page
        .getByRole('region', { name: 'Notifications' })
        .getByText('Project portfolio-blog created'),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/projects\/p7$/);
    await expect(page.getByRole('heading', { name: 'portfolio-blog', level: 1 })).toBeVisible();
  });

  test('06 project page: overview with members; delete as owner', async ({ page }) => {
    await mockApi(page, { me: ADMIN, projects: sampleProjects() });
    await page.goto('/projects/p1');
    await expect(page.getByRole('heading', { name: 'portfolio-site', level: 1 })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Project members' })).toContainText('Ian Thomas');
    await expect(page.getByRole('combobox', { name: 'Project context' })).toContainText(
      'portfolio-site',
    );
    await page.mouse.move(0, 0);
    await check(page, '06-project-dashboard');

    await page.getByRole('button', { name: 'More project actions' }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Delete project' }).click();
    await expect(page).toHaveURL(/\/projects$/);
    await expect(page.getByText('5 projects')).toBeVisible();
  });

  test('06 project page: unknown project shows not found', async ({ page }) => {
    await mockApi(page, { me: ADMIN, projects: [] });
    await page.goto('/projects/nope');
    await expect(page.getByRole('heading', { name: 'Project not found' })).toBeVisible();
  });
});

test.describe('mobile', () => {
  test.use({ viewport: MOBILE, hasTouch: true, isMobile: true });

  test('04 projects list mobile: populated and empty', async ({ page }) => {
    await mockApi(page, { me: ADMIN, projects: sampleProjects() });
    await page.goto('/projects');
    await expect(page.getByRole('list', { name: 'Projects' }).getByRole('listitem')).toHaveCount(6);
    await check(page, '04-projects-mobile');
  });

  test('04 projects list mobile: empty', async ({ page }) => {
    await mockApi(page, { me: ADMIN, projects: [] });
    await page.goto('/projects');
    await expect(page.getByRole('heading', { name: 'No projects yet' })).toBeVisible();
    await check(page, '04-projects-mobile-empty');
  });
});
