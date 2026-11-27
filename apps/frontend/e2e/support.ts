import { expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** Shared e2e helpers: API mocks (page.route), screenshots, axe checks. */
export const SHOTS = process.env.SCREENSHOT_DIR ?? 'test-results/screens';
export const DESKTOP = { width: 1440, height: 900 };
export const MOBILE = { width: 390, height: 844 };

export const iso = '2026-11-01T00:00:00.000Z';
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
export const ADMIN = authState(
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
export const DEVELOPER = authState(['projects.create', 'users.read'], ['developer']);
const UNAUTH = { error: { code: 'UNAUTHENTICATED', message: 'Not signed in', requestId: 'r1' } };

export async function mockApi(
  page: Page,
  opts: {
    me?: object | null;
    bootstrapRequired?: boolean;
    login?: 'ok' | 'fail' | 'hang';
    projects?: MockProject[];
  } = {},
) {
  let signedIn = opts.me ?? null;
  await mockProjects(page, opts.projects ?? []);
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

export async function check(page: Page, name: string) {
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

export interface MockProject {
  id: string;
  slug: string;
  name: string;
  description: string;
  owner: { id: string; username: string; displayName: string };
  myRole: 'owner' | 'maintainer' | 'developer' | 'viewer' | null;
  updatedAt: string;
}

const ME = { id: 'u1', username: 'ian', displayName: 'Ian Thomas' };
const ALEX = { id: 'u2', username: 'alex', displayName: 'Alex Rivera' };

/** Sample data from DY-D1 §0.6 (Phase 1 fields only). */
export function sampleProjects(now = Date.now()): MockProject[] {
  const ago = (min: number) => new Date(now - min * 60_000).toISOString();
  const p = (
    id: string,
    name: string,
    description: string,
    owner: MockProject['owner'],
    min: number,
  ): MockProject => ({
    id,
    slug: name,
    name,
    description,
    owner,
    myRole: owner.id === ME.id ? 'owner' : 'developer',
    updatedAt: ago(min),
  });
  return [
    p('p1', 'portfolio-site', 'Personal portfolio', ME, 3),
    p('p2', 'status-api', 'Uptime & status endpoint', ME, 60),
    p('p3', 'homelab-dash', 'Home lab dashboard', ME, 4),
    p('p4', 'docs-hub', 'Team documentation site', ALEX, 0),
    p('p5', 'playground-sketches', 'Quick experiments', ME, 2 * 24 * 60),
    p('p6', 'ledger-cli', 'Command-line ledger', ALEX, 5 * 24 * 60),
  ];
}

const toApi = (p: MockProject) => ({
  id: p.id,
  slug: p.slug,
  name: p.name,
  description: p.description,
  ownerId: p.owner.id,
  owner: p.owner,
  projectType: 'empty',
  primaryLanguage: null,
  framework: null,
  archived: false,
  myRole: p.myRole,
  access: 'member',
  createdAt: iso,
  updatedAt: p.updatedAt,
});

/** In-memory /api/v1/projects: list (scope, q, paging), get, create, delete, members. */
export async function mockProjects(page: Page, initial: MockProject[]) {
  const projects = [...initial];
  await page.route('**/api/v1/projects**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const json = (status: number, body?: unknown) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: body === undefined ? '' : JSON.stringify(body),
      });
    const parts = url.pathname
      .replace(/^\/api\/v1\/projects\/?/, '')
      .split('/')
      .filter(Boolean);
    const notFound = () =>
      json(404, { error: { code: 'NOT_FOUND', message: 'Project not found', requestId: 'r' } });
    if (parts.length === 0 && req.method() === 'GET') {
      const scope = url.searchParams.get('scope') ?? 'all';
      const q = (url.searchParams.get('q') ?? '').toLowerCase();
      const pageNo = Number(url.searchParams.get('page') ?? 1);
      const size = Number(url.searchParams.get('pageSize') ?? 25);
      const rows = projects
        .filter((p) =>
          scope === 'mine'
            ? p.owner.id === ME.id
            : scope === 'shared'
              ? p.owner.id !== ME.id
              : true,
        )
        .filter((p) => !q || `${p.name} ${p.description}`.toLowerCase().includes(q))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      return json(200, {
        data: rows.slice((pageNo - 1) * size, pageNo * size).map(toApi),
        meta: { page: pageNo, pageSize: size, total: rows.length },
      });
    }
    if (parts.length === 0 && req.method() === 'POST') {
      const body = req.postDataJSON() as { name: string; description?: string };
      if (projects.some((p) => p.slug === body.name))
        return json(409, {
          error: { code: 'CONFLICT', message: 'Slug already in use', requestId: 'r' },
        });
      const created: MockProject = {
        id: `p${projects.length + 1}`,
        slug: body.name,
        name: body.name,
        description: body.description ?? '',
        owner: ME,
        myRole: 'owner',
        updatedAt: new Date().toISOString(),
      };
      projects.unshift(created);
      return json(201, { data: toApi(created) });
    }
    const project = projects.find((p) => p.id === parts[0]);
    if (!project) return notFound();
    if (parts.length === 1 && req.method() === 'GET') return json(200, { data: toApi(project) });
    if (parts.length === 1 && req.method() === 'DELETE') {
      projects.splice(projects.indexOf(project), 1);
      return route.fulfill({ status: 204 });
    }
    if (parts[1] === 'members')
      return json(200, {
        data: [
          {
            userId: project.owner.id,
            username: project.owner.username,
            displayName: project.owner.displayName,
            role: 'owner',
            addedAt: iso,
          },
          ...(project.owner.id === ME.id
            ? []
            : [
                {
                  userId: ME.id,
                  username: ME.username,
                  displayName: ME.displayName,
                  role: 'developer',
                  addedAt: iso,
                },
              ]),
        ],
      });
    return notFound();
  });
}
