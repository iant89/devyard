import { eq } from 'drizzle-orm';
import { PasswordResetIssued, PublicUser, UserActivityEntry } from '@devyard/contracts';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, afterEach, describe, expect, it } from 'vitest';
import { projects, users } from '../../src/db/schema.js';
import { newId } from '../../src/lib/ids.js';
import { testApp, TRUST_LOCAL_PROXY } from '../helpers.js';
import { freshIp, login } from '../auth/fixtures.js';
import { call, createUser, PW, setupActors, type Actors } from './fixtures.js';

type Role = 'admin' | 'developer' | 'viewer';

describe('users: permission matrix (admin/developer/viewer × endpoint)', () => {
  let app: FastifyInstance;
  let a: Actors;
  let target: string;
  beforeAll(async () => {
    app = await testApp(TRUST_LOCAL_PROXY);
    a = await setupActors(app);
    target = await createUser(app, a.admin, 'target', ['developer']);
  });
  afterAll(async () => app.close());

  const expected: Record<string, Record<Role, number>> = {
    'GET /users': { admin: 200, developer: 200, viewer: 200 },
    'POST /users': { admin: 201, developer: 403, viewer: 403 },
    'GET /users/:id': { admin: 200, developer: 200, viewer: 200 },
    'PATCH /users/:id': { admin: 200, developer: 403, viewer: 403 },
    'POST /users/:id/password-reset': { admin: 201, developer: 403, viewer: 403 },
    'GET /users/:id/activity': { admin: 200, developer: 403, viewer: 403 },
    'DELETE /users/:id': { admin: 204, developer: 403, viewer: 403 },
  };

  const run = (key: string, as: Actors[Role] | null, n: string) => {
    const [method, path] = key.split(' ') as ['GET' | 'POST' | 'PATCH' | 'DELETE', string];
    const url = `/api/v1${path.replace(':id', target)}`;
    const payload =
      key === 'POST /users'
        ? {
            username: `u${n}`,
            email: `u${n}@example.com`,
            displayName: 'U',
            password: PW,
            roles: ['viewer'],
          }
        : key === 'PATCH /users/:id'
          ? { displayName: `Target ${n}` }
          : undefined;
    return call(app, as, method, url, payload);
  };

  // Non-admins first so the admin DELETE runs last.
  for (const role of ['developer', 'viewer', 'admin'] as Role[])
    for (const key of Object.keys(expected))
      it(`${role}: ${key} → ${expected[key]![role]}`, async () => {
        const res = await run(key, a[role], `${role}${key.length}`);
        expect(res.statusCode, res.body).toBe(expected[key]![role]);
      });

  for (const key of Object.keys(expected))
    it(`anonymous: ${key} → 401`, async () => {
      expect((await run(key, null, 'anon')).statusCode).toBe(401);
    });
});

describe('users: behaviour', () => {
  let app: FastifyInstance;
  let a: Actors;
  beforeEach(async () => {
    app = await testApp(TRUST_LOCAL_PROXY);
    a = await setupActors(app);
  });
  afterEach(async () => app.close());

  it('admins see full PublicUser; non-admins get a reduced shape', async () => {
    const full = await call(app, a.admin, 'GET', '/api/v1/users');
    for (const u of full.json().data) PublicUser.parse(u);
    expect(full.json().meta).toEqual({ page: 1, pageSize: 25, total: 3 });
    for (const role of ['developer', 'viewer'] as const) {
      const res = await call(app, a[role], 'GET', '/api/v1/users');
      for (const u of res.json().data)
        expect(Object.keys(u).sort()).toEqual(['displayName', 'id', 'username']);
      const one = await call(app, a[role], 'GET', `/api/v1/users/${a.ids.admin}`);
      expect(Object.keys(one.json().data).sort()).toEqual(['displayName', 'id', 'username']);
    }
    const self = await call(app, a.viewer, 'GET', `/api/v1/users/${a.ids.viewer}`);
    expect(PublicUser.parse(self.json().data).email).toBe('view@example.com');
  });

  it('list supports q, status, role filters, sort allow-list and pagination', async () => {
    let res = await call(app, a.admin, 'GET', '/api/v1/users?q=vie');
    expect(res.json().data.map((u: PublicUser) => u.username)).toEqual(['view']);
    res = await call(app, a.admin, 'GET', '/api/v1/users?role=developer');
    expect(res.json().data.map((u: PublicUser) => u.username)).toEqual(['dev']);
    res = await call(app, a.admin, 'GET', '/api/v1/users?sort=-username&pageSize=2&page=1');
    expect(res.json().data.map((u: PublicUser) => u.username)).toEqual(['view', 'dev']);
    expect(res.json().meta).toEqual({ page: 1, pageSize: 2, total: 3 });
    res = await call(app, a.admin, 'GET', '/api/v1/users?sort=-username&pageSize=2&page=2');
    expect(res.json().data.map((u: PublicUser) => u.username)).toEqual(['admin']);
    res = await call(app, a.admin, 'GET', '/api/v1/users?sort=passwordHash');
    expect(res.statusCode).toBe(400);
    await call(app, a.admin, 'PATCH', `/api/v1/users/${a.ids.viewer}`, { status: 'disabled' });
    res = await call(app, a.admin, 'GET', '/api/v1/users?status=disabled');
    expect(res.json().data.map((u: PublicUser) => u.username)).toEqual(['view']);
  });

  it('create: duplicate username or email → 409; validation → 400', async () => {
    const base = { displayName: 'X', password: PW, roles: ['developer'] };
    let res = await call(app, a.admin, 'POST', '/api/v1/users', {
      ...base,
      username: 'dev',
      email: 'new@example.com',
    });
    expect(res.statusCode).toBe(409);
    res = await call(app, a.admin, 'POST', '/api/v1/users', {
      ...base,
      username: 'newbie',
      email: 'DEV@example.com',
    });
    expect(res.statusCode).toBe(409);
    res = await call(app, a.admin, 'POST', '/api/v1/users', { ...base, username: 'X!' });
    expect(res.statusCode).toBe(400);
  });

  it('self may change only displayName/email', async () => {
    const url = `/api/v1/users/${a.ids.developer}`;
    let res = await call(app, a.developer, 'PATCH', url, {
      displayName: 'Dev 2',
      email: 'd2@example.com',
      currentPassword: PW,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toMatchObject({
      displayName: 'Dev 2',
      email: 'd2@example.com',
    });
    res = await call(app, a.developer, 'PATCH', url, { roles: ['admin'] });
    expect(res.statusCode).toBe(403);
    res = await call(app, a.developer, 'PATCH', url, { status: 'disabled' });
    expect(res.statusCode).toBe(403);
    res = await call(app, a.viewer, 'PATCH', `/api/v1/users/${a.ids.viewer}`, { displayName: 'V' });
    expect(res.statusCode).toBe(200);
  });

  it('role change takes effect on the next request', async () => {
    await call(app, a.admin, 'PATCH', `/api/v1/users/${a.ids.viewer}`, { roles: ['admin'] });
    const res = await call(
      app,
      a.viewer,
      'POST',
      `/api/v1/users/${a.ids.developer}/password-reset`,
    );
    expect(res.statusCode).toBe(201);
  });

  it('disable revokes sessions; re-enable allows login again', async () => {
    const res = await call(app, a.admin, 'PATCH', `/api/v1/users/${a.ids.developer}`, {
      status: 'disabled',
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe('disabled');
    expect((await call(app, a.developer, 'GET', '/api/v1/auth/me')).statusCode).toBe(401);
    await expect(login(app, 'dev', PW, freshIp())).rejects.toThrow(/401/);
    await call(app, a.admin, 'PATCH', `/api/v1/users/${a.ids.developer}`, { status: 'active' });
    // the old session stays revoked
    expect((await call(app, a.developer, 'GET', '/api/v1/auth/me')).statusCode).toBe(401);
    await login(app, 'dev', PW, freshIp());
  });

  it('last-admin protection: demote, disable, delete of the last active admin → 409', async () => {
    const url = `/api/v1/users/${a.ids.admin}`;
    for (const [m, body] of [
      ['PATCH', { roles: ['developer'] }],
      ['PATCH', { status: 'disabled' }],
      ['DELETE', undefined],
    ] as const) {
      const res = await call(app, a.admin, m, url, body);
      expect(res.statusCode, `${m} ${JSON.stringify(body)}`).toBe(409);
      expect(res.json().error.code).toBe('CONFLICT');
    }
    // a second *active* admin makes it allowed
    await call(app, a.admin, 'PATCH', `/api/v1/users/${a.ids.developer}`, {
      roles: ['admin', 'developer'],
    });
    const res = await call(app, a.admin, 'PATCH', url, { roles: ['developer'] });
    expect(res.statusCode).toBe(200);
    // and now the remaining admin (dev) is the last one
    const res2 = await call(app, a.developer, 'PATCH', `/api/v1/users/${a.ids.developer}`, {
      roles: ['developer'],
    });
    expect(res2.statusCode).toBe(409);
  });

  it('a disabled admin does not count toward the last-admin check', async () => {
    const other = await createUser(app, a.admin, 'admin2', ['admin']);
    await call(app, a.admin, 'PATCH', `/api/v1/users/${other}`, { status: 'disabled' });
    const res = await call(app, a.admin, 'DELETE', `/api/v1/users/${a.ids.admin}`);
    expect(res.statusCode).toBe(409);
  });

  it('delete: soft-deletes, revokes sessions, hides the user; 409 while owning projects', async () => {
    app.db
      .insert(projects)
      .values({ id: newId(), slug: 'p1', name: 'P1', ownerId: a.ids.developer })
      .run();
    let res = await call(app, a.admin, 'DELETE', `/api/v1/users/${a.ids.developer}`);
    expect(res.statusCode).toBe(409);
    res = await call(app, a.admin, 'DELETE', `/api/v1/users/${a.ids.viewer}`);
    expect(res.statusCode).toBe(204);
    expect((await call(app, a.viewer, 'GET', '/api/v1/auth/me')).statusCode).toBe(401);
    expect((await call(app, a.admin, 'GET', `/api/v1/users/${a.ids.viewer}`)).statusCode).toBe(404);
    const list = await call(app, a.admin, 'GET', '/api/v1/users');
    expect(list.json().meta.total).toBe(2);
    expect((await call(app, a.admin, 'DELETE', `/api/v1/users/${a.ids.viewer}`)).statusCode).toBe(
      404,
    );
  });

  it('password reset issues a single-use token the user can redeem', async () => {
    const res = await call(app, a.admin, 'POST', `/api/v1/users/${a.ids.developer}/password-reset`);
    expect(res.statusCode).toBe(201);
    const { token } = PasswordResetIssued.parse(res.json().data);
    const confirm = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/password-reset/confirm',
      payload: { token, newPassword: 'fresh password 456' },
    });
    expect(confirm.statusCode).toBe(204);
    await login(app, 'dev', 'fresh password 456', freshIp());
  });

  it('unknown id → 404 for every :id endpoint', async () => {
    for (const [m, p] of [
      ['GET', ''],
      ['PATCH', ''],
      ['DELETE', ''],
      ['POST', '/password-reset'],
      ['GET', '/activity'],
    ] as const) {
      const res = await call(
        app,
        a.admin,
        m,
        `/api/v1/users/nope${p}`,
        m === 'PATCH' ? { displayName: 'x' } : undefined,
      );
      expect(res.statusCode, `${m} ${p}`).toBe(404);
    }
  });

  it('mutations are audited and activity paginates newest first', async () => {
    for (let i = 0; i < 5; i++)
      await call(app, a.admin, 'PATCH', `/api/v1/users/${a.ids.viewer}`, { displayName: `V${i}` });
    const url = `/api/v1/users/${a.ids.admin}/activity`;
    const all = await call(app, a.admin, 'GET', `${url}?pageSize=100`);
    const total = all.json().meta.total as number;
    expect(total).toBeGreaterThanOrEqual(8); // bootstrap + 2 creates + 5 updates
    const actions = all.json().data.map((e: { action: string }) => e.action);
    expect(actions[0]).toBe('user.update');
    expect(actions).toContain('user.create');
    expect(actions.at(-1)).toBe('auth.bootstrap');
    const p1 = await call(app, a.admin, 'GET', `${url}?pageSize=3&page=1`);
    const p2 = await call(app, a.admin, 'GET', `${url}?pageSize=3&page=2`);
    expect(p1.json().data).toHaveLength(3);
    expect(p1.json().meta).toEqual({ page: 1, pageSize: 3, total });
    const ids1 = p1.json().data.map((e: { id: string }) => e.id);
    const ids2 = p2.json().data.map((e: { id: string }) => e.id);
    expect(ids1.filter((id: string) => ids2.includes(id))).toEqual([]);
    expect(
      all
        .json()
        .data.slice(3, 6)
        .map((e: { id: string }) => e.id),
    ).toEqual(ids2);
  });

  it('activity includes entries where the user is the target, marked by relation', async () => {
    await call(app, a.admin, 'PATCH', `/api/v1/users/${a.ids.viewer}`, { displayName: 'Renamed' });
    await call(app, a.admin, 'POST', `/api/v1/users/${a.ids.viewer}/password-reset`);
    await call(app, a.viewer, 'PATCH', `/api/v1/users/${a.ids.viewer}`, { displayName: 'Mine' });
    const res = await call(
      app,
      a.admin,
      'GET',
      `/api/v1/users/${a.ids.viewer}/activity?pageSize=100`,
    );
    expect(res.statusCode).toBe(200);
    const rows = res.json().data.map((e: unknown) => UserActivityEntry.parse(e));
    const byAction = (action: string, relation: string) =>
      rows.filter((e: UserActivityEntry) => e.action === action && e.relation === relation);
    // done TO the viewer by the admin
    expect(byAction('user.create', 'target')).toHaveLength(1);
    expect(byAction('user.password_reset_issue', 'target')).toHaveLength(1);
    expect(byAction('user.update', 'target')).toHaveLength(1);
    // done BY the viewer (their own login and self-edit are actor entries, not duplicated as target)
    expect(byAction('auth.login', 'actor').length).toBeGreaterThanOrEqual(1);
    expect(byAction('user.update', 'actor')).toHaveLength(1);
    expect(new Set(rows.map((e: UserActivityEntry) => e.id)).size).toBe(rows.length);
    for (const e of rows)
      if (e.relation === 'target')
        expect(e).toMatchObject({ targetType: 'user', targetId: a.ids.viewer });
      else expect(e.actorId).toBe(a.ids.viewer);
    expect(res.json().meta.total).toBe(rows.length);
  });

  it('non-managers cannot enumerate emails: q ignores email, sort=email → 400', async () => {
    const res = await call(app, a.viewer, 'GET', '/api/v1/users?q=dev@example.com');
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toEqual([]);
    expect(
      (await call(app, a.viewer, 'GET', '/api/v1/users?q=example.com')).json().meta.total,
    ).toBe(0);
    for (const sort of ['email', '-email', 'lastLoginAt'])
      expect(
        (await call(app, a.viewer, 'GET', `/api/v1/users?sort=${sort}`)).statusCode,
        sort,
      ).toBe(400);
    for (const sort of ['username', '-displayName', 'createdAt'])
      expect(
        (await call(app, a.developer, 'GET', `/api/v1/users?sort=${sort}`)).statusCode,
        sort,
      ).toBe(200);
    // managers keep email search and sort
    const admin = await call(app, a.admin, 'GET', '/api/v1/users?q=dev@example.com&sort=email');
    expect(admin.json().data.map((u: PublicUser) => u.username)).toEqual(['dev']);
  });

  it('non-managers see only active users; role filter is rejected; status param is ignored', async () => {
    await call(app, a.admin, 'PATCH', `/api/v1/users/${a.ids.developer}`, { status: 'disabled' });
    const list = await call(app, a.viewer, 'GET', '/api/v1/users');
    expect(
      list
        .json()
        .data.map((u: { username: string }) => u.username)
        .sort(),
    ).toEqual(['admin', 'view']);
    const disabled = await call(app, a.viewer, 'GET', '/api/v1/users?status=disabled');
    expect(disabled.json().data.map((u: { username: string }) => u.username)).not.toContain('dev');
    const role = await call(app, a.viewer, 'GET', '/api/v1/users?role=admin');
    expect(role.statusCode).toBe(400);
    expect(role.json().error.details[0].path).toBe('role');
    expect(
      (await call(app, a.admin, 'GET', '/api/v1/users?status=disabled')).json().meta.total,
    ).toBe(1);
  });

  it('a locked account cannot change its email even with the correct password', async () => {
    app.db
      .update(users)
      .set({ lockedUntil: new Date(Date.now() + 60_000) })
      .where(eq(users.id, a.ids.viewer))
      .run();
    const res = await call(app, a.viewer, 'PATCH', `/api/v1/users/${a.ids.viewer}`, {
      email: 'locked-v@example.com',
      currentPassword: PW,
    });
    expect(res.statusCode).toBe(400);
    expect(app.db.select().from(users).where(eq(users.id, a.ids.viewer)).get()!.email).not.toBe(
      'locked-v@example.com',
    );
  });

  it('self email change is rate limited at 5/min per user (6th gets 429)', async () => {
    const codes: number[] = [];
    for (let i = 0; i < 6; i++)
      codes.push(
        (
          await call(app, a.viewer, 'PATCH', `/api/v1/users/${a.ids.viewer}`, {
            email: 'rl-v@example.com',
            currentPassword: 'wrong pw!!',
          })
        ).statusCode,
      );
    expect(codes).toEqual([400, 400, 400, 400, 400, 429]);
  });

  it('changing your own email requires currentPassword (and counts failures)', async () => {
    const url = `/api/v1/users/${a.ids.viewer}`;
    let res = await call(app, a.viewer, 'PATCH', url, { email: 'new-v@example.com' });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.details[0].path).toBe('currentPassword');
    res = await call(app, a.viewer, 'PATCH', url, {
      email: 'new-v@example.com',
      currentPassword: 'wrong pw!!',
    });
    expect(res.statusCode).toBe(400);
    expect(
      app.db.select().from(users).where(eq(users.id, a.ids.viewer)).get()!.failedLoginCount,
    ).toBe(1);
    res = await call(app, a.viewer, 'PATCH', url, {
      email: 'new-v@example.com',
      currentPassword: PW,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.email).toBe('new-v@example.com');
    // displayName alone and unchanged email need no password; admins editing others need none
    expect(
      (await call(app, a.viewer, 'PATCH', url, { displayName: 'V', email: 'new-v@example.com' }))
        .statusCode,
    ).toBe(200);
    expect((await call(app, a.admin, 'PATCH', url, { email: 'v3@example.com' })).statusCode).toBe(
      200,
    );
    expect(
      (
        await call(app, a.admin, 'PATCH', `/api/v1/users/${a.ids.admin}`, {
          email: 'boss@example.com',
        })
      ).statusCode,
    ).toBe(400);
  });

  it('admin self-delete → 409 even when other admins exist', async () => {
    await createUser(app, a.admin, 'admin2', ['admin']);
    const res = await call(app, a.admin, 'DELETE', `/api/v1/users/${a.ids.admin}`);
    expect(res.statusCode).toBe(409);
    expect(res.json().error.message).toMatch(/your own account/);
  });

  it("a deleted user's activity stays readable to users.manage", async () => {
    await call(app, a.admin, 'DELETE', `/api/v1/users/${a.ids.viewer}`);
    const res = await call(app, a.admin, 'GET', `/api/v1/users/${a.ids.viewer}/activity`);
    expect(res.statusCode).toBe(200);
    expect(res.json().data.map((e: { action: string }) => e.action)).toContain('user.delete');
    expect((await call(app, a.admin, 'GET', `/api/v1/users/${a.ids.viewer}`)).statusCode).toBe(404);
  });

  it('issuing a new reset token invalidates older unused ones', async () => {
    const issue = async () =>
      (await call(app, a.admin, 'POST', `/api/v1/users/${a.ids.developer}/password-reset`)).json()
        .data.token as string;
    const first = await issue();
    const second = await issue();
    const confirm = (token: string) =>
      app.inject({
        method: 'POST',
        url: '/api/v1/auth/password-reset/confirm',
        payload: { token, newPassword: 'reset password value' },
      });
    expect((await confirm(first)).statusCode).toBe(400);
    expect((await confirm(second)).statusCode).toBe(204);
  });

  it('role filter ignores soft-deleted users', async () => {
    const extra = await createUser(app, a.admin, 'devgone', ['developer']);
    await call(app, a.admin, 'DELETE', `/api/v1/users/${extra}`);
    const res = await call(app, a.admin, 'GET', '/api/v1/users?role=developer');
    expect(res.json().data.map((u: PublicUser) => u.username)).toEqual(['dev']);
    expect(res.json().meta.total).toBe(1);
  });
});
