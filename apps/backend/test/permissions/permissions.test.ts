import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { projectMembers, projects } from '../../src/db/schema.js';
import { newId } from '../../src/lib/ids.js';
import { ApiError } from '../../src/lib/errors.js';
import {
  can,
  effectiveProjectRole,
  requireProjectRole,
  type Principal,
} from '../../src/modules/permissions/service.js';

import { testApp } from '../helpers.js';
import { setupActors, type Actors } from '../users/fixtures.js';

const principal = (roles: string[], permissions: string[]): Principal => ({
  id: 'u',
  roles: roles as Principal['roles'],
  permissions,
});

describe('permissions: can()', () => {
  it('checks global permissions', () => {
    const dev = principal(['developer'], ['projects.create', 'users.read']);
    expect(can(dev, 'projects.create')).toBe(true);
    expect(can(dev, 'users.manage')).toBe(false);
    expect(can(null, 'users.read')).toBe(false);
  });
});

describe('permissions: requireProjectRole / effectiveProjectRole', () => {
  let app: FastifyInstance;
  let a: Actors;
  let projectId: string;
  beforeAll(async () => {
    app = await testApp();
    a = await setupActors(app);
    projectId = newId();
    app.db.insert(projects).values({ id: projectId, slug: 'p', name: 'P', ownerId: a.ids.developer }).run();
    app.db
      .insert(projectMembers)
      .values([
        { projectId, userId: a.ids.developer, role: 'owner' },
        // a stored role above viewer for a global Viewer must still be capped
        { projectId, userId: a.ids.viewer, role: 'maintainer' },
      ])
      .run();
  });
  afterAll(async () => app.close());

  const p = (who: keyof Actors['ids']) => {
    const u = { admin: a.admin, developer: a.developer, viewer: a.viewer }[who].body.data.user as unknown as Principal;
    return u;
  };

  it('member roles, viewer cap, admin bypass', () => {
    expect(effectiveProjectRole(app.db, p('developer'), projectId)).toBe('owner');
    expect(effectiveProjectRole(app.db, p('viewer'), projectId)).toBe('viewer');
    expect(effectiveProjectRole(app.db, p('admin'), projectId)).toBe('owner');
    expect(effectiveProjectRole(app.db, p('developer'), 'missing')).toBeNull();
  });

  it('non-members get NOT_FOUND, insufficient members get FORBIDDEN', () => {
    const outsider = principal(['developer'], ['projects.create']);
    expect(() => requireProjectRole(app.db, outsider, projectId, 'viewer')).toThrow(ApiError);
    try {
      requireProjectRole(app.db, outsider, projectId, 'viewer');
    } catch (e) {
      expect((e as ApiError).code).toBe('NOT_FOUND');
    }
    try {
      requireProjectRole(app.db, p('viewer'), projectId, 'developer');
      expect.unreachable();
    } catch (e) {
      expect((e as ApiError).code).toBe('FORBIDDEN');
    }
    expect(requireProjectRole(app.db, p('viewer'), projectId, 'viewer')).toBe('viewer');
    expect(requireProjectRole(app.db, p('admin'), projectId, 'owner')).toBe('owner');
  });

  it('read_all without manage_all gives viewer access only', () => {
    const auditor = principal(['viewer'], ['projects.read_all']);
    expect(effectiveProjectRole(app.db, auditor, projectId)).toBe('viewer');
  });

  it('archived/deleted projects: deleted is NOT_FOUND even for members', () => {
    const pid = newId();
    app.db
      .insert(projects)
      .values({ id: pid, slug: 'gone', name: 'G', ownerId: a.ids.developer, deletedAt: new Date() })
      .run();
    app.db.insert(projectMembers).values({ projectId: pid, userId: a.ids.developer, role: 'owner' }).run();
    expect(effectiveProjectRole(app.db, p('developer'), pid)).toBeNull();
  });
});
