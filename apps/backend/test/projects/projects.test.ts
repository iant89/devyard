import { Project, ProjectMember } from '@devyard/contracts';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { auditLogs, projectMembers } from '../../src/db/schema.js';
import { testApp, TRUST_LOCAL_PROXY } from '../helpers.js';
import { freshIp, login, type Authed } from '../auth/fixtures.js';
import { call, createUser, PW, setupActors, type Actors } from '../users/fixtures.js';

const P = '/api/v1/projects';

describe('projects', () => {
  let app: FastifyInstance;
  let a: Actors;
  let devB: Authed;
  let devBId: string;
  beforeEach(async () => {
    app = await testApp(TRUST_LOCAL_PROXY);
    a = await setupActors(app);
    devBId = await createUser(app, a.admin, 'devb', ['developer']);
    devB = await login(app, 'devb', PW, freshIp());
  });
  afterEach(async () => app.close());

  const create = async (as: Authed, name: string, extra: Record<string, unknown> = {}) => {
    const res = await call(app, as, 'POST', P, { name, ...extra });
    expect(res.statusCode, res.body).toBe(201);
    return Project.parse(res.json().data);
  };
  const share = (as: Authed, pid: string, userId: string, role: string) =>
    call(app, as, 'POST', `${P}/${pid}/members`, { userId, role });

  it('create: creator becomes owner member; slug derived and de-duplicated; explicit clash 409', async () => {
    const p = await create(a.developer, 'My App!');
    expect(p).toMatchObject({
      slug: 'my-app',
      myRole: 'owner',
      ownerId: a.ids.developer,
      archived: false,
    });
    expect(p.projectType).toBe('empty');
    const p2 = await create(a.developer, 'My App');
    expect(p2.slug).toBe('my-app-2');
    expect(
      (await call(app, a.developer, 'POST', P, { name: 'X', slug: 'my-app' })).statusCode,
    ).toBe(409);
    const members = app.db
      .select()
      .from(projectMembers)
      .where(eq(projectMembers.projectId, p.id))
      .all();
    expect(members).toEqual([expect.objectContaining({ userId: a.ids.developer, role: 'owner' })]);
  });

  it('create: global Viewer cannot create (403); unimplemented templates are rejected (400)', async () => {
    expect((await call(app, a.viewer, 'POST', P, { name: 'v' })).statusCode).toBe(403);
    expect(
      (await call(app, a.developer, 'POST', P, { name: 'r', template: 'react' })).statusCode,
    ).toBe(400);
  });

  it("two-user isolation: B gets 404 on A's project until shared", async () => {
    const p = await create(a.developer, 'Secret');
    for (const [m, path, body] of [
      ['GET', '', undefined],
      ['PATCH', '', { name: 'x' }],
      ['DELETE', '', undefined],
      ['GET', '/members', undefined],
      ['POST', '/members', { userId: devBId, role: 'viewer' }],
      ['POST', '/transfer', { newOwnerId: devBId }],
    ] as const) {
      const res = await call(app, devB, m, `${P}/${p.id}${path}`, body);
      expect(res.statusCode, `${m} ${path}`).toBe(404);
      expect(res.json().error.code).toBe('NOT_FOUND');
    }
    expect((await call(app, devB, 'GET', P)).json().meta.total).toBe(0);
    expect((await share(a.developer, p.id, devBId, 'viewer')).statusCode).toBe(201);
    const got = await call(app, devB, 'GET', `${P}/${p.id}`);
    expect(got.statusCode).toBe(200);
    expect(got.json().data.myRole).toBe('viewer');
    expect((await call(app, devB, 'GET', P)).json().meta.total).toBe(1);
    // unknown id looks the same as forbidden
    expect((await call(app, devB, 'GET', `${P}/nope`)).statusCode).toBe(404);
  });

  it('a viewer member cannot PATCH (403) or manage members; developer member cannot PATCH either', async () => {
    const p = await create(a.developer, 'Proj');
    await share(a.developer, p.id, devBId, 'viewer');
    expect((await call(app, devB, 'PATCH', `${P}/${p.id}`, { name: 'hijack' })).statusCode).toBe(
      403,
    );
    expect((await share(devB, p.id, a.ids.viewer, 'viewer')).statusCode).toBe(403);
    await call(app, a.developer, 'PATCH', `${P}/${p.id}/members/${devBId}`, { role: 'developer' });
    expect((await call(app, devB, 'PATCH', `${P}/${p.id}`, { name: 'hijack' })).statusCode).toBe(
      403,
    );
    await call(app, a.developer, 'PATCH', `${P}/${p.id}/members/${devBId}`, { role: 'maintainer' });
    const ok = await call(app, devB, 'PATCH', `${P}/${p.id}`, {
      name: 'Renamed',
      description: 'd',
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().data).toMatchObject({
      name: 'Renamed',
      description: 'd',
      myRole: 'maintainer',
    });
  });

  it('global Viewer is capped at project viewer on add, update, and read', async () => {
    const p = await create(a.developer, 'Cap');
    const add = await share(a.developer, p.id, a.ids.viewer, 'maintainer');
    expect(add.statusCode).toBe(201);
    expect(ProjectMember.parse(add.json().data).role).toBe('viewer');
    const upd = await call(app, a.developer, 'PATCH', `${P}/${p.id}/members/${a.ids.viewer}`, {
      role: 'developer',
    });
    expect(upd.statusCode).toBe(200);
    expect(upd.json().data.role).toBe('viewer');
    const stored = app.db
      .select()
      .from(projectMembers)
      .where(eq(projectMembers.userId, a.ids.viewer))
      .get()!;
    expect(stored.role).toBe('viewer');
    expect((await call(app, a.viewer, 'GET', `${P}/${p.id}`)).json().data.myRole).toBe('viewer');
    expect((await call(app, a.viewer, 'PATCH', `${P}/${p.id}`, { name: 'x' })).statusCode).toBe(
      403,
    );
    const audit = app.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, 'project.member_add'))
      .get()!;
    expect(audit.metadata).toMatchObject({
      requestedRole: 'maintainer',
      role: 'viewer',
      capped: true,
    });
  });

  it('members: list, duplicates, owner protections, maintainer changes need owner, leave', async () => {
    const p = await create(a.developer, 'Team');
    await share(a.developer, p.id, devBId, 'maintainer');
    expect((await share(a.developer, p.id, devBId, 'viewer')).statusCode).toBe(409);
    expect((await share(a.developer, p.id, 'ghost', 'viewer')).statusCode).toBe(404);
    // maintainer adds a developer but cannot add/promote maintainers
    const dev3 = await createUser(app, a.admin, 'dev3', ['developer']);
    expect((await share(devB, p.id, dev3, 'maintainer')).statusCode).toBe(403);
    expect((await share(devB, p.id, dev3, 'developer')).statusCode).toBe(201);
    expect(
      (await call(app, devB, 'PATCH', `${P}/${p.id}/members/${dev3}`, { role: 'maintainer' }))
        .statusCode,
    ).toBe(403);
    // owner can't be changed or removed via members API
    expect(
      (
        await call(app, devB, 'PATCH', `${P}/${p.id}/members/${a.ids.developer}`, {
          role: 'viewer',
        })
      ).statusCode,
    ).toBe(409);
    expect(
      (await call(app, a.developer, 'DELETE', `${P}/${p.id}/members/${a.ids.developer}`))
        .statusCode,
    ).toBe(409);
    const list = await call(app, devB, 'GET', `${P}/${p.id}/members`);
    const members = list.json().data.map((m: unknown) => ProjectMember.parse(m));
    expect(members.map((m: ProjectMember) => [m.username, m.role])).toEqual([
      ['dev', 'owner'],
      ['devb', 'maintainer'],
      ['dev3', 'developer'],
    ]);
    // self leave, then access is gone
    expect((await call(app, devB, 'DELETE', `${P}/${p.id}/members/${devBId}`)).statusCode).toBe(
      204,
    );
    expect((await call(app, devB, 'GET', `${P}/${p.id}`)).statusCode).toBe(404);
    // non-member target → 404
    expect(
      (await call(app, a.developer, 'DELETE', `${P}/${p.id}/members/${devBId}`)).statusCode,
    ).toBe(404);
  });

  it('transfer: owner only; previous owner becomes maintainer; viewers cannot receive', async () => {
    const p = await create(a.developer, 'Xfer');
    await share(a.developer, p.id, devBId, 'maintainer');
    expect(
      (await call(app, devB, 'POST', `${P}/${p.id}/transfer`, { newOwnerId: devBId })).statusCode,
    ).toBe(403);
    expect(
      (await call(app, a.developer, 'POST', `${P}/${p.id}/transfer`, { newOwnerId: a.ids.viewer }))
        .statusCode,
    ).toBe(400);
    const res = await call(app, a.developer, 'POST', `${P}/${p.id}/transfer`, {
      newOwnerId: devBId,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toMatchObject({ ownerId: devBId, myRole: 'maintainer' });
    const roles = Object.fromEntries(
      app.db
        .select()
        .from(projectMembers)
        .where(eq(projectMembers.projectId, p.id))
        .all()
        .map((m) => [m.userId, m.role]),
    );
    expect(roles).toEqual({ [devBId]: 'owner', [a.ids.developer]: 'maintainer' });
    expect((await call(app, devB, 'GET', `${P}?scope=mine`)).json().meta.total).toBe(1);
  });

  it('archive / unarchive and soft delete (owner only)', async () => {
    const p = await create(a.developer, 'Arch');
    await share(a.developer, p.id, devBId, 'maintainer');
    let res = await call(app, devB, 'PATCH', `${P}/${p.id}`, { archived: true });
    expect(res.json().data.archived).toBe(true);
    expect((await call(app, a.developer, 'GET', P)).json().meta.total).toBe(0);
    expect((await call(app, a.developer, 'GET', `${P}?archived=true`)).json().meta.total).toBe(1);
    expect((await call(app, a.developer, 'GET', `${P}?archived=false`)).json().meta.total).toBe(0);
    res = await call(app, devB, 'PATCH', `${P}/${p.id}`, { archived: false });
    expect(res.json().data.archived).toBe(false);
    expect((await call(app, devB, 'DELETE', `${P}/${p.id}`)).statusCode).toBe(403);
    expect((await call(app, a.developer, 'DELETE', `${P}/${p.id}`)).statusCode).toBe(204);
    expect((await call(app, a.developer, 'GET', `${P}/${p.id}`)).statusCode).toBe(404);
    expect((await call(app, a.admin, 'GET', `${P}/${p.id}`)).statusCode).toBe(404);
    // the owner can now be deleted (no live projects)
    expect(
      (await call(app, a.admin, 'DELETE', `/api/v1/users/${a.ids.developer}`)).statusCode,
    ).toBe(204);
  });

  it('list: scope all/mine/shared, q filter, sort allow-list, pagination, myRole', async () => {
    for (const n of ['Alpha', 'Bravo', 'Charlie']) await create(a.developer, n);
    const shared = await create(devB, 'Delta shared');
    await share(devB, shared.id, a.ids.developer, 'developer');
    await create(devB, 'Echo private');
    const names = async (qs: string) => {
      const res = await call(app, a.developer, 'GET', `${P}${qs}`);
      expect(res.statusCode, res.body).toBe(200);
      return res.json().data.map((p: Project) => p.name);
    };
    expect(await names('?sort=name')).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta shared']);
    expect(await names('?scope=mine&sort=name')).toEqual(['Alpha', 'Bravo', 'Charlie']);
    expect(await names('?scope=shared')).toEqual(['Delta shared']);
    expect(await names('?q=rav')).toEqual(['Bravo']);
    expect(await names('?q=%25')).toEqual([]); // LIKE wildcards are escaped
    expect(await names('?sort=-name&pageSize=2&page=2')).toEqual(['Bravo', 'Alpha']);
    const page = await call(app, a.developer, 'GET', `${P}?sort=-name&pageSize=2&page=1`);
    expect(page.json().meta).toEqual({ page: 1, pageSize: 2, total: 4 });
    const roles = (await call(app, a.developer, 'GET', `${P}?q=delta`)).json().data[0].myRole;
    expect(roles).toBe('developer');
    expect((await call(app, a.developer, 'GET', `${P}?sort=ownerId`)).statusCode).toBe(400);
    // admins see everything with scope=all; mine is still "owned by me"
    expect((await call(app, a.admin, 'GET', P)).json().meta.total).toBe(5);
    expect((await call(app, a.admin, 'GET', `${P}?scope=mine`)).json().meta.total).toBe(0);
  });

  it('sharing and project changes are audited', async () => {
    const p = await create(a.developer, 'Audited');
    await share(a.developer, p.id, devBId, 'developer');
    await call(app, a.developer, 'PATCH', `${P}/${p.id}/members/${devBId}`, { role: 'viewer' });
    await call(app, a.developer, 'DELETE', `${P}/${p.id}/members/${devBId}`);
    await call(app, a.developer, 'PATCH', `${P}/${p.id}`, { name: 'A2' });
    await call(app, a.developer, 'POST', `${P}/${p.id}/transfer`, { newOwnerId: a.ids.admin });
    const rows = app.db.select().from(auditLogs).where(eq(auditLogs.targetId, p.id)).all();
    const actions = rows.map((r) => r.action);
    for (const act of [
      'project.create',
      'project.member_add',
      'project.member_update',
      'project.member_remove',
      'project.update',
      'project.transfer',
    ])
      expect(actions).toContain(act);
    const add = rows.find((r) => r.action === 'project.member_add')!;
    expect(add).toMatchObject({ actorId: a.ids.developer, outcome: 'success' });
    expect(add.metadata).toMatchObject({ userId: devBId, role: 'developer' });
  });
});
